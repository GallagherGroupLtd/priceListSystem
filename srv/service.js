const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const { log } = require("@sap/cds");

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

const { HEADER_TRACKED_FIELDS, LARGE_TEXT_FIELDS, LARGE_TEXT_CHANGE_MARKER } = require('./pricelist_maintain_srv-code/constants');
const LARGE_TEXT_FIELD_SET = new Set(LARGE_TEXT_FIELDS);

const saveProductPriceList = require('./pricelist_maintain_srv-code/save-product-price-list');
// const logHeaderChanges = require('./code/log-header-changes');
const versionService = require('./pricelist_maintain_srv-code/version-service');

const notificationService = require("./pricelist_notification_srv-code/notification-service");
const buildVersionHistoryComparison = require("./pricelist-display_srv-code/version-history-comparison");
const { resolvePricingParameters } = require('./lib/pricing-parameter-resolver');
const { logApplicationChanges, registerApplicationChangeLogging } = require("./application_log_srv-code/application-change-log");
const { logUserEngagement } = require("./application_log_srv-code/user-engagement-log");
const { getCurrentAccountAssignment, isInternalAdmin } = require("./lib/account-assignment-authorization");
const { getPricelistDisplayColumns } = require("./lib/pricelist-display-columns");
const { DISCOUNT_CONDITION_TYPE_WHITELIST } = require('./pricing_parameter_srv-code/constants');

const DISCOUNT_CONDITION_TYPE_WHITELIST_SET = new Set(DISCOUNT_CONDITION_TYPE_WHITELIST);

/**
 * Generic Mass Upload Handler
 * @param {Object} req - CAP request object
 * @param {String} entity - Projection entity name
 * @param {Array} requiredHeaders - List of required headers
 * @param {Function} mapRow - Function to map Excel row → entity fields
 **/
async function handleMassUpload(req, entity, requiredHeaders, mapRow, auditConfig = null) {
    try {
        const { file } = req.data;
        if (!file) return req.error(400, "No file provided");

        // Decode Base64 → Buffer → Workbook
        const buffer = Buffer.from(file, "base64");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // Validate headers
        // const firstRowKeys = Object.keys(rows[0] || {}).map(k => k.replace(/\s+/g, "").trim());
        const firstRowKeys = Object.keys(rows[0] || {}).map(k => k.trim());     //<-- Relaxed header matching to allow spaces
        for (const header of requiredHeaders) {
            if (!firstRowKeys.includes(header)) {
                return req.error(400, 'Missing required column: ${header}. Expected: ${requiredHeaders.join(", ")}');
            }
        }

        // Enrich rows
        const enrichedRows = rows.map(r => ({
            ID: cds.utils.uuid(),
            ...mapRow(r),
            createdAt: new Date(),
            createdBy: req.user.id || "system"
        }));

        // Insert into DB
        const tx = cds.transaction(req);
        await tx.run(INSERT.into(entity).entries(enrichedRows));

        // -------------------------------------------------------------------------
        // Application Change Log - Mass Upload
        // -------------------------------------------------------------------------
        if (auditConfig) {
            let auditCount = 0;

            for (const uploadedRow of enrichedRows) {
                const trackedFields = Object.keys(uploadedRow).filter(field => !["ID","createdAt","createdBy","modifiedAt","modifiedBy"].includes(field));

                const objectDescription = typeof auditConfig.getObjectDescription === "function" ? auditConfig.getObjectDescription(uploadedRow) : uploadedRow.ID;

                auditCount += await logApplicationChanges({
                    req,
                    oldData: null,
                    newData: uploadedRow,
                    changeType: "CREATE",
                    application: auditConfig.application,
                    functionalArea: auditConfig.functionalArea,
                    objectType: auditConfig.objectType,
                    objectId: uploadedRow.ID,
                    objectDescription,
                    trackedFields,
                    fieldLabels: {}
                });
            }

            console.log(`[ApplicationChangeLog][MassUpload][${auditConfig.functionalArea}] ${auditCount} audit record(s) created`);
        }

        return { message: "Upload successful", count: rows.length };
    } catch (err) {
        console.error("Upload failed:", err);
        return req.error(500, "Upload failed: " + err.message);
    }
}

/**
 * For Tree Table Build app
**/
const H_FIELDS = ["MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5"];

function normalize(d) {
    for (const f of H_FIELDS) {
        if (f in d && typeof d[f] === "string") {
            const v = d[f].trim();
            d[f] = v === "" ? null : v;
        }
    }
    if (d.parent_ID === "") d.parent_ID = null;
}

function computeLevel(d) {
    if (d.Subcategory5) return 6;
    if (d.Subcategory4) return 5;
    if (d.Subcategory3) return 4;
    if (d.Subcategory2) return 3;
    if (d.Subcategory1) return 2;
    if (d.MainCategory) return 1;
    return 0;
}

function validateNoGaps(d) {
    let seenNull = false;
    for (const f of H_FIELDS) {
        const hasVal = d[f] !== null && d[f] !== undefined && String(d[f]).trim() !== "";
        if (!hasVal) seenNull = true;
        else if (seenNull) {
            throw cds.error(`Invalid hierarchy: ${f} filled but previous level is empty`, { code: "HIER_GAP" });
        }
    }
}

async function resolveParentId(tx, d) {
    const level = computeLevel(d);
    if (level <= 1) return null; // root

    // Parent criteria: same pricelist, same path up to previous level
    const where = { pricelist_ID: d.pricelist_ID, MainCategory: d.MainCategory };

    if (level >= 3) where.Subcategory1 = d.Subcategory1;
    if (level >= 4) where.Subcategory2 = d.Subcategory2;
    if (level >= 5) where.Subcategory3 = d.Subcategory3;
    if (level >= 6) where.Subcategory4 = d.Subcategory4;

    // Parent must not have deeper values beyond its level
    if (level === 2) { where.Subcategory2 = null; where.Subcategory3 = null; where.Subcategory4 = null; where.Subcategory5 = null; }
    if (level === 3) { where.Subcategory3 = null; where.Subcategory4 = null; where.Subcategory5 = null; }
    if (level === 4) { where.Subcategory4 = null; where.Subcategory5 = null; }
    if (level === 5) { where.Subcategory5 = null; }

    const parent = await tx.run(
        SELECT.one.from(PricelistItemData).columns("ID").where(where)
    );

    return parent?.ID || null;
}

/**
   * Build a wildcard-aware predicate for one field:
   *   (field = value OR field = '*')
   * If value is empty -> (field = '*')
**/
function wildcardXpr(field, value) {
    const sValue = (value === null || value === undefined) ? "" : String(value).trim();
    if (!sValue) {
        return [{ ref: [field] }, "=", { val: "*" }];
    }
    return [
        { ref: [field] }, "=", { val: sValue },
        "or",
        { ref: [field] }, "=", { val: "*" }
    ];
}

function andAllXpr(xprs) {
    // xprs: array of xpr arrays
    const out = [];
    xprs.forEach((x, idx) => {
        if (idx > 0) out.push("and");
        out.push("(", ...x, ")");
    });
    return out;
}

const PRICELIST_TERMS_APPLICABILITY_FIELDS = [
    "PricelistType",
    "MarketScopeRegion",
    "MarketScopeCountry",
    "SalesOrg",
    "DistChannel",
    "CustPriceList",
    "CustGroup1",
    "ErpCustomer",
    "DeliveringPlant"
];

const normalizePricelistTermsValue = value => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
};

const isGenericPricelistTermsRecord = record => {
    return PRICELIST_TERMS_APPLICABILITY_FIELDS.every(field => {
        return normalizePricelistTermsValue(record[field]) === "";
    });
};

const isApplicableSpecificPricelistTermsRecord = (record, header) => {
    if (isGenericPricelistTermsRecord(record)) {
        return false;
    }

    return PRICELIST_TERMS_APPLICABILITY_FIELDS.every(field => {
        const maintainedValue = normalizePricelistTermsValue(record[field]);
        const headerValue = normalizePricelistTermsValue(header[field]);

        if (maintainedValue === "*") {
            return true;
        }

        return maintainedValue !== "" && maintainedValue === headerValue;
    });
};

const getPricelistTermsSpecificity = (record, header) => {
    return PRICELIST_TERMS_APPLICABILITY_FIELDS.reduce(
        (score, field) => {
            const maintainedValue = normalizePricelistTermsValue(record[field]);
            const headerValue = normalizePricelistTermsValue(header[field]);

            const isExactMatch = maintainedValue !== "" && maintainedValue !== "*" && maintainedValue === headerValue;

            return score + (isExactMatch ? 1 : 0);
        },
        0
    );
};

const sortPricelistTermsCandidates = (records, header) => {
    return [...records].sort((left, right) => {
        const specificityDifference = getPricelistTermsSpecificity(right, header) - getPricelistTermsSpecificity(left, header);

        if (specificityDifference !== 0) {
            return specificityDifference;
        }

        const rightModifiedAt = right.modifiedAt ? new Date(right.modifiedAt).getTime() : 0;
        const leftModifiedAt = left.modifiedAt ? new Date(left.modifiedAt).getTime() : 0;

        if (rightModifiedAt !== leftModifiedAt) {
            return rightModifiedAt - leftModifiedAt;
        }

        return String(left.ID || "").localeCompare(String(right.ID || ""));
    });
};

const resolvePricelistTermsAndConditions = (records, header) => {
    const specificMatches = sortPricelistTermsCandidates(
        records.filter(record =>
            isApplicableSpecificPricelistTermsRecord(record, header)
        ),
        header
    );

    if (specificMatches.length > 0) {
        return specificMatches[0];
    }

    const genericMatches = [...records]
        .filter(isGenericPricelistTermsRecord)
        .sort((left, right) => {
            const rightModifiedAt = right.modifiedAt ? new Date(right.modifiedAt).getTime() : 0;
            const leftModifiedAt = left.modifiedAt ? new Date(left.modifiedAt).getTime() : 0;

            if (rightModifiedAt !== leftModifiedAt) {
                return rightModifiedAt - leftModifiedAt;
            }

            return String(left.ID || "").localeCompare(String(right.ID || ""));
        });

    return genericMatches[0] || null;
};

function specificityScore(term, header) {
    const fields = [
        "PricelistType",
        "MarketScopeRegion",
        "MarketScopeCountry",
        "SalesOrg",
        "DistChannel",
        "CustPriceList",
        "CustGroup1",
        "ErpCustomer",
        "DeliveringPlant"
    ];

    let score = 0;
    for (const f of fields) {
        const tv = (term[f] === null || term[f] === undefined) ? "" : String(term[f]).trim();
        const hv = (header[f] === null || header[f] === undefined) ? "" : String(header[f]).trim();

        if (tv === "*") score += 0;
        else if (tv === hv) score += 10;
        else score -= 1000; // mismatch; should be filtered out already, but keep safe
    }
    return score;
}

function levelRank(level) {
    if (level === "Header") return 0;
    if (level === "Detail") return 1;
    return 2;
}

function resolveSpecificOverWildcard(candidates, header) {
    // Score
    candidates.forEach(t => { t.__score = specificityScore(t, header); });

    // Override: keep most specific per (Level + FieldName)
    const best = new Map();
    for (const t of candidates) {
        const key = `${t.PricelistDataLevel || ""}|${t.PricelistFieldName || ""}`;
        const prev = best.get(key);
        if (!prev || t.__score > prev.__score) best.set(key, t);
    }

    const resolved = Array.from(best.values());

    // Sort: Header first, then Detail, then score desc, then FieldName
    resolved.sort((a, b) => {
        const lr = levelRank(a.PricelistDataLevel) - levelRank(b.PricelistDataLevel);
        if (lr !== 0) return lr;

        if ((b.__score || 0) !== (a.__score || 0)) return (b.__score || 0) - (a.__score || 0);

        return String(a.PricelistFieldName || "").localeCompare(String(b.PricelistFieldName || ""));
    });

    return resolved;
}

// Utility: build condition for a single field
function buildCondition(fieldName, value) {
    if (value && value.trim() !== '') {
        return `${fieldName} = '${value}'`;
    }

    // skip condition if blank/null
    return null;
}

// Utility: build WHERE clause dynamically
function buildWhereClause(fieldMap) {
    const conditions = [];
    for (const [field, value] of Object.entries(fieldMap)) {
        const cond = buildCondition(field, value);
        if (cond) conditions.push(cond);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : null;
}

//PDF Build Logic
function buildPdfBuffer({ headerCriteria, headerTerms, detailTerms }) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const chunks = [];

        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Title
        doc.font("Helvetica-Bold").fontSize(16).text("Terms and Conditions");
        doc.moveDown(0.5);

        // Criteria block
        doc.font("Helvetica").fontSize(9).fillColor("#444");
        doc.text(
            `PricelistType: ${headerCriteria.PricelistType || ""} | Region: ${headerCriteria.MarketScopeRegion || ""} | Country: ${headerCriteria.MarketScopeCountry || ""}`
        );
        doc.text(
            `SalesOrg: ${headerCriteria.SalesOrg || ""} | DistChannel: ${headerCriteria.DistChannel || ""} | CustPriceList: ${headerCriteria.CustPriceList || ""}`
        );
        doc.text(
            `CustGroup1: ${headerCriteria.CustGroup1 || ""} | ErpCustomer: ${headerCriteria.ErpCustomer || ""} | Plant: ${headerCriteria.DeliveringPlant || ""}`
        );
        doc.fillColor("#000");
        doc.moveDown();

        // Header terms
        for (const t of headerTerms) {
            doc.font("Helvetica-Bold").fontSize(13).text(t.PricelistFieldName || "");
            doc.moveDown(0.25);
            doc.font("Helvetica").fontSize(11).text(t.TermsAndConditionContent || "");
            doc.moveDown();
        }

        // Detail terms as table
        if (detailTerms.length > 0) {
            doc.addPage();
            doc.font("Helvetica-Bold").fontSize(14).text("Item Details with Terms");
            doc.moveDown();

            // Table header
            const headers = [
                "Material",
                "Main Category",
                "Subcat1",
                "Subcat2",
                "Subcat3",
                "Subcat4",
                "Subcat5",
                "Price",
                "Unit",
                "PartNumber T&C",
                "MainCategory T&C",
                "Subcat1 T&C",
                "Subcat2 T&C",
                "Subcat3 T&C",
                "Subcat4 T&C",
                "Subcat5 T&C"
            ];

            doc.font("Helvetica-Bold").fontSize(9);
            doc.text(headers.join(" | "), { width: 500 });
            doc.moveDown(0.5);

            // Table rows
            doc.font("Helvetica").fontSize(8);
            for (const item of detailTerms) {
                const row = [
                    item.PricelistPartNumber || "",
                    item.MainCategory || "",
                    item.Subcategory1 || "",
                    item.Subcategory2 || "",
                    item.Subcategory3 || "",
                    item.Subcategory4 || "",
                    item.Subcategory5 || "",
                    item.Price || "",
                    item.PriceUnit || "",
                    item.PartNumberTermsandCond || "",
                    item.MainCategoryTermsandCond || "",
                    item.SubCategory1TermsandCond || "",
                    item.SubCategory2TermsandCond || "",
                    item.SubCategory3TermsandCond || "",
                    item.SubCategory4TermsandCond || "",
                    item.SubCategory5TermsandCond || ""
                ];
                doc.text(row.join(" | "), { width: 500 });
                doc.moveDown(0.25);
            }
        }

        doc.end();
    });
}

function getPricingParameterTypeFilter(req) {
    const where = req?.query?.SELECT?.where;

    if (!Array.isArray(where)) {
        return null;
    }

    for (let index = 0; index < where.length - 2; index += 1) {
        const fieldToken = where[index];
        const operatorToken = where[index + 1];
        const valueToken = where[index + 2];

        if (
            fieldToken?.ref?.[0] === 'ParameterType' &&
            operatorToken === '=' &&
            valueToken?.val !== undefined &&
            valueToken?.val !== null
        ) {
            const value = String(valueToken.val).trim();

            return value === 'P' || value === 'D'
                ? value
                : null;
        }
    }

    return null;
}

module.exports = cds.service.impl(async function () {
    // Match the names exactly as they appear in your CSN definitions
    const { User, TradeScenarios, ItemStructure, PriceProductMaintenance, PriceProductPOAFOC, TermsAndConditions, TermsAndConditionPartNumbers, PricingParameters, 
        PricingParameterEntries, TileContent, ContactInfo, AccountAssignment, AccountAssignmentScope, PricingCondType, PricelistData, PricelistItemData, ExternalMaterials, 
        ExternalCustomers, ExternalPricelist, ResolvedPricelistItem, MyRequest, PriceListTreeLayout, ProductPriceList, PricelistNotificationEvent, 
        PricelistNotificationDelivery } = this.entities;

    // -----------------------------------------------------------------------------
    // Application Log - Authorization
    // -----------------------------------------------------------------------------

    async function ensureApplicationLogInternalAdmin(req) {
        const userContext = await getCurrentAccountAssignment(req);

        if (!userContext?.assignment || !isInternalAdmin(userContext.assignment)) {
            return req.reject(403, "You are not authorized to access Application Log.");
        }

        return userContext;
    }

    this.before("READ","ApplicationLog",ensureApplicationLogInternalAdmin);

    this.before("READ","ApplicationChangeLog",ensureApplicationLogInternalAdmin);

    this.before("READ","PricelistNotificationEvent",ensureApplicationLogInternalAdmin);

    //Selection of Materials
    async function resolveItems(filters, db, extdb) {
        const filterNew = Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => {
                if (v === undefined || v === null)
                    return false;
                if (typeof v === "string" && v.trim() === "")
                    return false;
                return true;
            })
        );

        console.log(">>>Filters", filterNew);

        // Get category/subcategory structures
        const structures = await db.run(SELECT.from(ItemStructure).where(filterNew));
        console.log(">>>ItemStructure", structures)

        //Get Materials
        let materials = [];
        for (const struct of structures) {
            const fieldMap = {
                'SALES_ORGANIZATION': filterNew.SalesOrg || struct.SalesOrg,
                'DISTRIBUTION_CHANNEL': filterNew.DistChannel || struct.DistChannel,
                'PLANT': filterNew.DeliveringPlant || struct.DeliveringPlant,
                'MAIN_CATEGORY': struct.MainCategory,
                'SUBCATEGORY_1': struct.Subcategory1,
                'SUBCATEGORY_2': struct.Subcategory2,
                'SUBCATEGORY_3': struct.Subcategory3,
                'SUBCATEGORY_4': struct.Subcategory4,
                'SUBCATEGORY_5': struct.Subcategory5
            };
            const materialWhere = buildWhereClause(fieldMap);

            let materialStatement = `SELECT * FROM "SAPECC"."T_MATERIAL_MASTER_DATA"`;
            if (materialWhere && materialWhere.trim() !== "") {
                materialStatement += ` WHERE ${materialWhere}`;
            }

            const temp_mats = await extdb.run(materialStatement);
            materials = materials.concat(temp_mats);
        }
        console.log(">>>Materials", materials)

        // // Pricing Parameters
        // const pricingFieldMap = Object.fromEntries(
        //     Object.entries(filters).filter(([_, v]) => v !== undefined && String(v).trim() !== "")
        // );
        // const pricingWhere = buildWhereClause(pricingFieldMap);

        // const pricingParams = await db.run(
        //     SELECT.from(PricingParameters).where(pricingWhere).orderBy('ErpSequence')
        // );

        const materialIds = [
            ...new Set(
                materials
                    .map(material => material.MATERIAL)
                    .filter(Boolean)
            )
        ];

        const priceRows = await resolvePricingParameters({
            db,
            extdb,
            context: {
                PricelistType: filters.PricelistType,
                MarketScopeRegion: filters.MarketScopeRegion,
                MarketScopeCountry: filters.MarketScopeCountry,
                SalesOrg: filters.SalesOrg,
                DistChannel: filters.DistChannel,
                CustPriceList: filters.CustPriceList,
                CustGroup1: filters.CustGroup1,
                ErpCustomer: filters.ErpCustomer,
                DeliveringPlant: filters.DeliveringPlant
            },
            materialIds,
            parameterType: 'P',
            effectiveDate: filters.EffectiveDate || null
        });

        const priceByMaterial = new Map(
            priceRows.map(row => [String(row.Material || '').trim(), row])
        );

        //Build final list
        const resolvedItems = [];

        for (const mat of materials) {
            const resolvedPrice = priceByMaterial.get(String(mat.MATERIAL || '').trim());

            const price = resolvedPrice?.Rate || null;
            const currency = resolvedPrice?.RateUnit || null;
            const pricevalidfr = resolvedPrice?.ValidFrom || null;
            const pricevalidto = resolvedPrice?.ValidTo || null;

            const discount = null;
            const discounteffdate = null;

            async function fetchTerms(filters) {
                const results = await db.run(SELECT.from(TermsAndConditions).where(filters));
                if (!results || results.length === 0) return null;
                return results.map(r => r.TermsAndConditionContent).join("\n");
            }

            const mainCatTerms = await fetchTerms({ ...filters, MainCategory: mat.MAIN_CATEGORY });
            const subCat1Terms = await fetchTerms({ ...filters, MainCategory: mat.MAIN_CATEGORY, Subcategory1: mat.SUBCATEGORY_1 });
            const subCat2Terms = await fetchTerms({ ...filters, MainCategory: mat.MAIN_CATEGORY, Subcategory1: mat.SUBCATEGORY_1, Subcategory2: mat.SUBCATEGORY_2 });
            const subCat3Terms = await fetchTerms({ ...filters, MainCategory: mat.MAIN_CATEGORY, Subcategory1: mat.SUBCATEGORY_1, Subcategory2: mat.SUBCATEGORY_2, Subcategory3: mat.SUBCATEGORY_3 });
            const subCat4Terms = await fetchTerms({ ...filters, MainCategory: mat.MAIN_CATEGORY, Subcategory1: mat.SUBCATEGORY_1, Subcategory2: mat.SUBCATEGORY_2, Subcategory3: mat.SUBCATEGORY_3, Subcategory4: mat.SUBCATEGORY_4 });
            const subCat5Terms = await fetchTerms({ ...filters, MainCategory: mat.MAIN_CATEGORY, Subcategory1: mat.SUBCATEGORY_1, Subcategory2: mat.SUBCATEGORY_2, Subcategory3: mat.SUBCATEGORY_3, Subcategory4: mat.SUBCATEGORY_4, Subcategory5: mat.SUBCATEGORY_5 });

            function safe(val) {
                if (val === undefined || val === null) return "";
                return String(val).trim();
            }

            resolvedItems.push({
                PricelistPartNumber: safe(mat.MATERIAL),
                PartNumberDescr: safe(mat.MATERIAL_DESCRIPTION),
                MainCategory: safe(mat.MAIN_CATEGORY),
                Subcategory1: safe(mat.SUBCATEGORY_1),
                Subcategory2: safe(mat.SUBCATEGORY_2),
                Subcategory3: safe(mat.SUBCATEGORY_3),
                Subcategory4: safe(mat.SUBCATEGORY_4),
                Subcategory5: safe(mat.SUBCATEGORY_5),
                Price: safe(price),
                PriceUnit: safe(currency),
                PriceValidFrom: safe(pricevalidfr),
                PriceValidTo: safe(pricevalidto),
                // DiscountRate: safe(discount),
                // DiscountEffectiveDate: safe(discounteffdate),
                MaterialStatus: safe(mat.MATERIAL_STATUS),
                MaterialStatusEffecDate: safe(mat.STATUS_EFF_DATE),
                MainCategoryTermsandCond: safe(mainCatTerms),
                SubCategory1TermsandCond: safe(subCat1Terms),
                SubCategory2TermsandCond: safe(subCat2Terms),
                SubCategory3TermsandCond: safe(subCat3Terms),
                SubCategory4TermsandCond: safe(subCat4Terms),
                SubCategory5TermsandCond: safe(subCat5Terms)
            });
        }

        return resolvedItems;
    };

    async function resolvePricelistItem(filters, partNumber, db, extdb) {
        const resolvedItems = await resolveItems(filters, db, extdb);
        console.log(">>>", resolvedItems);
        return resolvedItems.find(item => item.PricelistPartNumber === partNumber) || null;
    };

    // Handler for User Entity
    this.on('READ', User, async (req) => {
        try {
            return [{
                email: req.user?.id || req.user?.email || 'user@example.com',
                AppURL_DMTradeScenario: process.env.AppURL_DMTradeScenario || "",
                AppURL_DMItemStructure: process.env.AppURL_DMItemStructure || "",
                AppURL_DMPartNumbers: process.env.AppURL_DMPartNumbers || "",
                AppURL_DMTermsandCond: process.env.AppURL_DMTermsandCond || "",
                AppURL_DMPricingParam: process.env.AppURL_DMPricingParam || "",
                AppURL_DMTileContent: process.env.AppURL_DMTileContent || "",
                AppURL_DMContactInfo: process.env.AppURL_DMContactInfo || "",
                AppURL_DMAcctAssign: process.env.AppURL_DMAcctAssign || "",
                AppURL_DataMaintain: process.env.AppURL_DataMaintain || "",
                AppURL_PriceMaintain: process.env.AppURL_PriceMaintain || "",
                AppURL_PriceDisplay: process.env.AppURL_PriceDisplay || "",
                AppURL_MyRequest: process.env.AppURL_MyRequest || ""
            }];
        } catch (err) {
            console.error("User READ error:", err);
            req.error(500, "Failed to load user profile");
        }
    });

    // -----------------------------------------------------------------------------
    // Application Log - User Engagement
    // -----------------------------------------------------------------------------
    this.on("logUserEngagement", async req => {
        try {
            const {
                eventType,
                accessedTile,
                accessedPricelist
            } = req.data;

            return await logUserEngagement({
                req,
                eventType,
                accessedTile,
                accessedPricelist
            });
        } catch (error) {
            console.error("[ApplicationLog] Failed to log user engagement:",error);
            return false;
        }
    });

    // -----------------------------------------------------------------------------
    // Application Change Log - Display Formatting
    // -----------------------------------------------------------------------------
    this.before("READ", "ApplicationChangeLog", req => {
        const oSelect = req.query?.SELECT;
        const aColumns = oSelect?.columns;

        if (!Array.isArray(aColumns)) {
            return;
        }

        const hasColumn = sName => aColumns.some(oColumn => Array.isArray(oColumn?.ref) && oColumn.ref.length === 1 && oColumn.ref[0] === sName);

        if (!hasColumn("oldValue")) {
            aColumns.push({ref: ["oldValue"]});
        }

        if (!hasColumn("newValue")) {
            aColumns.push({ref: ["newValue"]});
        }
    });

    this.after("READ", "ApplicationChangeLog", rows => {
        const records = Array.isArray(rows) ? rows : [rows];

        const formatAuditValue = value => {
            if (value === null || value === undefined) {
                return "";
            }

            const text = String(value);

            try {
                const parsed = JSON.parse(text);

                if (parsed !== null && typeof parsed === "object") {
                    return JSON.stringify(parsed, null, 2);
                }
            } catch (error) {
                // Plain text value. Return unchanged.
            }

            return text;
        };

        for (const record of records) {
            if (!record) {
                continue;
            }

            record.oldValueDisplay = formatAuditValue(record.oldValue);
            record.newValueDisplay = formatAuditValue(record.newValue);
        }
    });

    // -----------------------------------------------------------------------------
    // Application Change Log - Data Maintenance
    // -----------------------------------------------------------------------------

    registerApplicationChangeLogging(this, {
        auditKey: "ContactInfo",
        entity: ContactInfo,
        dbEntity: "com.sap.pricelistsystem.ContactInformation",
        application: "Data Maintenance",
        functionalArea: "Contact Information",
        objectType: "ContactInformation",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "InternalAccount",
            "ExternalAccount",
            "ContactEmail",
            "ContactNumber"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Region",
            MarketScopeCountry: "Country",
            InternalAccount: "Internal Account",
            ExternalAccount: "External Account",
            ContactEmail: "Contact E-Mail",
            ContactNumber: "Contact Number"
        },
        getObjectDescription: record => record.ContactEmail || [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / "),
        children: []
    });

    registerApplicationChangeLogging(this, {
        auditKey: "PricingParameters",
        entity: PricingParameters,
        dbEntity: "com.sap.pricelistsystem.PricingParameterDetermination",
        application: "Data Maintenance",
        functionalArea: "Pricing Parameters",
        objectType: "PricingParameterDetermination",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "SalesOrg",
            "DistChannel",
            "CustPriceList",
            "CustGroup1",
            "ErpCustomer",
            "DeliveringPlant"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Region",
            MarketScopeCountry: "Country",
            SalesOrg: "Sales Organization",
            DistChannel: "Distribution Channel",
            CustPriceList: "Customer Pricelist",
            CustGroup1: "Customer Group 1",
            ErpCustomer: "ERP Customer Code",
            DeliveringPlant: "Plant"
        },
        getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry,record.SalesOrg,record.DistChannel].filter(Boolean).join(" / "),
        children: [
            {
                name: "entries",
                entity: PricingParameterEntries,
                dbEntity: "com.sap.pricelistsystem.PricingParameterDeterminationEntry",
                parentField: "parent_ID",
                objectType: "PricingParameterDeterminationEntry",
                trackedFields: [
                    "ParameterType",
                    "ConditionType",
                    "AccessSequence",
                    "Priority"
                ],
                fieldLabels: {
                    ParameterType: "Parameter Type",
                    ConditionType: "Condition Type",
                    AccessSequence: "Access Sequence",
                    Priority: "Priority"
                },
                getObjectDescription: record => [record.ParameterType,record.ConditionType,record.AccessSequence].filter(value => value !== undefined && value !== null && value !== "").join(" / ")
            }
        ]
    });

    registerApplicationChangeLogging(this, {
        auditKey: "TradeScenarios",
        entity: TradeScenarios,
        dbEntity: "com.sap.pricelistsystem.TradeAndMarketScenarioDetermination",
        application: "Data Maintenance",
        functionalArea: "Trade & Market Scenario",
        objectType: "TradeAndMarketScenarioDetermination",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "EmailSubject",
            "EmailBody"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Market Scope Region",
            MarketScopeCountry: "Market Scope Country",
            EmailSubject: "Email Subject",
            EmailBody: "Email Body"
        },
        getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / "),
        children: []
    });

    registerApplicationChangeLogging(this, {
        auditKey: "ItemStructure",
        entity: ItemStructure,
        dbEntity: "com.sap.pricelistsystem.PricelistItemStructureComponents",
        application: "Data Maintenance",
        functionalArea: "Item Structure",
        objectType: "PricelistItemStructureComponents",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "Sequence",
            "SalesOrg",
            "DistChannel",
            "CustPriceList",
            "CustGroup1",
            "ErpCustomer",
            "DeliveringPlant",
            "MainCategory",
            "SubCategory1",
            "SubCategory2",
            "SubCategory3",
            "SubCategory4",
            "SubCategory5",
            "MainCategoryLocal",
            "SubCategory1Local",
            "SubCategory2Local",
            "SubCategory3Local",
            "SubCategory4Local",
            "SubCategory5Local"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Region",
            MarketScopeCountry: "Country",
            Sequence: "Sequence",
            SalesOrg: "Sales Organization",
            DistChannel: "Distribution Channel",
            CustPriceList: "Customer Pricelist",
            CustGroup1: "Customer Group 1",
            ErpCustomer: "ERP Customer",
            DeliveringPlant: "Plant",
            MainCategory: "Main Category",
            SubCategory1: "Subcategory 1",
            SubCategory2: "Subcategory 2",
            SubCategory3: "Subcategory 3",
            SubCategory4: "Subcategory 4",
            SubCategory5: "Subcategory 5",
            MainCategoryLocal: "Main Category Local Description",
            SubCategory1Local: "Subcategory 1 Local Description",
            SubCategory2Local: "Subcategory 2 Local Description",
            SubCategory3Local: "Subcategory 3 Local Description",
            SubCategory4Local: "Subcategory 4 Local Description",
            SubCategory5Local: "Subcategory 5 Local Description"
        },
        getObjectDescription: record => [record.MainCategory,record.SubCategory1,record.SubCategory2,record.SubCategory3,record.SubCategory4,record.SubCategory5].filter(Boolean).join(" / ") || [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / "),
        children: []
    });

    registerApplicationChangeLogging(this, {
        auditKey: "PriceProductMaintenance",
        entity: PriceProductMaintenance,
        dbEntity: "com.sap.pricelistsystem.PricelistPartNumberDetermination",
        application: "Data Maintenance",
        functionalArea: "Part Number",
        objectType: "PricelistPartNumberDetermination",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "SalesOrg",
            "DistChannel",
            "ProductID",
            "ErpStatus",
            "MaterialClassification1",
            "MaterialClassification2",
            "ProductDescription1",
            "ProductDescription2",
            "ProductStatus",
            "StatusValidity",
            "ThirdPartySupplier",
            "ThirdPartySupplierSKU",
            "StatusExpiry"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Region",
            MarketScopeCountry: "Country",
            SalesOrg: "Sales Organization",
            DistChannel: "Distribution Channel",
            ProductID: "Product ID",
            ErpStatus: "ERP Status",
            MaterialClassification1: "Material Classification",
            MaterialClassification2: "Pricelist Material Classification",
            ProductDescription1: "Product Description",
            ProductDescription2: "Pricelist Product Description",
            ProductStatus: "Product Status",
            StatusValidity: "Status Validity",
            ThirdPartySupplier: "3rd Party Supplier",
            ThirdPartySupplierSKU: "3rd Party Supplier SKU",
            StatusExpiry: "Status Expiry"
        },
        getObjectDescription: record => [record.ProductID,record.ProductDescription2 || record.ProductDescription1].filter(Boolean).join(" - "),
        children: [
            {
                name: "poaFocValues",
                entity: PriceProductPOAFOC,
                dbEntity: "com.sap.pricelistsystem.PricelistPartNumberPOAFOC",
                parentField: "parent_ID",
                objectType: "PricelistPartNumberPOAFOC",
                trackedFields: [
                    "ProductID",
                    "PricelistType",
                    "POAFOCValue"
                ],
                fieldLabels: {
                    ProductID: "Product ID",
                    PricelistType: "Pricelist Type",
                    POAFOCValue: "POA / FOC"
                },
                getObjectDescription: record => [record.ProductID,record.PricelistType,record.POAFOCValue].filter(Boolean).join(" / ")
            }
        ]
    });

    registerApplicationChangeLogging(this, {
        auditKey: "TermsAndConditions",
        entity: TermsAndConditions,
        dbEntity: "com.sap.pricelistsystem.TermsAndConditionDetermination",
        application: "Data Maintenance",
        functionalArea: "Terms & Conditions",
        objectType: "TermsAndConditionDetermination",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "SalesOrg",
            "DistChannel",
            "CustPriceList",
            "CustGroup1",
            "ErpCustomer",
            "DeliveringPlant",
            "HeaderTermsAndConditions",
            "HeaderNotes",
            "MainCategory",
            "SubCategory1",
            "SubCategory2",
            "SubCategory3",
            "SubCategory4",
            "SubCategory5",
            "MainCategoryTermsandConditions",
            "SubCategory1TermsandConditions",
            "SubCategory2TermsandConditions",
            "SubCategory3TermsandConditions",
            "SubCategory4TermsandConditions",
            "SubCategory5TermsandConditions"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Region",
            MarketScopeCountry: "Country",
            SalesOrg: "Sales Organization",
            DistChannel: "Distribution Channel",
            CustPriceList: "Customer Pricelist",
            CustGroup1: "Customer Group 1",
            ErpCustomer: "ERP Customer",
            DeliveringPlant: "Plant",
            HeaderTermsAndConditions: "Header Terms and Conditions",
            HeaderNotes: "Header Notes",
            MainCategory: "Main Category",
            SubCategory1: "SubCategory 1",
            SubCategory2: "SubCategory 2",
            SubCategory3: "SubCategory 3",
            SubCategory4: "SubCategory 4",
            SubCategory5: "SubCategory 5",
            MainCategoryTermsandConditions: "Main Category Terms and Conditions",
            SubCategory1TermsandConditions: "SubCategory 1 Terms and Conditions",
            SubCategory2TermsandConditions: "SubCategory 2 Terms and Conditions",
            SubCategory3TermsandConditions: "SubCategory 3 Terms and Conditions",
            SubCategory4TermsandConditions: "SubCategory 4 Terms and Conditions",
            SubCategory5TermsandConditions: "SubCategory 5 Terms and Conditions"
        },
        getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry,record.MainCategory].filter(Boolean).join(" / "),
        children: [
            {
                name: "partNumberTermsAndConditions",
                entity: TermsAndConditionPartNumbers,
                dbEntity: "com.sap.pricelistsystem.TermsAndConditionPartNumber",
                parentField: "parent_ID",
                objectType: "TermsAndConditionPartNumber",
                trackedFields: [
                    "ProductID",
                    "PartNumberTermsandConditions"
                ],
                fieldLabels: {
                    ProductID: "Product ID",
                    PartNumberTermsandConditions: "Part Number Terms and Conditions"
                },
                getObjectDescription: record => record.ProductID || ""
            }
        ]
    });

    registerApplicationChangeLogging(this, {
        auditKey: "TileContent",
        entity: TileContent,
        dbEntity: "com.sap.pricelistsystem.InformationTileContent",
        application: "Data Maintenance",
        functionalArea: "Information Tile",
        objectType: "InformationTileContent",
        trackedFields: [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "SalesOrg",
            "DistChannel",
            "CustPriceList",
            "CustGroup1",
            "ErpCustomer",
            "DeliveringPlant",
            "InformationHeading",
            "InformationDetails",
            "ImageLink"
        ],
        fieldLabels: {
            PricelistType: "Pricelist Type",
            MarketScopeRegion: "Region",
            MarketScopeCountry: "Country",
            SalesOrg: "Sales Organization",
            DistChannel: "Distribution Channel",
            CustPriceList: "Customer Pricelist",
            CustGroup1: "Customer Group 1",
            ErpCustomer: "ERP Customer Code",
            DeliveringPlant: "Plant",
            InformationHeading: "Information Heading",
            InformationDetails: "Information Details",
            ImageLink: "Image Link"
        },
        getObjectDescription: record => record.InformationHeading || [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / "),
        children: []
    });

    registerApplicationChangeLogging(this, {
        auditKey: "AccountAssignment",
        entity: AccountAssignment,
        dbEntity: "com.sap.pricelistsystem.AccountAssignment",
        application: "Data Maintenance",
        functionalArea: "Account Setup",
        objectType: "AccountAssignment",
        trackedFields: [
            "FirstName",
            "LastName",
            "Email",
            "AccountType",
            "AccountScope",
            "CommercialScope",
            "CustomerNumber",
            "CustPriceList",
            "CustGroup1",
            "DeliveringPlant",
            "ControlPriceListView",
            "ControlPriceView",
            "ControlDiscountIndicator",
            "ControlDiscountRate",
            "ControlWorkflowTile",
            "ControlPriceListReviewScheduleTile",
            "ControlPricelistMaintenance",
            "ControlDataMaintenance",
            "ControlMyRequestTile",
            "ControlApplicationLogTile"
        ],
        fieldLabels: {
            FirstName: "First Name",
            LastName: "Last Name",
            Email: "E-Mail",
            AccountType: "Account Type",
            AccountScope: "Account Scope",
            CommercialScope: "Commercial Scope",
            CustomerNumber: "Customer Code",
            CustPriceList: "Customer Pricelist",
            CustGroup1: "Customer Group 1",
            DeliveringPlant: "Plant",
            ControlPriceListView: "Pricelist View",
            ControlPriceView: "Price View",
            ControlDiscountIndicator: "Discount Indicator",
            ControlDiscountRate: "Discount Rate",
            ControlWorkflowTile: "Workflow Tile",
            ControlPriceListReviewScheduleTile: "Pricelist Review Schedule Tile",
            ControlPricelistMaintenance: "Pricelist Maintenance",
            ControlDataMaintenance: "Data Maintenance",
            ControlMyRequestTile: "My Requests Tile",
            ControlApplicationLogTile: "Application Log Tile"
        },
        getObjectDescription: record => record.Email || [record.FirstName, record.LastName].filter(Boolean).join(" "),
        children: [
            {
                name: "scopes",
                entity: AccountAssignmentScope,
                dbEntity: "com.sap.pricelistsystem.AccountAssignmentScope",
                parentField: "parent_ID",
                objectType: "AccountAssignmentScope",
                trackedFields: [
                    "PricelistType",
                    "MarketScopeRegion",
                    "MarketScopeCountry",
                    "SalesOrg",
                    "DistChannel"
                ],
                fieldLabels: {
                    PricelistType: "Pricelist Type",
                    MarketScopeRegion: "Region",
                    MarketScopeCountry: "Country",
                    SalesOrg: "Sales Organization",
                    DistChannel: "Distribution Channel"
                },
                getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry,record.SalesOrg,record.DistChannel].filter(Boolean).join(" / ")
            }
        ]
    });

    //Handler for Duplicate Row - Data Maintenance App
    this.on('copyRow', async (req) => {
        const { target } = req
        const id = req.params[0]?.ID || req.params[0];

        // Read the existing active record.
        const existing = await SELECT.one.from(target).where({ ID: id })
        if (!existing) return req.error(404, "Original record not found.")

        // Prepare the data for the new copy.
        const dataToCopy = { ...existing }

        // Remove keys and admin fields so the system generates new ones.
        const fieldsToRemove = [
            'ID', 'HasActiveEntity', 'HasDraftEntity', 'IsActiveEntity',
            'DraftAdministrativeData', 'DraftMessages', 'SiblingEntity',
            'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'
        ];
        fieldsToRemove.forEach(f => delete dataToCopy[f]);

        if (target === AccountAssignment || target.name === AccountAssignment.name) {
            const scopes = await SELECT.from(AccountAssignmentScope).where({ parent_ID: id });

            dataToCopy.scopes = scopes.map(scope => {
                const scopeToCopy = { ...scope };

                [
                    'ID',
                    'parent_ID',
                    'HasActiveEntity',
                    'HasDraftEntity',
                    'IsActiveEntity',
                    'DraftAdministrativeData',
                    'DraftMessages',
                    'SiblingEntity',
                    'createdAt',
                    'createdBy',
                    'modifiedAt',
                    'modifiedBy'
                ].forEach(f => delete scopeToCopy[f]);

                return scopeToCopy;
            });
        }

        // Create the new record as a DRAFT to allows the user to see the new row and edit it before saving.
        return this.create(target).entries(dataToCopy);
    });

    this.on("massDuplicatePricelists", async (req) => {
        const { ids } = req.data;
        if (!ids?.length) return req.error(400, "No pricelists selected.");

        const tx = cds.tx(req);
        const results = [];

        const headerSkip = [
            "ID", "createdAt", "createdBy", "modifiedAt", "modifiedBy",
            "IsActiveEntity", "HasActiveEntity", "HasDraftEntity",
            "DraftAdministrativeData_DraftUUID", "SiblingEntity"
        ];

        const childSkip = [
            "ID", "createdAt", "createdBy", "modifiedAt", "modifiedBy",
            "pricelist_ID", "parent_ID"
        ];

        const clean = (row, skip) => {
            const out = { ...row };
            skip.forEach(k => delete out[k]);
            return out;
        };

        for (const sourceId of ids) {
            const source = await tx.run(
                SELECT.one.from(PricelistData).where({ ID: sourceId })
            );

            if (!source) continue;

            const newId = cds.utils.uuid();

            const newHeader = clean(source, headerSkip);
            newHeader.ID = newId;
            newHeader.PricelistTitle = `${source.PricelistTitle || ""} - copy`;
            newHeader.Status = "Drafted";
            newHeader.PublishedBy = null;
            newHeader.PublishedDate = null;
            newHeader.Version = "0.1";
            newHeader.IsVersionActive = true;
            newHeader.PricelistGroupID = cds.utils.uuid();

            await tx.run(INSERT.into(PricelistData).entries(newHeader));

            const items = await tx.run(
                SELECT.from(PricelistItemData).where({ pricelist_ID: sourceId })
            );

            const oldToNew = new Map();

            for (const item of items) {
                oldToNew.set(item.ID, cds.utils.uuid());
            }

            for (const item of items) {
                const newItem = clean(item, childSkip);
                newItem.ID = oldToNew.get(item.ID);
                newItem.pricelist_ID = newId;

                if (item.parent_ID) {
                    newItem.parent_ID = oldToNew.get(item.parent_ID) || null;
                }

                await tx.run(INSERT.into(PricelistItemData).entries(newItem));
            }

            const products = await tx.run(
                SELECT.from(ProductPriceList).where({ pricelist_ID: sourceId })
            );

            const oldProductToNewProduct = new Map();

            for (const product of products) {
                oldProductToNewProduct.set(product.ID, cds.utils.uuid());
            }

            const productSkip = [
                "ID", "createdAt", "createdBy", "modifiedAt", "modifiedBy",
                "pricelist_ID", "parent_ID"
            ];

            for (const product of products) {
                const newProduct = clean(product, productSkip);

                newProduct.ID = oldProductToNewProduct.get(product.ID);
                newProduct.pricelist_ID = newId;

                if (product.parent_ID) {
                    newProduct.parent_ID = oldProductToNewProduct.get(product.parent_ID) || null;
                }

                await tx.run(INSERT.into(ProductPriceList).entries(newProduct));
            }
            
            results.push({
                sourceId,
                newId,
                title: newHeader.PricelistTitle
            });
        }

        return results;
    });

    this.on("massEditPricelists", async (req) => {
        const { ids, changes } = req.data;

        if (!ids || ids.length === 0) {
            return req.error(400, "No pricelists selected.");
        }

        let patchData;
        try {
            patchData = typeof changes === "string" ? JSON.parse(changes) : changes;
        } catch (e) {
            return req.error(400, "Invalid changes payload.");
        }

        const allowedFields = [
            "PricelistTitle",
            "Status",
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "Currency",
            "EffectiveDate",
            "SalesOrg",
            "DistChannel",
            "CustGroup1",
            "CustPriceList",
            "ErpCustomer",
            "DeliveringPlant"
        ];

        const cleanPatch = {};
        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(patchData, field)) {
                cleanPatch[field] = patchData[field];
            }
        }

        if (Object.keys(cleanPatch).length === 0) {
            return req.error(400, "No fields selected for update.");
        }

        const tx = cds.tx(req);
        const results = [];

        for (const id of ids) {
            try {
                const oldData = await tx.run(
                    SELECT.one.from(PricelistData).where({ ID: id })
                );

                if (!oldData) {
                    results.push({
                        sourceId: id,
                        status: "ERROR",
                        message: "Pricelist not found."
                    });
                    continue;
                }

                const changedFields = {};
                for (const [field, value] of Object.entries(cleanPatch)) {
                    if (String(oldData[field] ?? "") !== String(value ?? "")) {
                        changedFields[field] = value;
                    }
                }

                if (oldData.Status === "Published") {
                    results.push({
                        sourceId: id,
                        status: "ERROR",
                        message: 'Published pricelists cannot be changed through Mass Edit. Use "Move to For Revision" to create a separate working revision.'
                    });
                    continue;
                }

                if (Object.keys(changedFields).length === 0) {
                    results.push({
                        sourceId: id,
                        status: "SUCCESS",
                        message: "No changes required."
                    });
                    continue;
                }

                await tx.run(
                    UPDATE(PricelistData)
                        .set({
                            ...changedFields,
                            modifiedAt: new Date(),
                            modifiedBy: req.user?.id || "unknown"
                        })
                        .where({ ID: id })
                );

                const entries = [];
                const now = new Date();
                const changedBy = req.user?.id || "unknown";

                for (const [field, newValue] of Object.entries(changedFields)) {
                    const oldValue = oldData[field];

                    const isLargeTextField = LARGE_TEXT_FIELD_SET.has(field);

                    entries.push({
                        ID: cds.utils.uuid(),
                        changedAt: now,
                        changedBy,
                        source: "Header",
                        refId: id,
                        changeType: "UPDATE",
                        field,
                        oldValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : String(oldValue ?? ""),
                        newValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : String(newValue ?? "")
                    });
                }

                if (entries.length > 0) {
                    await tx.run(
                        INSERT.into("com.sap.pricelistsystem.PricelistChangeLog").entries(entries)
                    );
                }

                results.push({
                    sourceId: id,
                    status: "SUCCESS",
                    message: "Updated successfully."
                });

            } catch (e) {
                results.push({
                    sourceId: id,
                    status: "ERROR",
                    message: e.message || String(e)
                });
            }
        }

        return results;
    });

    this.on("moveToForRevision", PricelistData, async (req) => {
        const ID = req.params?.[0]?.ID || req.data?.ID;

        if (!ID) {
            return req.error(400, "Missing Pricelist ID.");
        }

        const tx = cds.tx(req);

        const publishedRow = await tx.run(
            SELECT.one
                .from(PricelistData)
                .where({ ID })
        );

        if (!publishedRow) {
            return req.error(404, "Pricelist not found.");
        }

        if (publishedRow.Status !== "Published") {
            return req.error(400, "Only Published pricelists can be moved to For Revision.");
        }

        if (publishedRow.IsVersionActive !== true) {
            return req.error(400, "Only the active Published version can be moved to For Revision.");
        }

        try {
            return await versionService.createWorkingRevision(
                tx,
                {
                    PricelistData,
                    PricelistItemData,
                    ProductPriceList
                },
                publishedRow,
                "For Revision"
            );
        } catch (error) {
            return req.error(400, error.message || "Unable to create working revision.");
        }
    });

    // Handler for Mass Upload - Data Maintenance App
    // 1. Trade Scenarios
    this.on('MassUploadTradeScenarios', req =>
        handleMassUpload(req, cds.entities.TradeAndMarketScenarioDetermination,
            [
                "PricelistType",
                "MarketScopeRegion",
                "MarketScopeCountry",
                "EmailSubject",
                "EmailBody"
            ],
            r => ({
                PricelistType: r["Pricelist Type"] || r["PricelistType"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                EmailSubject: r["Email Subject"] || r["EmailSubject"],
                EmailBody: r["Email Body"] || r["EmailBody"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Trade & Market Scenario",
                objectType: "TradeAndMarketScenarioDetermination",
                getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / ")
            }
        )
    );

    // 2. Item Structure
    this.on('MassUploadItemStructure', req =>
        handleMassUpload(req, cds.entities.PricelistItemStructureComponents,
            [
                "Pricelist Type",
                "Region",
                "Country",
                "Sequence",
                "Sales Organization",
                "Distribution Channel",
                "Customer Pricelist",
                "Customer Group 1",
                "ERP Customer",
                "Plant",
                "Main Category",
                "SubCategory 1",
                "SubCategory 2",
                "SubCategory 3",
                "SubCategory 4",
                "SubCategory 5",
                "Main Category Local Description",
                "SubCategory 1 Local Description",
                "SubCategory 2 Local Description",
                "SubCategory 3 Local Description",
                "SubCategory 4 Local Description",
                "SubCategory 5 Local Description"
            ],
            r => ({
                PricelistType: r["Pricelist Type"],
                MarketScopeRegion: r["Region"],
                MarketScopeCountry: r["Country"],
                Sequence: r["Sequence"],
                SalesOrg: r["Sales Organization"],
                DistChannel: r["Distribution Channel"],
                CustPriceList: r["Customer Pricelist"],
                CustGroup1: r["Customer Group 1"],
                ErpCustomer: r["ERP Customer"],
                DeliveringPlant: r["Plant"],
                MainCategory: r["Main Category"],
                SubCategory1: r["SubCategory 1"],
                SubCategory2: r["SubCategory 2"],
                SubCategory3: r["SubCategory 3"],
                SubCategory4: r["SubCategory 4"],
                SubCategory5: r["SubCategory 5"],
                MainCategoryLocal: r["Main Category Local Description"],
                SubCategory1Local: r["SubCategory 1 Local Description"],
                SubCategory2Local: r["SubCategory 2 Local Description"],
                SubCategory3Local: r["SubCategory 3 Local Description"],
                SubCategory4Local: r["SubCategory 4 Local Description"],
                SubCategory5Local: r["SubCategory 5 Local Description"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Item Structure",
                objectType: "PricelistItemStructureComponents",
                getObjectDescription: record => [record.MainCategory,record.SubCategory1,record.SubCategory2,record.SubCategory3,record.SubCategory4,record.SubCategory5].filter(Boolean).join(" / ") || [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / ")
            }
        )
    );

    // 3. Part Numbers
    this.on('MassUploadPartNumbers', req =>
        handleMassUpload(req, cds.entities.PricelistPartNumberDetermination,
            [
                "Pricelist Type",
                "Region",
                "Country",
                "Sales Organization",
                "Distribution Channel",
                "Product ID",
                "ERP Status",
                "Material Classification",
                "Translation Material Classification",
                "Pricelist Product Description",
                "Product Description",
                "Pricelist Material Classification",
                "Product Status",
                "Status Validity",
                "3rd Party Supplier",
                "3rd Party Supplier SKU"
            ],
            r => ({
                PricelistType: r["Pricelist Type"],
                MarketScopeRegion: r["Region"],
                MarketScopeCountry: r["Country"],
                SalesOrg: r["Sales Organization"],
                DistChannel: r["Distribution Channel"],
                ProductID: r["Product ID"],
                ErpStatus: r["ERP Status"],
                MaterialClassification1: r["Material Classification"],
                MaterialClassification2: r["Translation Material Classification"],
                ProductDescription2: r["Pricelist Product Description"],
                ProductDescription1: r["Product Description"],
                PricelistMaterialClassification: r["Pricelist Material Classification"],
                ProductStatus: r["Product Status"],
                StatusValidity: r["Status Validity"],
                ThirdPartySupplier: r["3rd Party Supplier"],
                ThirdPartySupplierSKU: r["3rd Party Supplier SKU"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Part Number",
                objectType: "PricelistPartNumberDetermination",
                getObjectDescription: record => [record.ProductID,record.ProductDescription2 || record.ProductDescription1].filter(Boolean).join(" - ")
            }
        )
    );

    // 4. Terms and Conditions
    this.on('MassUploadTermsandCond', req =>
        handleMassUpload(req, cds.entities.TermsAndConditionDetermination,
            [
                "Pricelist Type",
                "Region",
                "Country",
                "Sales Organization",
                "Distribution Channel",
                "Customer Pricelist",
                "Customer Group 1",
                "ERP Customer",
                "Plant",
                "Main Category",
                "SubCategory 1",
                "SubCategory 2",
                "SubCategory 3",
                "SubCategory 4",
                "SubCategory 5",
                "Main Category Terms and Condition",
                "SubCategory 1 Terms and Condition",
                "SubCategory 2 Terms and Condition",
                "SubCategory 3 Terms and Condition",
                "SubCategory 4 Terms and Condition",
                "SubCategory 5 Terms and Condition"
            ],
            r => ({
                PricelistType: r["Pricelist Type"],
                MarketScopeRegion: r["Region"],
                MarketScopeCountry: r["Country"],
                SalesOrg: r["Sales Organization"],
                DistChannel: r["Distribution Channel"],
                CustPriceList: r["Customer Pricelist"],
                CustGroup1: r["Customer Group 1"],
                ErpCustomer: r["ERP Customer"],
                DeliveringPlant: r["Plant"],
                MainCategory: r["Main Category"],
                SubCategory1: r["SubCategory 1"],
                SubCategory2: r["SubCategory 2"],
                SubCategory3: r["SubCategory 3"],
                SubCategory4: r["SubCategory 4"],
                SubCategory5: r["SubCategory 5"],
                MainCategoryTermsandConditions: r["Main Category Terms and Condition"],
                SubCategory1TermsandConditions: r["SubCategory 1 Terms and Condition"],
                SubCategory2TermsandConditions: r["SubCategory 2 Terms and Condition"],
                SubCategory3TermsandConditions: r["SubCategory 3 Terms and Condition"],
                SubCategory4TermsandConditions: r["SubCategory 4 Terms and Condition"],
                SubCategory5TermsandConditions: r["SubCategory 5 Terms and Condition"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Terms & Conditions",
                objectType: "TermsAndConditionDetermination",
                getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry,record.MainCategory].filter(Boolean).join(" / ")
            }
        )
    );

    // 5. Pricing Parameters
    // this.on('MassUploadPricingParam', req =>
    //     handleMassUpload(req, cds.entities.PricingParameterDetermination,
    //         ["PricelistType", "MarketScopeRegion", "MarketScopeCountry", "SalesOrg", "DistChannel", "CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant", "ErpPriceCondition", "ErpSequence", "ErpPricingAccessSequence"],
    //         r => ({
    //             PricelistType: r["Pricelist Type"] || r["PricelistType"],
    //             MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
    //             MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
    //             SalesOrg: r["Sales Org"] || r["SalesOrg"],
    //             DistChannel: r["Distribution Channel"] || r["DistChannel"],
    //             CustPriceList: r["Customer Pricelist"] || r["CustPriceList"],
    //             CustGroup1: r["Customer Group 1"] || r["CustGroup1"],
    //             ErpCustomer: r["ERP Customer"] || r["ErpCustomer"],
    //             DeliveringPlant: r["Plant"] || r["DeliveringPlant"],
    //             ErpPriceCondition: r["ERP Price Condition"] || r["ErpPriceCondition"],
    //             ErpSequence: r["ERP Sequence"] || r["ErpSequence"],
    //             ErpPricingAccessSequence: r["ERP Pricing Access Sequence"] || r["ErpPricingAccessSequence"]
    //         })
    //     )
    // );
    this.on('MassUploadPricingParam', req =>
        handleMassUpload(req, cds.entities.PricingParameterDetermination,
            [
                "PricelistType",
                "MarketScopeRegion",
                "MarketScopeCountry",
                "SalesOrg",
                "DistChannel",
                "CustPriceList",
                "CustGroup1",
                "ErpCustomer",
                "DeliveringPlant"
            ],
            r => ({
                PricelistType: r["Pricelist Type"] || r["PricelistType"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                SalesOrg: r["Sales Org"] || r["SalesOrg"],
                DistChannel: r["Distribution Channel"] || r["DistChannel"],
                CustPriceList: r["Customer Pricelist"] || r["CustPriceList"],
                CustGroup1: r["Customer Group 1"] || r["CustGroup1"],
                ErpCustomer: r["ERP Customer"] || r["ErpCustomer"],
                DeliveringPlant: r["Plant"] || r["DeliveringPlant"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Pricing Parameters",
                objectType: "PricingParameterDetermination",
                getObjectDescription: record => [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry,record.SalesOrg,record.DistChannel].filter(Boolean).join(" / ")
            }
        )
    );

    // 6. Tile Content
    this.on('MassUploadTileContent', req =>
        handleMassUpload(req, cds.entities.InformationTileContent,
            ["PricelistType", "MarketScopeRegion", "MarketScopeCountry", "InformationHeading", "InformationDetails", "ImageLink"],
            r => ({
                PricelistType: r["Pricelist Type"] || r["PricelistType"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                InformationHeading: r["Information Heading"] || r["InformationHeading"],
                InformationDetails: r["Information Details"] || r["InformationDetails"],
                ImageLink: r["Image Link"] || r["ImageLink"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Information Tile",
                objectType: "InformationTileContent",
                getObjectDescription: record => record.InformationHeading || [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / ")
            }
        )
    );

    // 7. Contact Info
    this.on('MassUploadContactInfo', req =>
        handleMassUpload(req, cds.entities.ContactInformation,
            ["PricelistType", "MarketScopeRegion", "MarketScopeCountry", "ContactEmail", "ContactNumber"],
            r => ({
                PricelistType: r["Pricelist Type"] || r["PricelistType"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                ContactEmail: r["Contact E-Mail"] || r["ContactEmail"],
                ContactNumber: r["Contact Number"] || r["ContactNumber"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Contact Information",
                objectType: "ContactInformation",
                getObjectDescription: record => record.ContactEmail || [record.PricelistType,record.MarketScopeRegion,record.MarketScopeCountry].filter(Boolean).join(" / ")
            }
        )
    );

    // 8. Account Assignment
    this.on('MassUploadAcctAssign', req =>
        handleMassUpload(req, cds.entities.AccountAssignment,
            [
                "First Name",
                "Last Name",
                "EMail",
                "Account Type",
                "Account Scope",
                "Commercial Scope",
                "Customer Code",
                // "Pricelist Type",
                // "Region",
                // "Country",
                // "Sales Organization",
                // "Distribution Channel",
                "Customer Pricelist",
                "Customer Group 1",
                "Plant",
                "Pricelist View",
                "Price View",
                "Discount Indicator",
                "Discount Rate",
                "Workflow Tile",
                "Pricelist Review Schedule Tile",
                "Pricelist Maintenance",
                "Data Maintenance",
                "My Requests Tile",
                "Application Log Tile"
            ],
            r => ({
                FirstName: r["First Name"],
                LastName: r["Last Name"],
                Email: r["EMail"],
                AccountType: r["Account Type"],
                AccountScope: r["Account Scope"],
                CommercialScope: r["Commercial Scope"],
                CustomerNumber: r["Customer Code"],
                // PricelistType: r["Pricelist Type"],
                // MarketScopeRegion: r["Region"],
                // MarketScopeCountry: r["Country"],
                // SalesOrg: r["Sales Organization"],
                // DistChannel: r["Distribution Channel"],
                CustPriceList: r["Customer Pricelist"],
                CustGroup1: r["Customer Group 1"],
                DeliveringPlant: r["Plant"],
                ControlPriceListView: r["Pricelist View"],
                ControlPriceView: r["Price View"],
                ControlDiscountIndicator: r["Discount Indicator"],
                ControlDiscountRate: r["Discount Rate"],
                ControlWorkflowTile: r["Workflow Tile"],
                ControlPriceListReviewScheduleTile: r["Pricelist Review Schedule Tile"],
                ControlPricelistMaintenance: r["Pricelist Maintenance"],
                ControlDataMaintenance: r["Data Maintenance"],
                ControlMyRequestTile: r["My Requests Tile"],
                ControlApplicationLogTile: r["Application Log Tile"]
            }),
            {
                application: "Data Maintenance",
                functionalArea: "Account Setup",
                objectType: "AccountAssignment",
                getObjectDescription: record => record.Email || [record.FirstName,record.LastName].filter(Boolean).join(" ")
            }
        )
    );

    this.on("MassUploadItemTermsandConditions", async (req) => {
        const extdb = await cds.connect.to('extdb');
        const db = cds.transaction(req);

        const filters = {
            PricelistType: req.data.PricelistType,
            MarketScopeRegion: req.data.MarketScopeRegion,
            MarketScopeCountry: req.data.MarketScopeCountry,
            SalesOrg: req.data.SalesOrg,
            DistChannel: req.data.DistChannel,
            CustPriceList: req.data.CustPriceList,
            CustGroup1: req.data.CustGroup1,
            ErpCustomer: req.data.ErpCustomer,
            DeliveringPlant: req.data.DeliveringPlant
        };
        console.log('>>> Filters:', filters);

        try {
            const { file } = req.data;
            if (!file) return req.error(400, "No file provided");

            const buffer = Buffer.from(file, "base64");
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Parse rows and normalize headers
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            const rows = rawRows.map(row => {
                const normalized = {};
                for (const key of Object.keys(row)) {
                    // remove spaces, trim, unify casing
                    const cleanKey = key.replace(/\s+/g, "").trim();
                    normalized[cleanKey] = row[key];
                }
                return normalized;
            });

            const errors = [];
            const validatedRecords = [];

            for (let idx = 0; idx < rows.length; idx++) {
                const row = rows[idx];
                const partNumber = row.PricelistPartNumber;
                const rowErrors = [];

                const resolvedItems = await resolveItems(filters, db, extdb);
                console.log(">>>resolvedItems", resolvedItems);
                const resolved = resolvedItems.find(item => item.PricelistPartNumber === partNumber) || null;
                //const resolved = await resolvePricelistItem(filters, partNumber, db, extdb);
                console.log(">>>resolved", resolved);

                if (!resolved) {
                    rowErrors.push(`Row ${idx + 2}: PartNumber ${partNumber} not found`);
                    continue;
                }

                // Validate all non‑T&C fields
                const fieldsToValidate = [
                    "MainCategory",
                    "Subcategory1",
                    "Subcategory2",
                    "Subcategory3",
                    "Subcategory4",
                    "Subcategory5",
                    "Price",
                    "PriceUnit",
                    "MaterialStatus",
                    "MaterialStatusEffecDate",
                    "DiscountRate",
                    "DiscountEffectiveDate"
                ];

                for (const field of fieldsToValidate) {
                    const uploadedVal = String(row[field] || "").trim();
                    const expectedVal = String(resolved[field] || "").trim();
                    if (uploadedVal !== expectedVal) {
                        rowErrors.push(`Row ${idx + 2}, Column ${field}: mismatch (uploaded="${uploadedVal}", expected="${expectedVal}")`);
                    }
                    console.log(">>>", field, uploadedVal, expectedVal);
                }

                // If no errors for this row, update only T&C fields
                if (rowErrors.length === 0) {
                    validatedRecords.push({
                        ...resolved,
                        MainCategoryTermsandCond: row.MainCategoryTermsandCond,
                        SubCategory1TermsandCond: row.SubCategory1TermsandCond,
                        SubCategory2TermsandCond: row.SubCategory2TermsandCond,
                        SubCategory3TermsandCond: row.SubCategory3TermsandCond,
                        SubCategory4TermsandCond: row.SubCategory4TermsandCond,
                        SubCategory5TermsandCond: row.SubCategory5TermsandCond,
                        PartNumberTermsandCond: row.PartNumberTermsandCond,
                        PartNumberDescrLong: row.PricelistPartNumberDescription
                    });
                    console.log(">>>Valid Record", validatedRecords);
                }

                errors.push(...rowErrors);
            }

            if (errors.length > 0) {
                return req.error(400, "Upload failed:\n" + errors.join("\n"));
            }

            return {
                message: "Terms & Conditions upload successful",
                items: validatedRecords
            };

        } catch (err) {
            console.error(err);
            return req.error(500, "Error processing Excel file: " + err.message);
        }
    });

    //Value Help Population
    // Distinct Trade Scenarios
    // this.on('READ', 'TradeScenarioVH', async (req) => {
    //     const db = cds.transaction(req);
    //     return await db.run(
    //         SELECT.distinct.from(TradeScenarios)
    //             // .columns('TradeScenario', 'MarketScopeRegion', 'MarketScopeCountry')
    //             .columns('TradeScenario')
    //             .orderBy('TradeScenario')
    //     );
    // });

    // // Distinct Regions filtered by TradeScenario
    // this.on('READ', 'MarketRegionVH', async (req) => {
    //     const db = cds.transaction(req);
    //     let q = SELECT.distinct.from(TradeScenarios)
    //         // .columns('TradeScenario', 'MarketScopeRegion', 'MarketScopeCountry');
    //         .columns('MarketScopeRegion');

    //     if (req.query.SELECT.where) {
    //         q.where(req.query.SELECT.where);
    //     }

    //     return await db.run(q);

    this.on('READ', 'PricelistTypeVH', () => cds.run(SELECT.distinct.from('TradeAndMarketScenarioDetermination').columns('PricelistType').orderBy('PricelistType')));
    this.on('READ', 'MarketRegionVH', () => cds.run(SELECT.distinct.from('TradeAndMarketScenarioDetermination').columns('MarketScopeRegion').orderBy('MarketScopeRegion')));
    this.on('READ', 'MainCategoryVH', () => cds.run(SELECT.distinct.from('PricelistItemStructureComponents').columns('MainCategory').orderBy('MainCategory')));

    this.on('READ', 'SubCategory1VH', () => {
        return cds.run(
            SELECT.distinct.from('PricelistItemStructureComponents')
                .columns('SubCategory1')
                .where(`SubCategory1 is not null and SubCategory1 <> ''`)
                .orderBy('SubCategory1')
        );
    });

    this.on('READ', 'SubCategory2VH', () => {
        return cds.run(
            SELECT.distinct.from('PricelistItemStructureComponents')
                .columns('SubCategory2')
                .where(`SubCategory2 is not null and SubCategory2 <> ''`)
                .orderBy('SubCategory2')
        );
    });

    this.on('READ', 'SubCategory3VH', () => {
        return cds.run(
            SELECT.distinct.from('PricelistItemStructureComponents')
                .columns('SubCategory3')
                .where(`SubCategory3 is not null and SubCategory3 <> ''`)
                .orderBy('SubCategory3')
        );
    });


    this.on('READ', 'SubCategory4VH', () => {
        return cds.run(
            SELECT.distinct.from('PricelistItemStructureComponents')
                .columns('SubCategory4')
                .where(`SubCategory4 is not null and SubCategory4 <> ''`)
                .orderBy('SubCategory4')
        );
    });

    this.on('READ', 'SubCategory5VH', () => {
        return cds.run(
            SELECT.distinct.from('PricelistItemStructureComponents')
                .columns('SubCategory5')
                .where(`SubCategory5 is not null and SubCategory5 <> ''`)
                .orderBy('SubCategory5')
        );
    });

    // Distinct Countries filtered by TradeScenario + Region
    this.on('READ', 'MarketCountryVH', async (req) => {
        const db = cds.transaction(req);
        let q = SELECT.distinct.from(TradeScenarios)
            .columns('MarketScopeCountry').orderBy('MarketScopeCountry');

        if (req.query.SELECT.where) {
            const filters = {};

            // Walk through the where array
            for (let i = 0; i < req.query.SELECT.where.length; i++) {
                const w = req.query.SELECT.where[i];
                const next = req.query.SELECT.where[i + 2]; // pattern: ref, '=', val

                if (w.ref && w.ref[0] === 'PricelistType' && next && next.val) {
                    filters.PricelistType = next.val;
                }
                if (w.ref && w.ref[0] === 'MarketScopeRegion' && next && next.val) {
                    filters.MarketScopeRegion = next.val;
                }
                if (w.ref && w.ref[0] === 'MarketScopeCountry' && next && next.val) {
                    filters.MarketScopeCountry = next.val;
                }
            }

            if (Object.keys(filters).length > 0) {
                q.where(filters);
            }
        }

        return await db.run(q);
    });

    // Distinct Customers from HANA DB Table T_CUSTOMER_MASTER_DATA
    this.on('READ', 'CustomerVH', async (req) => {
        const extdb = await cds.connect.to('extdb');
        let q = SELECT.distinct.from('T_CUSTOMER_MASTER_DATA').columns('CUSTOMER', 'SALES_ORGANIZATION', 'DISTRIBUTION_CHANNEL');
        if (req.query.SELECT.where) {
            q.where(req.query.SELECT.where);
        }
        return await extdb.run(q);
    });

    // Distinct Material Group2
    this.on('READ', 'MaterialGroup2VH', async (req) => {
        const extdb = await cds.connect.to('extdb');
        let q = SELECT.distinct.from('ErpMaterialGroup2')
            .columns('Code')
            .orderBy('Code');

        if (req.query.SELECT.where) {
            q.where(req.query.SELECT.where);
        }
        return await extdb.run(q);
    });

    // ─── Helper ──────────────────────────────────────────────────────────────────
    const readVH = async (req, table, { codeCol = 'Code', descCol = 'Description' } = {}) => {
        const extdb = await cds.connect.to('extdb');

        let q = SELECT.distinct.from(table)
            .columns(codeCol, descCol)
            .orderBy(codeCol);

        if (req.query.SELECT.where) {
            q.where(req.query.SELECT.where);
        }

        const result = await extdb.run(q);
        return result.map(r => ({
            Code: r[codeCol],
            Description: r[descCol]
        }));
    };

    const readVH2 = async (req, table, { codeCol = 'Code' } = {}) => {
        const extdb = await cds.connect.to('extdb');

        let q = SELECT.distinct.from(table)
            .columns(codeCol)
            .orderBy(codeCol);

        if (req.query.SELECT.where) {
            q.where(req.query.SELECT.where);
        }

        const result = await extdb.run(q);
        return result.map(r => ({
            Code: r[codeCol]
        }));
    };

    const readVH3 = async (req, table, { codeCol = 'Code', descCol = 'Description', matGroup2 = 'MATERIAL_GROUP_2' } = {}) => {
        const extdb = await cds.connect.to('extdb');

        let q = SELECT.distinct.from(table)
            .columns(codeCol,descCol,matGroup2)
            .orderBy(codeCol);

        if (req.query.SELECT.where) {
            q.where(req.query.SELECT.where);
        }

        const result = await extdb.run(q);
        return result.map(r => ({
            Code: r[codeCol],
            Description: r[descCol],
            MaterialGroup2: r[matGroup2]
        }));
    };

    // ─── Value Help Handlers ──────────────────────────────────────────────────────
    this.on('READ', 'SalesOrgVH', req => readVH(req, 'ERP_SALES_ORG', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'DistributionChannelVH', req => readVH(req, 'ERP_DIST_CHANNEL', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'PlantVH', req => readVH(req, 'ERP_PLANT', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'PricelistVH', req => readVH(req, 'ERP_CUSTPRICELIST', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'CustomerGroup1VH', req => readVH(req, 'ERP_CUSTGRP1', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'PriceAccessSequenceVH', req => readVH(req, 'ERP_PRICEACCESSSEQUENCE', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'DiscountConditionTypeVH', req => readVH2(req, 'ERP_DISCOUNTCONDTYPE', { codeCol: 'CODE' }));
    this.on('READ', 'DiscountAccessSequenceVH', req => readVH(req, 'ERP_DISCOUNTACCESSSEQ', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'MatGruop2VH', req => readVH(req, 'ERP_MAT_GROUP2', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'RequestStatusVH', req => readVH2(req, 'ERP_REQUESTSTATUS', { codeCol: 'CODE' }));
    // this.on('READ', 'MatMasVH', req => readVH3(req, 'T_MATERIAL_MASTER_DATA', { codeCol: 'MATERIAL', descCol: 'MATERIAL_DESCRIPTION', matGroup2: 'MATERIAL_GROUP_2', matGroup5: 'MATERIAL_GROUP_5' }));
    // this.on('READ', 'MatMasVH', req => readVH(req, 'T_MATERIAL_MASTER_DATA', { codeCol: 'MATERIAL', descCol: 'MATERIAL_DESCRIPTION' }));
    this.on('READ', 'MatMasVH', async (req) => {
        const extdb = await cds.connect.to('extdb');

        const select = req.query.SELECT || {};
        const top = select.limit?.rows?.val || 50;
        const skip = select.limit?.offset?.val || 0;

        let searchTerm = "";

        if (select.search && select.search.length > 0) {
            searchTerm = select.search
                .map(s => s.val)
                .filter(Boolean)
                .join(" ")
                .trim();
        }

        if (!searchTerm && select.where) {
            for (let i = 0; i < select.where.length; i++) {
                const token = select.where[i];

                if (token?.ref?.[0] && ['Code', 'Description'].includes(token.ref[0])) {
                    const nextVal = select.where[i + 2]?.val;
                    if (nextVal) {
                        searchTerm = String(nextVal).replace(/%/g, '').trim();
                        break;
                    }
                }
            }
        }

        const safeSearch = searchTerm.replace(/'/g, "''");

        let sql = `
            SELECT
                "MATERIAL" AS "Code",
                MAX("MATERIAL_DESCRIPTION") AS "Description",
                MAX("MATERIAL_GROUP_2") AS "MaterialGroup2",
                MAX("MATERIAL_GROUP_5") AS "MaterialGroup5"
            FROM "SAPECC"."T_MATERIAL_MASTER_DATA"
        `;

        if (safeSearch) {
            sql += `
                WHERE
                    UPPER("MATERIAL") LIKE UPPER('%${safeSearch}%')
                    OR UPPER("MATERIAL_DESCRIPTION") LIKE UPPER('%${safeSearch}%')
            `;
        }

        sql += `
            GROUP BY "MATERIAL"
            ORDER BY "MATERIAL"
            LIMIT ${Number(top)}
            OFFSET ${Number(skip)}
        `;

        return await extdb.run(sql);
    });

    // Pricing Parameters - Price / Discount category
    this.on('READ', 'PricingParameterTypeVH', (req) => {
        const data = [
            {
                Code: 'P',
                Text: 'Price Condition'
            },
            {
                Code: 'D',
                Text: 'Discount Condition'
            }
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    this.on('READ', 'PricingConditionTypeVH', async (req) => {
        const requestedType = getPricingParameterTypeFilter(req);

        const priceRows = [
            {
                ParameterType: 'P',
                Code: 'PR00',
                Description: 'Price Condition'
            },
            {
                ParameterType: 'P',
                Code: 'PREX',
                Description: 'Price Condition'
            }
        ];

        let discountRows = [];

        if (!requestedType || requestedType === 'D') {
            const extdb = await cds.connect.to('extdb');

            const rows = await extdb.run(
                SELECT.distinct
                    .from('ERP_DISCOUNTCONDTYPE')
                    .columns('CODE')
                    .orderBy('CODE')
            );

            discountRows = rows
                .map(row => String(row.CODE || "").trim().toUpperCase())
                .filter(code =>
                    DISCOUNT_CONDITION_TYPE_WHITELIST_SET.has(code)
                )
                .map(code => ({
                    ParameterType: 'D',
                    Code: code,
                    Description: 'Discount Condition'
            }));
        }

        const data = [
            ...(!requestedType || requestedType === 'P' ? priceRows : []),
            ...discountRows
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    //Pricing Parameters - Product Price Condition Type (Value Help)
    this.on('READ', 'PriceConditionTypeVH', (req) => {
        const data = [
            { Code: 'PR00' },
            { Code: 'PREX' },
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    this.on('READ', 'PricingAccessSequenceVH', async (req) => {
        const requestedType = getPricingParameterTypeFilter(req);
        const extdb = await cds.connect.to('extdb');

        const data = [];

        if (!requestedType || requestedType === 'P') {
            const priceRows = await extdb.run(
                SELECT.distinct
                    .from('ERP_PRICEACCESSSEQUENCE')
                    .columns('CODE', 'DESCRIPTION')
                    .orderBy('CODE')
            );

            data.push(
                ...priceRows.map(row => ({
                    ParameterType: 'P',
                    Code: row.CODE,
                    Description: row.DESCRIPTION
                }))
            );
        }

        if (!requestedType || requestedType === 'D') {
            const discountRows = await extdb.run(
                SELECT.distinct
                    .from('ERP_DISCOUNTACCESSSEQ')
                    .columns('CODE', 'DESCRIPTION')
                    .orderBy('CODE')
            );

            data.push(
                ...discountRows.map(row => ({
                    ParameterType: 'D',
                    Code: row.CODE,
                    Description: row.DESCRIPTION
                }))
            );
        }

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    //Account Assignment - Account Type (Value Help)
    this.on('READ', 'AccountTypeVH', (req) => {
        const data = [
            { Code: 'Internal' },
            { Code: 'External' }
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    //Account Assignment - Account Scope (Value Help)
    this.on('READ', 'AccountScopeVH', (req) => {
        const data = [
            { Code: 'Admin' },
            { Code: 'Regional' },
            { Code: 'Customer' }
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    this.on('READ', 'StatusVH', (req) => {
        const data = [{ code: 'Drafted' }, { code: 'Submitted' }, { code: 'In Review' }, { code: 'For Publication' }, { code: 'Published' }, { code: 'For Revision' }];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    this.before('PATCH', 'PriceProductMaintenance.drafts', async (req) => {
        const db    = cds.transaction(req);
        const extdb = await cds.connect.to('extdb');

        const draft = await db.run(
            SELECT.one.from('PRICELISTSERVICE_PRICEPRODUCTMAINTENANCE.drafts')
                .where({ ID: req.data.ID })
        );

        const productId   = req.data.ProductID   || draft?.PRODUCTID;
        const salesOrg    = req.data.SalesOrg    || draft?.SALESORG;
        const distChannel = req.data.DistChannel || draft?.DISTCHANNEL;

        // console.log('ID:', ID);
        // console.log('ProductID:', productId);
        // console.log('SalesOrg:', salesOrg);
        // console.log('DistChannel:', distChannel);
        // console.log('draft JSON =', JSON.stringify(draft, null, 2));

        if (!productId) return;
        
        // Get Product Description
        // const data1 = await extdb.run(
        //     SELECT.one
        //         .from('T_MATERIAL_MASTER_DATA')
        //         .columns( 'MATERIAL_DESCRIPTION' )       
        //         .where({ MATERIAL: productId })
        // );

        // Get Product Description
        const data2 = await extdb.run(
            SELECT.one
                .from('T_MATERIAL_MASTER_DATA')
                .columns( 'MATERIAL_DESCRIPTION','MATERIAL_GROUP_2','MATERIAL_GROUP_5' )       
                .where({ 
                    MATERIAL: productId,
                    SALES_ORGANIZATION: salesOrg,
                    DISTRIBUTION_CHANNEL: distChannel
                })
        );

        // console.log('ProductID:', productId);
        // console.log('SalesOrg:', salesOrg);
        // console.log('DistChannel:', distChannel);
        // console.log('MATERIAL_DESCRIPTION:', data1?.MATERIAL_DESCRIPTION);
        // console.log('MATERIAL_GROUP_2:', data2?.MATERIAL_GROUP_2);
        // console.log('MATERIAL_GROUP_5:', data2?.MATERIAL_GROUP_5);

        // if (data1) {
        //     req.data.ProductDescription1 = data2.MATERIAL_DESCRIPTION;
        // }

        console.log("Before set req.data:", JSON.stringify(req.data, null, 2));

        if (data2) {
            req.data.ProductDescription1 = data2.MATERIAL_DESCRIPTION;
            req.data.MaterialClassification1 = data2.MATERIAL_GROUP_2;
            req.data.ErpStatus = data2.MATERIAL_GROUP_5;

            console.log('MATERIAL_DESC_2.2:', data2?.MATERIAL_DESCRIPTION);
            console.log('MATERIAL_GROUP_2.2:', data2?.MATERIAL_GROUP_2);
            console.log('MATERIAL_GROUP_5.2:', data2?.MATERIAL_GROUP_5);            
        }

        console.log("After set req.data:", JSON.stringify(req.data, null, 2));
        console.log('MATERIAL_DESC_2.3:', req.data.ProductDescription1);
        console.log('MATERIAL_GROUP_2.3:', req.data.MaterialClassification1);
        console.log('MATERIAL_GROUP_5.3:', req.data.ErpStatus);  
    });

    this.before(['CREATE', 'PATCH', 'UPDATE'], 'PriceProductPOAFOC.drafts', async (req) => {
        const db = cds.transaction(req);

        const parentId = req.params?.[0]?.ID || req.data.parent_ID;

        if (!parentId) return;

        const parent = await db.run(
            SELECT.one
                .from('PRICELISTSERVICE_PRICEPRODUCTMAINTENANCE.drafts')
                .where({ ID: parentId })
        );

        const productId = parent?.PRODUCTID || parent?.ProductID;

        if (!productId) return;

        req.data.ProductID = productId;
    });

    // Handler for PricelistData Status Assignment
    this.before('CREATE', PricelistData, async (req) => {
        await versionService.handlePricelistCreate(req);
    });

    // Inactive published versions are historical snapshots and must not be changed, based on current discussions.
    this.before(['PATCH', 'UPDATE', 'DELETE', 'EDIT'], PricelistData, async (req) => {
        return versionService.rejectInactivePublishedHeader(req, PricelistData);
    });

    // Active Published pricelists should not enter Object Page draft edit.
    // User must first move the pricelist to For Revision using controlled action.
    this.before('EDIT', PricelistData, async (req) => {
        const ID = req.params?.[0]?.ID;
        if (!ID) return;

        const tx = cds.tx(req);

        const row = await tx.run(
            SELECT.one.from(PricelistData).where({ ID })
        );

        if (row?.Status === "Published") {
            return req.error(
                400,
                "Published pricelists cannot be edited directly. Move the pricelist to For Revision first."
            );
        }
    });

    this.before(['CREATE', 'PATCH', 'UPDATE', 'DELETE'], PricelistItemData, async (req) => {
        return versionService.rejectInactivePublishedChild(
            req,
            { PricelistData },
            PricelistItemData
        );
    });

    this.before(['CREATE', 'PATCH', 'UPDATE', 'DELETE'], ProductPriceList, async (req) => {
        return versionService.rejectInactivePublishedChild(
            req,
            { PricelistData },
            ProductPriceList
        );
    });

    this.before('DELETE', PricelistData, async (req) => {
        const ID = req.params?.[0]?.ID;
        const IsActiveEntity = req.params?.[0]?.IsActiveEntity;

        if (!ID) return;

        await DELETE.from(ProductPriceList).where({ pricelist_ID: ID });

        // Only log when deleting the active (non-draft) record
        if (!IsActiveEntity) return;

        try {
            const record = await SELECT.one(PricelistData)
                .where({ ID })
                .columns('PricelistTitle');

            req._headerLog = { id: ID, title: record?.PricelistTitle };
        } catch (e) {
            console.error('[logHeaderDelete] failed to stash log data:', e.message);
        }
    });

    this.after('DELETE', PricelistData, async (result, req) => {
        if (!req._headerLog) return;

        try {
            const { id, title } = req._headerLog;

            await cds.run(
                INSERT.into('com.sap.pricelistsystem.PricelistChangeLog').entries({
                    ID: cds.utils.uuid(),
                    changedAt: new Date(),
                    changedBy: req.user?.id || 'unknown',
                    source: 'Header',
                    refId: id,
                    changeType: 'DELETE',
                    field: '*',
                    oldValue: title ?? id,
                    newValue: undefined
                })
            );

            console.log('[logHeaderDelete] log written for', id);
        } catch (e) {
            console.error('[logHeaderDelete] INSERT failed:', JSON.stringify(e, null, 2));
            console.error('[logHeaderDelete] stack:', e.stack);
        }
    });

    this.before('SAVE', PricelistData, async (req) => {
        const saveLog = await versionService.handlePricelistSave(
            req,
            {
                PricelistData,
                PricelistItemData,
                ProductPriceList
            }
        );

        if (saveLog) {
            req._headerSaveLog = saveLog;
        }

        req.on("succeeded",async () => {
            const eventIds = req._publicationNotificationEventIds || [];

            if (!eventIds.length) {
                return;
            }

            try {
                await notificationService.deliverPendingNotifications({service: this,eventIds});
            } catch (notificationError) {
                console.error("[PricelistPublish] Notification delivery failed:",notificationError);
            }
        });
    });

    this.after('SAVE', PricelistData, async (result, req) => {
        if (!req._headerSaveLog) return;

        const { id, isCreate, oldData, newData } = req._headerSaveLog;
        const changeType = isCreate ? 'CREATE' : 'UPDATE';
        const isPublication = newData.Status === "Published" && oldData.Status !== "Published";

        try {
            const entries = [];
            const now = new Date();
            const changedBy = req.user?.id || 'unknown';

            for (const field of HEADER_TRACKED_FIELDS) {
                const oldVal = oldData[field];
                const newVal = newData[field];

                // For UPDATE: skip unchanged fields
                if (!isCreate && String(oldVal ?? '') === String(newVal ?? '')) continue;

                // For CREATE: skip fields that were never set
                if (isCreate && newVal === undefined) continue;

                const isLargeTextField = LARGE_TEXT_FIELD_SET.has(field);

                entries.push({
                    ID: cds.utils.uuid(),
                    changedAt: now,
                    changedBy,
                    source: 'Header',
                    refId: id,
                    changeType,
                    field,
                    oldValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : (isCreate ? undefined : String(oldVal ?? '')),
                    newValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : String(newVal ?? '')
                });
            }

            if (entries.length === 0) {
                console.log('[logHeaderSave] no changes detected, skipping log');
                // return;
            }else{
                try{
                    // Batch insert all changed fields in one query
                    await cds.run(INSERT.into("com.sap.pricelistsystem.PricelistChangeLog").entries(entries));

                    console.log(`[logHeaderSave] ${entries.length} ${changeType} change(s) logged for ${id}`);
                }catch(e1){
                    console.error('[logHeaderSave] INSERT failed:',JSON.stringify(e1, null, 2));
                    console.error('[logHeaderSave] stack:',e1.stack);
                }
            }


            if (isPublication) {
                const publicationEvents = await notificationService.createPublishedNotifications({service: this,req,pricelistId: id});

                req._publicationNotificationEventIds = publicationEvents.map((event) => event.ID);
            }
        } catch (e) {
            console.error("[PricelistSave] Header logging or publication notification generation failed:",JSON.stringify(e,null,2));
            console.error("[PricelistSave] stack:",e.stack);
        }
    });

    // // Handler upon create of Pricing Parameters
    // this.before('CREATE', PricingParameters, async (req) => {
    //     const extdb = cds.transaction(req);

    //     // Get pricing parameters dynamically
    //     const pricingCondType = await extdb.run(
    //         SELECT.one.from(PricingCondType).where({
    //             ErpPricingAccessSequence: req.data.ErpPricingAccessSequence
    //         })
    //     );

    //     if (pricingCondType) {
    //         req.data.SequenceDescription = pricingCondType.SequenceDescription;
    //         req.data.TechnicalFilter = pricingCondType.TechnicalFilter;
    //     }
    // });

    this.before("getPricelistChangeComparison",ensureApplicationLogInternalAdmin);

    this.on("getPricelistChangeComparison", async req => {
        return buildVersionHistoryComparison(this,req);
    });

    this.on("retryPricelistNotificationDeliveries",async (req) => {
        const maximumAttempts = Number(req.data.maximumAttempts || 3);
        const tx = cds.tx(req);

        const failedDeliveries = await tx.run(
            SELECT.from(PricelistNotificationDelivery)
            .columns("ID","NotificationEvent_ID")
            .where([
                {
                    ref: [
                        "DeliveryStatus"
                    ]
                },
                "=",
                {
                    val: "FAILED"
                },
                "and",
                {
                    ref: [
                        "DeliveryAttempts"
                    ]
                },
                "<",
                {
                    val: maximumAttempts
                }
            ])
        );

        if (!failedDeliveries.length) {
            return {selected: 0,sent: 0,failed: 0};
        }

        const deliveryIds = failedDeliveries.map((delivery) => delivery.ID);

        const eventIds = [...new Set(failedDeliveries.map((delivery) => delivery.NotificationEvent_ID))];

        await tx.run(
            UPDATE(PricelistNotificationDelivery)
            .set({
                DeliveryStatus:"PENDING"
            })
            .where({
                ID: {
                    in: deliveryIds
                }
            })
        );

        await tx.commit();

        await notificationService.deliverPendingNotifications({service: this,eventIds});

        const resultTx = cds.tx();

        try {
            const refreshedDeliveries = await resultTx.run(
                SELECT.from(PricelistNotificationDelivery)
                    .columns("DeliveryStatus")
                    .where({
                        ID: {
                            in: deliveryIds
                        }
                    })
            );

            await resultTx.commit();

            return {
                selected: refreshedDeliveries.length,
                sent: refreshedDeliveries.filter((delivery) => delivery.DeliveryStatus === "SENT").length,
                failed: refreshedDeliveries.filter((delivery) => delivery.DeliveryStatus === "FAILED").length
            };
        } catch (error) {
            await resultTx.rollback();
            throw error;
        }
    });

    //Rebuild of Tree Table for Pircelist Table Maintenance
    this.before(["CREATE", "UPDATE"], PricelistItemData, async (req) => {
        const d = req.data;
        normalize(d);

        if (!d.pricelist_ID && d.pricelist && d.pricelist.ID) {
            d.pricelist_ID = d.pricelist.ID;
        }

        if (!d.pricelist_ID && req.params && req.params.length) {
            const p = req.params[0];
            if (p && p.ID) d.pricelist_ID = p.ID;
        }

        // Only do hierarchy logic if hierarchy fields changed OR create
        const touchedHierarchy = req.event === "CREATE" || H_FIELDS.some(f => f in d);
        if (!touchedHierarchy)
            return;

        validateNoGaps(d);

        // Must have pricelist_ID for lookups (create under a Pricelist)
        if (!d.pricelist_ID && req.event === "CREATE") {
            // If created via navigation, CAP usually provides pricelist_ID automatically.
            // If not, you need it in request.
            throw cds.error("Missing pricelist_ID for item creation", { code: "NO_PRICELIST" });
        }

        const tx = cds.tx(req);
        d.parent_ID = await resolveParentId(tx, d);

        // If not root and parent not found -> inconsistent data
        const level = computeLevel(d);
        if (level > 1 && !d.parent_ID) {
            d.parent_ID = null;
        }
    });

    //For HANA DB Tables generated directly in HANA Cloud
    this.on('READ', 'ExternalMaterials', async (req) => {
        const extdb = await cds.connect.to('extdb');
        const rows = await extdb.run(
            'SELECT * FROM "SAPECC"."T_MATERIAL_MASTER_DATA"'
        )
        return rows
    });

    this.on('READ', 'ExternalCustomers', async (req) => {
        const extdb = await cds.connect.to('extdb');
        const rows = await extdb.run(
            'SELECT * FROM "SAPECC"."T_CUSTOMER_MASTER_DATA"'
        )
        return rows
    });

    this.on('READ', 'ExternalPricelist', async (req) => {
        const extdb = await cds.connect.to('extdb');
        const rows = await extdb.run(
            'SELECT * FROM "SAPECC"."T_PRICELIST_MASTER_DATA"'
        )
        return rows
    });

    //Logic for getting the Pricelist Data from different DB tables
    this.on('READ', 'ResolvedPricelistItem', async (req) => {
        const extdb = await cds.connect.to('extdb');
        const db = cds.transaction(req);

        // Extract filters from query
        const filters = {};
        if (req.query.SELECT.where) {
            req.query.SELECT.where.forEach((w, idx, arr) => {
                if (w.ref && w.ref[0]) {
                    const next = arr[idx + 2]; // pattern: ref, '=', val
                    if (next && next.val !== undefined) {
                        const val = String(next.val).trim();
                        if (val !== "") {
                            filters[w.ref[0]] = val; // only keep non-empty values
                        }
                    }
                }
            });
        }
        console.log('>>> Filters:', filters);

        const resolvedItems = await resolveItems(filters, db, extdb);
        return resolvedItems;
    });

    // Custom logic to get product tree data
    this.on('READ', 'ProductPricelistTree', async (req) => {

        // function extractWhereValue(whereArr, fieldName) {
        //     if (!whereArr) return null;
        //     for (let i = 0; i < whereArr.length; i++) {
        //         const token = whereArr[i];
        //         // CDS where tokens: { ref: ['FieldName'] } followed by '=' then { val: 'value' }
        //         if (token?.ref?.[0] === fieldName && whereArr[i + 1] === '=' && whereArr[i + 2]?.val !== undefined) {
        //             return whereArr[i + 2].val;
        //         }
        //     }
        //     return null;
        // }

        // const db = cds.transaction(req);
        // const extdb = await cds.connect.to('extdb');

        // // 1. Get main data from item structure
        // let localQueryItemStrComp = SELECT.from('PricelistItemStructureComponents');
        // if (req.query.SELECT.where) {
        //     localQueryItemStrComp.where(req.query.SELECT.where);
        //     localQueryItemStrComp.orderBy({ Sequence: 'asc' });
        // }

        // const results = await db.run(localQueryItemStrComp);
        // // console.table(results, ["MainCategory", "SubCategory1", "SubCategory2", "SubCategory3", "SubCategory4", "SubCategory5", "SalesOrg", "DistChannel", "DeliveringPlant", "Sequence"]);

        // if (!results || results.length === 0) {
        //     return [];
        // }

        // // 2. Build Dynamic WHERE clause
        // const whereClause = req.query.SELECT.where || [];
        // const headerSalesOrg = extractWhereValue(whereClause, 'SalesOrg') ?? results.find(r => r.SalesOrg)?.SalesOrg ?? null;
        // const headerDistChannel = extractWhereValue(whereClause, 'DistChannel') ?? results.find(r => r.DistChannel)?.DistChannel ?? null;
        // const headerDeliveringPlant = extractWhereValue(whereClause, 'DeliveringPlant') ?? results.find(r => r.DeliveringPlant)?.DeliveringPlant ?? null;

        // const headerCustPriceList = extractWhereValue(whereClause, 'CustPriceList') ?? results.find(r => r.CustPriceList)?.CustPriceList ?? null;
        // const headerErpCustomer = extractWhereValue(whereClause, 'ErpCustomer') ?? results.find(r => r.ErpCustomer)?.ErpCustomer ?? null;
        // let orConditions = [];

        // results.forEach(row => {
        //     let andConditions = [];
        //     const addCondition = (dbField, val) => {
        //         if (val) {
        //             const safeVal = String(val).replace(/'/g, "''");
        //             andConditions.push(`"${dbField}" = '${safeVal}'`);
        //         } else {
        //             andConditions.push(`COALESCE("${dbField}", '') = ''`);
        //         }
        //     };

        //     addCondition('MAIN_CATEGORY', row.MainCategory);
        //     addCondition('SUBCATEGORY_1', row.SubCategory1);
        //     addCondition('SUBCATEGORY_2', row.SubCategory2);
        //     addCondition('SUBCATEGORY_3', row.SubCategory3);
        //     addCondition('SUBCATEGORY_4', row.SubCategory4);
        //     addCondition('SUBCATEGORY_5', row.SubCategory5);

        //     if (headerSalesOrg) {
        //         andConditions.push(`"SALES_ORGANIZATION" = '${String(headerSalesOrg).replace(/'/g, "''")}'`);
        //     }
        //     if (headerDistChannel) {
        //         andConditions.push(`"DISTRIBUTION_CHANNEL" = '${String(headerDistChannel).replace(/'/g, "''")}'`);
        //     }
        //     if (headerDeliveringPlant) {
        //         const pricePlant = String(headerDeliveringPlant).replace(/'/g, "''");
        //         andConditions.push(`("PLANT" = '${pricePlant}' OR "PLANT" = '*')`);
        //     }
        //     orConditions.push(`(${andConditions.join(' AND ')})`);
        // });
        // // console.log(">>> Dynamic WHERE for External DB:", orConditions.join(' OR '));


        // // 3. Get material master from external DB
        // const extQuery = `WITH ranked AS (SELECT *, ROW_NUMBER() OVER ( PARTITION BY "MATERIAL_KEY", "SALES_ORGANIZATION", "DISTRIBUTION_CHANNEL"
        //         ORDER BY SUBSTRING("CREATED_AT", 1, 19) DESC) AS rn FROM "SAPECC"."T_MATERIAL_MASTER_DATA" WHERE ${orConditions.join(' OR ')})
        //         SELECT * FROM ranked WHERE rn = 1`;
        // const materialsMaster = await extdb.run(extQuery);
        // // console.table(materialsMaster, ["MAIN_CATEGORY", "SUBCATEGORY_1", "SUBCATEGORY_2", "SUBCATEGORY_3", "SUBCATEGORY_4", "SUBCATEGORY_5", "MATERIAL_KEY", "MATERIAL", "CREATED_AT"]);

        // // 3.1 Get part number determination data from external DB based on material master results and header filters (SalesOrg, DistChannel)
        // // const targetFields = ['SalesOrg', 'DistChannel', 'PricelistType', 'MarketScopeRegion', 'MarketScopeCountry'];
        // const targetFields = ['SalesOrg', 'DistChannel'];
        // let partNumberDeterminationWhere = {};
        // let partNumberDeterminationMap = new Map();

        // targetFields.forEach(field => {
        //     const val = extractWhereValue(req.query.SELECT.where, field);
        //     if (val) {
        //         partNumberDeterminationWhere[field] = val;
        //     }
        // });

        // const materialIds = materialsMaster.map(m => m.MATERIAL);
        // if (materialIds.length > 0) {
        //     partNumberDeterminationWhere.ProductID = { 'in': materialIds };
        // }

        // const localQueryPartNumberDet = SELECT.from('PricelistPartNumberDetermination').where(partNumberDeterminationWhere);
        // const partNumberResults = await db.run(localQueryPartNumberDet);
        // partNumberResults.forEach(row => {
        //     if (!partNumberDeterminationMap.has(row.ProductID)) {
        //         partNumberDeterminationMap.set(row.ProductID, []);
        //     }

        //     partNumberDeterminationMap.get(row.ProductID).push({
        //         ProductStatus: row.ProductStatus,
        //         StatusValidity: row.StatusValidity,
        //         // Supplier: row.Supplier,         
        //         // SupplierSKU: row.SupplierSKU   
        //     });
        // });
        // // console.table(partNumberResults, ["ProductID", "SalesOrg", "DistChannel", "PricelistType", "MarketScopeRegion", "MarketScopeCountry", "ProductStatus", "StatusValidity"]);
        // // console.log('>>> Part Number Determination Map:', partNumberDeterminationMap);

        // // 4. Get pricing parameters
        // let localQueryPricingParam = SELECT.from('PricingParameterDetermination');
        // if (req.query.SELECT.where) {
        //     localQueryPricingParam.where(req.query.SELECT.where);
        //     localQueryPricingParam.orderBy({ createdAt: 'desc' });

        // }
        // const resultsPricing = await db.run(localQueryPricingParam);


        // // 5. Prepare result (Flatten Data & Inner Join Logic)
        // const finalFlatResults = [];
        // results.forEach(row => {
        //     const matchingProducts = materialsMaster.filter(mat =>
        //         (mat.MAIN_CATEGORY || null) === (row.MainCategory || null) &&
        //         (mat.SUBCATEGORY_1 || null) === (row.SubCategory1 || null) &&
        //         (mat.SUBCATEGORY_2 || null) === (row.SubCategory2 || null) &&
        //         (mat.SUBCATEGORY_3 || null) === (row.SubCategory3 || null) &&
        //         (mat.SUBCATEGORY_4 || null) === (row.SubCategory4 || null) &&
        //         (mat.SUBCATEGORY_5 || null) === (row.SubCategory5 || null)
        //     );
        //     matchingProducts.forEach(mat => {
        //         finalFlatResults.push({
        //             ...row,
        //             MaterialKey: mat.MATERIAL_KEY,
        //             Material: mat.MATERIAL,
        //             MaterialDescription: mat.MATERIAL_DESCRIPTION
        //         });
        //     });
        // });


        // // 6. Collect all unique (AccessSequence + ConditionType + DiscountConditionType)  from resultsPricing
        // const activeSequences = [];
        // const seenCombos = new Set();
        // const materialKeys = [...new Set(materialsMaster.map(mat => mat.MATERIAL).filter(Boolean))];

        // if (resultsPricing && resultsPricing.length > 0) {
        //     for (const p of resultsPricing) {
        //         // Scan both ConditionType slots and DiscountConditionType slots
        //         const slotPrefixes = [
        //             { seqKey: 'AccessSequence', condKey: 'ConditionType', prioKey: 'Priority', isDiscount: false },
        //             { seqKey: 'DiscountAccessSequence', condKey: 'DiscountConditionType', prioKey: 'DiscountPriority', isDiscount: true }
        //         ];
        //         for (const { seqKey, condKey, prioKey, isDiscount } of slotPrefixes) {
        //             for (let i = 1; i <= 10; i++) {
        //                 const seq = p[`${seqKey}${i}`];
        //                 const cond = p[`${condKey}${i}`];
        //                 if (!seq || !cond) continue;

        //                 const comboKey = `${seq}::${cond}`;
        //                 if (seenCombos.has(comboKey)) continue;
        //                 seenCombos.add(comboKey);

        //                 activeSequences.push({
        //                     accessSequence: seq,
        //                     conditionType: cond,
        //                     priority: parseInt(p[`${prioKey}${i}`] || i),
        //                     salesOrg: p.SalesOrg || null,
        //                     distChannel: p.DistChannel || null,
        //                     isDiscount: isDiscount
        //                 });
        //             }
        //         }
        //     }
        // }
        // // console.log('>>> Active Access Sequences & Condition Types:', activeSequences);

        // // 7. Get available columns in T_PRICELIST_MASTER_DATA to ensure we only query existing ones in dynamic SQL
        // //    Create dynamic UNION ALL query to fetch prices based on active access sequences
        // const colQuery = `SELECT COLUMN_NAME FROM SYS.TABLE_COLUMNS WHERE SCHEMA_NAME = 'SAPECC' AND TABLE_NAME = 'T_PRICELIST_MASTER_DATA' ORDER BY POSITION`;
        // const colRows = await extdb.run(colQuery);
        // const availableCols = new Set(colRows.map(r => r.COLUMN_NAME));

        // const safe = v => String(v).replace(/'/g, "''");

        // // const unionParts = activeSequences.map(combo => {
        // //     const px = combo.accessSequence;
        // //     const col = suffix => `"${px}_${suffix}"`;
        // //     const has = suffix => availableCols.has(`${px}_${suffix}`);

        // //     if (!has('MATERIAL') || !has('CONDITION_TYPE')) return null;

        // //     const whereConditions = [];
        // //     const matList = materialKeys.map(m => `'${safe(m)}'`).join(', ');

        // //     whereConditions.push(`${col('MATERIAL')} IN (${matList})`);
        // //     whereConditions.push(`${col('CONDITION_TYPE')} = '${safe(combo.conditionType)}'`);

        // //     if (has('SALES_ORGANIZATION') && combo.salesOrg) {
        // //         whereConditions.push(`${col('SALES_ORGANIZATION')} = '${safe(combo.salesOrg)}'`);
        // //     }

        // //     if (has('DISTRIBUTION_CHANNEL') && combo.distChannel) {
        // //         whereConditions.push(`${col('DISTRIBUTION_CHANNEL')} = '${safe(combo.distChannel)}'`);
        // //     }

        // //     if (has('VALID_FROM_DATE')) {
        // //         whereConditions.push(`${col('VALID_FROM_DATE')} IS NOT NULL`);
        // //         whereConditions.push(`${col('VALID_FROM_DATE')} <> ''`);
        // //         whereConditions.push(
        // //             `TO_DATE(${col('VALID_FROM_DATE')}, 'MM/DD/YY') <= CURRENT_DATE`
        // //         );
        // //     }

        // //     if (has('VALID_TO_DATE')) {
        // //         whereConditions.push(`${col('VALID_TO_DATE')} IS NOT NULL`);
        // //         whereConditions.push(`${col('VALID_TO_DATE')} <> ''`);
        // //         whereConditions.push(
        // //             `TO_DATE(${col('VALID_TO_DATE')}, 'MM/DD/YY') >= CURRENT_DATE`
        // //         );
        // //     }

        // //     const alreadyMapped = new Set(['MATERIAL', 'CONDITION_TYPE', 'VALID_FROM_DATE', 'VALID_TO_DATE']);
        // //     const extraCols = [...availableCols]
        // //         .filter(c => c.startsWith(`${px}_`) && !alreadyMapped.has(c.replace(`${px}_`, '')))
        // //         .map(c => `${col(c.replace(`${px}_`, ''))} AS "${c.replace(`${px}_`, '')}"`)
        // //         .join(',\n    ');            

        // //     return `SELECT 
        // //             '${px}' AS "ACCESS_SEQUENCE",
        // //             ${combo.priority} AS "PRIORITY",
        // //             ${col('MATERIAL')} AS "MATERIAL",
        // //             ${col('CONDITION_TYPE')} AS "CONDITION_TYPE",
        // //             "KONP_RATE" AS "PRICE",
        // //             "KONP_RATE_UNIT" AS "PRICE_UNIT",
        // //             ${has('VALID_FROM_DATE') ? col('VALID_FROM_DATE') : 'NULL'} AS "VALID_FROM",
        // //             ${has('VALID_TO_DATE') ? col('VALID_TO_DATE') : 'NULL'} AS "VALID_TO"
        // //             ${extraCols ? ',\n    ' + extraCols : ''}
        // //         FROM "SAPECC"."T_PRICELIST_MASTER_DATA"
        // //         WHERE ${whereConditions.join(' AND ')}`;
        // // }).filter(Boolean);

        // const alreadyMapped = new Set(['MATERIAL', 'CONDITION_TYPE', 'VALID_FROM_DATE', 'VALID_TO_DATE']);

        // // First pass: collect ALL unique extra suffixes across ALL sequences
        // const allExtraSuffixes = new Set();
        // activeSequences.forEach(combo => {
        //     [...availableCols]
        //         .filter(c => c.startsWith(`${combo.accessSequence}_`))
        //         .forEach(c => {
        //             const suffix = c.replace(`${combo.accessSequence}_`, '');
        //             if (!alreadyMapped.has(suffix)) allExtraSuffixes.add(suffix);
        //         });
        // });
        // const extraSuffixList = [...allExtraSuffixes];

        // // Second pass: build union parts
        // const unionParts = activeSequences.map(combo => {
        //     const px = combo.accessSequence;
        //     const col = suffix => `"${px}_${suffix}"`;
        //     const has = suffix => availableCols.has(`${px}_${suffix}`);

        //     // Skip this access sequence if required columns do not exist
        //     if (!has('MATERIAL') || !has('CONDITION_TYPE')) {
        //         return null;
        //     }

        //     // Skip if no materials to query
        //     if (!materialKeys || materialKeys.length === 0) {
        //         return null;
        //     }

        //     const whereConditions = [];

        //     const matList = materialKeys
        //         .map(m => `'${safe(m)}'`)
        //         .join(', ');

        //     whereConditions.push(`${col('MATERIAL')} IN (${matList})`);
        //     whereConditions.push(`${col('CONDITION_TYPE')} = '${safe(combo.conditionType)}'`);

        //     if (has('SALES_ORGANIZATION') && combo.salesOrg) {
        //         whereConditions.push(`${col('SALES_ORGANIZATION')} = '${safe(combo.salesOrg)}'`);
        //     }

        //     if (has('DISTRIBUTION_CHANNEL') && combo.distChannel) {
        //         whereConditions.push(`${col('DISTRIBUTION_CHANNEL')} = '${safe(combo.distChannel)}'`);
        //     }

        //     const validFromCol = has('VALID_FROM_DATE')
        //         ? col('VALID_FROM_DATE')
        //         : 'CAST(NULL AS NVARCHAR(50))';

        //     const validToCol = has('VALID_TO_DATE')
        //         ? col('VALID_TO_DATE')
        //         : 'CAST(NULL AS NVARCHAR(50))';

        //     const extraCols = extraSuffixList
        //         .map(suffix => has(suffix) ? `${col(suffix)} AS "${suffix}"` : `NULL AS "${suffix}"`)
        //         .join(',\n    ');

        //     return `SELECT
        //         '${safe(px)}' AS "ACCESS_SEQUENCE",
        //         ${Number(combo.priority || 999)} AS "PRIORITY",
        //         ${col('MATERIAL')} AS "MATERIAL",
        //         ${col('CONDITION_TYPE')} AS "CONDITION_TYPE",
        //         "KONP_RATE" AS "PRICE",
        //         "KONP_RATE_UNIT" AS "PRICE_UNIT",
        //         ${validFromCol} AS "VALID_FROM",
        //         ${validToCol} AS "VALID_TO"
        //         ${extraCols ? ',\n    ' + extraCols : ''}
        //     FROM "SAPECC"."T_PRICELIST_MASTER_DATA"
        //     WHERE ${whereConditions.join(' AND ')}`;

        // }).filter(Boolean);

        // let priceRecords = [];
        // if (unionParts.length > 0) {
        //     const priceQuery = unionParts.join(' UNION ALL ');
        //     priceRecords = await extdb.run(priceQuery);
        // }

        // // console.table(priceRecords, ["ACCESS_SEQUENCE", "PRIORITY", "MATERIAL", "CONDITION_TYPE", "PRICE", "PRICE_UNIT", "VALID_FROM", "VALID_TO", ...extraSuffixList]);

        // // 8. Separate price records into price vs discount maps based on condition type
        // const priceByMaterial = new Map();
        // const discountByMaterial = new Map();

        // const discountCondTypes = new Set(
        //     activeSequences
        //         .filter(s => { return s.isDiscount === true; })
        //         .map(s => s.conditionType)
        // );

        // // Build combo lookup map for easy access inside forEach
        // const comboMap = new Map(activeSequences.map(c => [c.accessSequence, c]));

        // // Define extra filter conditions per access sequence
        // // Return true = pass (allow push), false = skip
        // const accessSequenceFilters = {
        //     'A916': (rec) => rec.PRICELIST_TYPE === headerCustPriceList,
        //     'A305': (rec) => rec.SOLDTO === headerErpCustomer,
        // };

        // priceRecords.forEach(rec => {
        //     const mat = rec.MATERIAL;
        //     const combo = comboMap.get(rec.ACCESS_SEQUENCE);
        //     const filterFn = accessSequenceFilters[rec.ACCESS_SEQUENCE];

        //     if (filterFn && combo && !filterFn(rec, combo)) return;

        //     if (discountCondTypes.has(rec.CONDITION_TYPE)) {
        //         if (!discountByMaterial.has(mat)) discountByMaterial.set(mat, []);
        //         discountByMaterial.get(mat).push(rec);
        //     } else {
        //         if (!priceByMaterial.has(mat)) priceByMaterial.set(mat, []);
        //         // console.log('>>> Adding price record for material', mat, 'with access sequence', rec.ACCESS_SEQUENCE);
        //         priceByMaterial.get(mat).push(rec);
        //     }
        // });
        // // console.table(priceRecords, ["ACCESS_SEQUENCE", "PRIORITY", "MATERIAL", "CONDITION_TYPE", "PRICE", "PRICE_UNIT", "VALID_FROM", "VALID_TO", ...extraSuffixList]);

        // // 9. Get discount condition types for value help (if needed in frontend)
        // const discountConditionQuery = 'SELECT DISTINCT CODE FROM "SAPECC"."ERP_DISCOUNTCONDTYPE"';
        // const discountConditionEntries = await extdb.run(discountConditionQuery);
        // // console.log('>>> Discount Condition Types Entries:', discountConditionEntries);

        // // 10. Populate Final output with price details based on material matches and access sequence priority
        // finalFlatResults.forEach(row => {
        //     const matPrices = priceByMaterial.get(row.Material) || [];
        //     if (matPrices.length > 0) {
        //         matPrices.sort((a, b) => a.PRIORITY - b.PRIORITY);

        //         const highPriorityMatch = matPrices[0];
        //         row.Price = highPriorityMatch.PRICE || null;
        //         row.PriceUnit = highPriorityMatch.PRICE_UNIT || null;
        //         row.PriceValidFrom = highPriorityMatch.VALID_FROM || null;
        //         row.PriceValidTo = highPriorityMatch.VALID_TO || null;
        //         row.AccessSequence = highPriorityMatch.ACCESS_SEQUENCE || null;
        //         row.ConditionType = highPriorityMatch.CONDITION_TYPE || null;
        //     }

        //     const matDiscounts = discountByMaterial.get(row.Material) || [];
        //     if (matDiscounts.length > 0) {
        //         matDiscounts.sort((a, b) => a.PRIORITY - b.PRIORITY);
        //         const highPriorityDiscount = matDiscounts[0];
        //         row.DiscountRate = highPriorityDiscount.PRICE || null;
        //         row.DiscountEffectiveDate = highPriorityDiscount.VALID_FROM || null;
        //         row.DiscountConditionType = highPriorityDiscount.CONDITION_TYPE || null;
        //         row.DiscountAccessSequence = highPriorityDiscount.ACCESS_SEQUENCE || null;
        //     }

        //     const partNumberDet = partNumberDeterminationMap.get(row.Material) || [];
        //     if (partNumberDet.length > 0) {
        //         const partNumberEntry = partNumberDet[0];
        //         row.Status = partNumberEntry.ProductStatus || null;
        //         row.StatusValidFromDate = partNumberEntry.StatusValidity || null;
        //         row.StatusValidToDate = partNumberEntry.StatusValidity || null;
        //         row.Supplier = partNumberEntry.Supplier || null;
        //         row.SupplierSKU = partNumberEntry.SupplierSKU || null;
        //     }
        // });
        // // console.log('>>> Final Flat Results before Sorting:', finalFlatResults);


        // // 12. Sort result by hierarchy levels (nulls first and then alphabetically)
        // const sortByFields = ["MainCategory", "SubCategory1", "SubCategory2", "SubCategory3", "SubCategory4", "SubCategory5"];
        // const sortedResults = finalFlatResults
        //     .filter(row => row.Price != null)
        //     .sort((a, b) => {
        //         for (const field of sortByFields) {
        //             const valA = a[field];
        //             const valB = b[field];
        //             if (valA === null && valB !== null) return -1;
        //             if (valA !== null && valB === null) return 1;
        //             if (valA !== valB) return (valA || '').localeCompare(valB || '');
        //         }
        //         return 0;
        //     });
        // return sortedResults;
    });

    this.on('getProductTreeData', async (req) => {
        let headerData;
        try {
            headerData = JSON.parse(req.data.headerData);
        } catch (e) {
            return req.error(400, "Invalid headerData format");
        }

        const {
            EffectiveDate, PricelistType, MarketScopeRegion, MarketScopeCountry,
            SalesOrg, DistChannel, CustPriceList, CustGroup1, ErpCustomer,
            DeliveringPlant, PublishedDate, CustomerNumber, ExistingProduct
        } = headerData;


        // Only material
        // headerData.include = { price: false, future: false, discount: false };

        // material + price + future
        // headerData.include = { price: true, future: true, discount: false };

        // material + price + discount + future (= default)
        // headerData.include = { price: true, future: true, discount: true };
        const include = { price: true, future: true, discount: true, ...(headerData.include || {}) };

        const db = cds.transaction(req);
        const extdb = await cds.connect.to('extdb');

        // ── shared helpers ─────────────────────────────────────
        const escapeSql = (val) => String(val).replace(/'/g, "''");
        const resolvePlantFromHeader = async () => {
            const directPlant = String(DeliveringPlant || "").trim();

            if (directPlant && directPlant !== "*") {
                return directPlant;
            }

            const salesOrg = String(SalesOrg || "").trim();
            if (!salesOrg) return null;

            const rows = await extdb.run(`
                SELECT TOP 1 "PLANT"
                FROM "SAPECC"."ERP_SALES_ORG"
                WHERE "CODE" = '${escapeSql(salesOrg)}'
                AND "PLANT" IS NOT NULL
                AND "PLANT" <> ''
                AND "PLANT" <> '*'
            `);

            return rows?.[0]?.PLANT || null;
        };
        const parseRecordDate = (sDate) => {
            if (!sDate) return null;
            const d = new Date(sDate);
            return isNaN(d.getTime()) ? null : d;
        };
        const pickBestByDate = (records, targetDate) => {
            if (!records.length) return null;
            const sorted = [...records].sort((a, b) => a.PRIORITY - b.PRIORITY);
            if (!targetDate) return sorted[0];
            return sorted.find(rec => {
                const from = parseRecordDate(rec.VALID_FROM);
                const to = parseRecordDate(rec.VALID_TO);
                return from && to && targetDate >= from && targetDate <= to;
            }) || null;
        };

        const CATEGORY_PATH_FIELDS = ["MainCategory", "SubCategory1", "SubCategory2", "SubCategory3", "SubCategory4", "SubCategory5"];
        const CATEGORY_FIELDS = [
            ['MAIN_CATEGORY', 'MainCategory'], ['SUBCATEGORY_1', 'SubCategory1'],
            ['SUBCATEGORY_2', 'SubCategory2'], ['SUBCATEGORY_3', 'SubCategory3'],
            ['SUBCATEGORY_4', 'SubCategory4'], ['SUBCATEGORY_5', 'SubCategory5']
        ];
        const getCategoryKey = (obj, fieldMap) =>
            fieldMap.map(([matField, rowField]) => obj[matField] ?? obj[rowField] ?? '').join('|');

        const PART_NUMBER_TERMS_APPLICABILITY_FIELDS = [
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "SalesOrg",
            "DistChannel",
            "CustPriceList",
            "CustGroup1",
            "ErpCustomer",
            "DeliveringPlant"
        ];

        const normalizePartNumberTermsValue = value => value === undefined || value === null ? "" : String(value).trim();

        const isPartNumberTermsWildcard = value => {
            const normalizedValue = normalizePartNumberTermsValue(value);
            return normalizedValue === "" || normalizedValue === "*";
        };

        const partNumberTermsContext = {
            PricelistType,
            MarketScopeRegion,
            MarketScopeCountry,
            SalesOrg,
            DistChannel,
            CustPriceList,
            CustGroup1,
            ErpCustomer,
            DeliveringPlant
        };

        const getPartNumberTermsSpecificity = header => {
            return PART_NUMBER_TERMS_APPLICABILITY_FIELDS
                .reduce((score, field) => {
                    const maintainedValue = normalizePartNumberTermsValue(header[field]);
                    const contextValue = normalizePartNumberTermsValue(partNumberTermsContext[field]);

                    const isExactMatch = maintainedValue !== "" && maintainedValue !== "*" && maintainedValue === contextValue;

                    return score + (isExactMatch ? 1 : 0);
                }, 0);
        };

        const sortPartNumberTermsHeaders = headers => {
            return [...headers].sort((left, right) => {
                const specificityDifference = getPartNumberTermsSpecificity(right) - getPartNumberTermsSpecificity(left);

                if (specificityDifference !== 0) {
                    return specificityDifference;
                }

                const rightModifiedAt = right.modifiedAt ? new Date(right.modifiedAt).getTime() : 0;
                const leftModifiedAt = left.modifiedAt ? new Date(left.modifiedAt).getTime() : 0;

                if (rightModifiedAt !== leftModifiedAt) {
                    return rightModifiedAt - leftModifiedAt;
                }

                return String(left.ID || "").localeCompare(String(right.ID || ""));
            });
        };

        const loadApplicablePartNumberTerms = async () => {
            const allHeaders = await db.run(
                SELECT.from(TermsAndConditions)
            );

            const applicableHeadersunSorted = allHeaders.filter(header => {
                    return PART_NUMBER_TERMS_APPLICABILITY_FIELDS.every(field => {
                        const maintainedValue = normalizePartNumberTermsValue(header[field]);
                        const contextValue = normalizePartNumberTermsValue(partNumberTermsContext[field]);

                        return (maintainedValue === "" || maintainedValue === "*" || maintainedValue === contextValue);
                    });
                });

            const applicableHeaders = sortPartNumberTermsHeaders(applicableHeadersunSorted);

            if (!applicableHeaders.length) {
                return [];
            }

            const headerIds = applicableHeaders.map(header => header.ID).filter(Boolean);

            if (!headerIds.length) {
                return [];
            }

            const childWhere = [
                { ref: ["parent_ID"] },
                "in",
                {
                    list: headerIds.map(ID => ({
                        val: ID
                    }))
                }
            ];

            const partNumberRows = await db.run(
                SELECT
                    .from(TermsAndConditionPartNumbers)
                    .where(childWhere)
            );

            const headerRankById = new Map(applicableHeaders.map((header, index) => [String(header.ID),index]));

            return partNumberRows
                .map(row => ({
                    ...row,
                    _headerRank:
                        headerRankById.get(String(row.parent_ID)) ?? Number.MAX_SAFE_INTEGER}))
                .sort((left, right) =>
                    left._headerRank - right._headerRank
                );
        };

        const mergePartNumberTerms = async rows => {
            if (!Array.isArray(rows) || rows.length === 0) {
                return;
            }

            const partNumberTerms = await loadApplicablePartNumberTerms();

            if (!partNumberTerms.length) {
                return;
            }

            const termsByProductId = new Map();

            for (const item of partNumberTerms) {
                const productId = normalizePartNumberTermsValue(item.ProductID);

                const partNumberTermsValue = normalizePartNumberTermsValue(item.PartNumberTermsandConditions);

                if (!productId || !partNumberTermsValue) {
                    continue;
                }

                if (!termsByProductId.has(productId)) {
                    termsByProductId.set(productId,partNumberTermsValue);
                }
            }

            rows.forEach(row => {
                const material = normalizePartNumberTermsValue(row.Material);

                if (!material) {
                    return;
                }

                if (termsByProductId.has(material)) {
                    row.PartNumberTermsandCond = termsByProductId.get(material);
                }
            });
        };

        // ── step 1 / 1.1: item structure + terms ───────────────
        const mergeCategoryTerms = async (itemStructureDatas) => {
            const MAP = [
                { source: "MainCategoryTermsandConditions", target: "MainCategoryTermsandCond" },
                { source: "SubCategory1TermsandConditions", target: "SubCategory1TermsandCond" },
                { source: "SubCategory2TermsandConditions", target: "SubCategory2TermsandCond" },
                { source: "SubCategory3TermsandConditions", target: "SubCategory3TermsandCond" },
                { source: "SubCategory4TermsandConditions", target: "SubCategory4TermsandCond" },
                { source: "SubCategory5TermsandConditions", target: "SubCategory5TermsandCond" },
            ];
            const pathKey = (r) => CATEGORY_PATH_FIELDS.map(field => normalizePricelistTermsValue(r[field])).join("|");
            const headerCriteria = {
                PricelistType,
                MarketScopeRegion,
                MarketScopeCountry,
                SalesOrg,
                DistChannel,
                CustPriceList,
                CustGroup1,
                ErpCustomer,
                DeliveringPlant
            };

            const allTermsRows = await db.run(
                SELECT.from(TermsAndConditions)
            );

            const termsRowsByPath = new Map();

            allTermsRows.forEach(row => {
                const key = pathKey(row);

                if (!termsRowsByPath.has(key)) {
                    termsRowsByPath.set(key, []);
                }

                termsRowsByPath.get(key).push(row);
            });

            const termsByPath = new Map();

            termsRowsByPath.forEach((candidateRows, key) => {
                const resolvedRow = resolvePricelistTermsAndConditions(candidateRows,headerCriteria);

                if (resolvedRow) {
                    termsByPath.set(key, resolvedRow);
                }
            });

            itemStructureDatas.forEach((row) => {
                const m = termsByPath.get(pathKey(row));
                if (!m) return;
                MAP.forEach(({ source, target }) => { row[target] = m[source] || null; });
            });
        };

        const compareItemStructureSequence = (vSequenceA, vSequenceB) => {
            const sSequenceA = String(vSequenceA ?? "").trim();
            const sSequenceB = String(vSequenceB ?? "").trim();

            const bBlankA = sSequenceA === "";
            const bBlankB = sSequenceB === "";

            if (bBlankA && bBlankB) {
                return 0;
            }

            if (bBlankA) {
                return 1;
            }

            if (bBlankB) {
                return -1;
            }

            const bNumericA = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(sSequenceA) && Number.isFinite(Number(sSequenceA));

            const bNumericB = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(sSequenceB) && Number.isFinite(Number(sSequenceB));

            if (bNumericA && bNumericB) {
                const iNumericComparison = Number(sSequenceA) - Number(sSequenceB);

                if (iNumericComparison !== 0) {
                    return iNumericComparison;
                }

                return sSequenceA.localeCompare(sSequenceB, undefined, {
                    numeric: true,
                    sensitivity: "base"
                });
            }

            if (bNumericA) {
                return -1;
            }

            if (bNumericB) {
                return 1;
            }

            return sSequenceA.localeCompare(sSequenceB, undefined, {
                numeric: true,
                sensitivity: "base"
            });
        };

        const loadItemStructure = async () => {
            const itemStructureFilters = {PricelistType,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer,DeliveringPlant};

            const activeItemStructureFilters = Object.entries(itemStructureFilters);

            let rows = await db.run(SELECT.from("PricelistItemStructureComponents"));

            rows = (Array.isArray(rows) ? rows : []).filter((row) => {
                return activeItemStructureFilters.every(([field,value]) => {
                    const maintainedValue = row[field] === undefined || row[field] === null ? "" : String(row[field]).trim();
                    const pricelistValue = value === undefined || value === null ? "" : String(value).trim();

                    return (maintainedValue === "" || maintainedValue === "*" || maintainedValue === pricelistValue);
                });
            });

            if (!Array.isArray(rows) || rows.length === 0) {
                return [];
            }

            const aSortedRows = rows.map((oRow, iOriginalIndex) => ({
                row: oRow,
                originalIndex: iOriginalIndex
            })).sort((oEntryA, oEntryB) => {
                const iSequenceComparison = compareItemStructureSequence(oEntryA.row.Sequence,oEntryB.row.Sequence);

                if (iSequenceComparison !== 0) {
                    return iSequenceComparison;
                }

                return oEntryA.originalIndex - oEntryB.originalIndex;
            }).map((oEntry) => oEntry.row);

            await mergeCategoryTerms(aSortedRows);

            return aSortedRows;
        };

        const resolvedPlant = await resolvePlantFromHeader();

        // ── step 2 / 3 / 3.1: material master + status ─────────
        const buildMaterialWhere = (itemStructureDatas) => {
            const common = [];
            SalesOrg && common.push(`"SALES_ORGANIZATION" = '${escapeSql(SalesOrg)}'`);
            DistChannel && common.push(`"DISTRIBUTION_CHANNEL" = '${escapeSql(DistChannel)}'`);
            // common.push(DeliveringPlant ? `"PLANT" = '${escapeSql(DeliveringPlant)}'` : `"PLANT" = '*'`);
            // if (resolvedPlant) {
            //     common.push(`("PLANT" = '${escapeSql(resolvedPlant)}' OR "PLANT" = '*')`);
            // } else {
            //     common.push(`"PLANT" = '*'`);
            // }

            /*
            * Product tree currently uses wildcard plant records. 
            * This preserves existing product selection behaviour while Country of Origin is resolved separately using the resolved plant with wildcard fallback.
            * If business later requires plant-specific product selection, I will revisit this filter together with the Country of Origin lookup to avoid reintroducing duplicate product rows.
            */
            common.push(`"PLANT" = '*'`);

            const catOr = itemStructureDatas.map(row => {
                const c = [];
                const add = (f, v) => c.push(v ? `"${f}" = '${escapeSql(v)}'` : `COALESCE("${f}", '') = ''`);
                add('MAIN_CATEGORY', row.MainCategory);
                add('SUBCATEGORY_1', row.SubCategory1); add('SUBCATEGORY_2', row.SubCategory2);
                add('SUBCATEGORY_3', row.SubCategory3); add('SUBCATEGORY_4', row.SubCategory4);
                add('SUBCATEGORY_5', row.SubCategory5);
                return `(${c.join(' AND ')})`;
            });

            if (common.length && catOr.length) return `(${common.join(' AND ')}) AND (${catOr.join(' OR ')})`;
            if (common.length) return common.join(' AND ');
            if (catOr.length) return catOr.join(' OR ');
            return '';
        };

        const mergeMaterialStatus = async (materialsMaster) => {
            const materialIds = [
                ...new Set(
                    materialsMaster
                        .map(material => String(material.MATERIAL || "").trim())
                        .filter(Boolean)
                )
            ];

            if (materialIds.length === 0) {
                return;
            }

            const partNumberResults = await db.run(
                SELECT.from("com.sap.pricelistsystem.PricelistPartNumberDetermination")
                    .columns(
                        "ProductID",
                        "ProductStatus",
                        "StatusValidity",
                        "StatusExpiry",
                        "MaterialClassification1",
                        "MaterialClassification2",
                        "ProductDescription1",
                        "ProductDescription2",
                        "ThirdPartySupplier",
                        "ThirdPartySupplierSKU"
                    )
                    .where({
                        ...(SalesOrg && { SalesOrg }),
                        ...(DistChannel && { DistChannel }),
                        ProductID: { in: materialIds }
                    })
            );

            const lookup = new Map();

            for (const item of partNumberResults || []) {
                const productId = String(item.ProductID || "").trim();

                if (!productId) {
                    continue;
                }

                lookup.set(productId, item);
            }

            materialsMaster.forEach(material => {
                const productId = String(material.MATERIAL || "").trim();
                const maintainedProduct = lookup.get(productId);
                material.ProductStatus = maintainedProduct?.ProductStatus || null;
                material.StatusValidity = maintainedProduct?.StatusValidity || null;
                material.StatusExpiry = maintainedProduct?.StatusExpiry || null;
                material.MaterialClassification1 = maintainedProduct?.MaterialClassification1 || null;
                material.MaterialClassification2 = maintainedProduct?.MaterialClassification2 || null;
                material.ProductDescription1 = maintainedProduct?.ProductDescription1 || null;
                material.ProductDescription2 = maintainedProduct?.ProductDescription2 || null;
                material.ThirdPartySupplier = maintainedProduct?.ThirdPartySupplier || null;
                material.ThirdPartySupplierSKU = maintainedProduct?.ThirdPartySupplierSKU || null;
            });
        };

        const mergePOAFOCFallback = async (rows) => {
            const materialIds = [...new Set(
                rows
                    .map(r => r.Material)
                    .filter(Boolean)
            )];

            if (!materialIds.length) return;

            const poaRows = await db.run(
                SELECT.from('PricelistPartNumberPOAFOC')
                    .where({ ProductID: { in: materialIds } })
            );

            if (!poaRows || poaRows.length === 0) return;

            const exactMap = new Map();
            const genericMap = new Map();

            for (const r of poaRows) {
                const productId = String(r.ProductID || '').trim();
                const plType = String(r.PricelistType || '').trim();
                const value = String(r.POAFOCValue || '').trim();

                if (!productId || !value) continue;

                if (plType) {
                    exactMap.set(`${productId}|${plType}`, value);
                } else {
                    genericMap.set(productId, value);
                }
            }

            for (const row of rows) {
                const currentPrice = String(row.Price ?? '').trim();

                // Apply only when real price is empty/null
                if (currentPrice) continue;

                const productId = String(row.Material || '').trim();
                if (!productId) continue;

                const headerPricelistType = String(PricelistType || '').trim();
                const exactValue = exactMap.get(`${productId}|${headerPricelistType}`);
                const genericValue = genericMap.get(productId);

                const fallbackValue = exactValue || genericValue;

                if (fallbackValue) {
                    row.Price = fallbackValue;
                    row.PriceUnit = null;
                }
            }
        };

        // const loadMaterials = async (itemStructureDatas) => {
        //     const where = buildMaterialWhere(itemStructureDatas);
        //     const extQuery = `WITH ranked AS (SELECT *, ROW_NUMBER() OVER ( PARTITION BY "MATERIAL_KEY", "SALES_ORGANIZATION", "DISTRIBUTION_CHANNEL"
        //         ORDER BY SUBSTRING("CREATED_AT", 1, 19) DESC) AS rn FROM "SAPECC"."T_MATERIAL_MASTER_DATA" WHERE ${where})
        //         SELECT * FROM ranked WHERE rn = 1`;
        //     const materialsMaster = await extdb.run(extQuery);
        //     await mergeMaterialStatus(materialsMaster);
        //     return materialsMaster;
        // };

        const hasCountryOfOrigin = value => value !== null && value !== undefined && String(value).trim() !== "";

        // Reads Country of Origin for the supplied materials and one plant.
        const readCountryOfOrigin = async (materialIds, plant) => {
            if (!plant || !Array.isArray(materialIds) || materialIds.length === 0) {
                return new Map();
            }

            const materialFilter = materialIds.map(material => `'${escapeSql(material)}'`).join(", ");

            const conditions = [
                `"MATERIAL" IN (${materialFilter})`,
                `"PLANT" = '${escapeSql(plant)}'`
            ];

            if (SalesOrg) {
                conditions.push(`"SALES_ORGANIZATION" = '${escapeSql(SalesOrg)}'`);
            }

            if (DistChannel) {
                conditions.push(`"DISTRIBUTION_CHANNEL" = '${escapeSql(DistChannel)}'`);
            }

            const query = `
                WITH ranked AS (
                    SELECT
                        "MATERIAL",
                        "PLANT_COUNTRY_OF_ORIGIN",
                        ROW_NUMBER() OVER (
                            PARTITION BY "MATERIAL"
                            ORDER BY
                                SUBSTRING("CREATED_AT", 1, 19) DESC
                        ) AS rn
                    FROM "SAPECC"."T_MATERIAL_MASTER_DATA"
                    WHERE ${conditions.join(" AND ")}
                )
                SELECT
                    "MATERIAL",
                    "PLANT_COUNTRY_OF_ORIGIN"
                FROM ranked
                WHERE rn = 1
            `;

            const rows = await extdb.run(query);
            const countryByMaterial = new Map();

            for (const row of rows || []) {
                const material = String(row.MATERIAL || "").trim();

                const countryOfOrigin = row.PLANT_COUNTRY_OF_ORIGIN;

                if (material && hasCountryOfOrigin(countryOfOrigin)) {
                    countryByMaterial.set(material,String(countryOfOrigin).trim());
                }
            }

            return countryByMaterial;
        };

        /**
         * Updates only PLANT_COUNTRY_OF_ORIGIN on the existing material rows.
         * Lookup order:
         * 1. resolved plant
         * 2. wildcard plant, only for rows where the resolved plant value is blank
         */
        const enrichCountryOfOrigin = async materialsMaster => {
            if (!Array.isArray(materialsMaster) || materialsMaster.length === 0) {
                return;
            }

            const materialIds = [
                ...new Set(materialsMaster.map(material => String(material.MATERIAL || "").trim()).filter(Boolean))
            ];

            if (materialIds.length === 0) {
                return;
            }

            const resolvedPlantCountries = resolvedPlant ? await readCountryOfOrigin(materialIds,resolvedPlant) : new Map();
            const fallbackMaterialIds = materialIds.filter(material => !resolvedPlantCountries.has(material));
            const wildcardCountries = fallbackMaterialIds.length > 0 ? await readCountryOfOrigin(fallbackMaterialIds,"*") : new Map();

            for (const materialRow of materialsMaster) {
                const material = String(materialRow.MATERIAL || "").trim();

                if (resolvedPlantCountries.has(material)) {
                    materialRow.CountryOfOrigin = resolvedPlantCountries.get(material);
                } else if (wildcardCountries.has(material)) {
                    materialRow.CountryOfOrigin = wildcardCountries.get(material);
                } else {
                    materialRow.CountryOfOrigin = null;
                }
            }
        };

        const loadMaterials = async (itemStructureDatas) => {
            const where = buildMaterialWhere(itemStructureDatas);

            const extQuery = `
                WITH ranked AS (
                    SELECT
                        *,
                        ROW_NUMBER() OVER (
                            PARTITION BY
                                "MATERIAL_KEY",
                                "SALES_ORGANIZATION",
                                "DISTRIBUTION_CHANNEL"
                            ORDER BY
                                SUBSTRING("CREATED_AT", 1, 19) DESC
                        ) AS rn
                    FROM "SAPECC"."T_MATERIAL_MASTER_DATA"
                    WHERE ${where}
                )
                SELECT *
                FROM ranked
                WHERE rn = 1
            `;


            // const sResolvedPlant = resolvedPlant ? escapeSql(resolvedPlant) : "";

            // const sPlantPriority = resolvedPlant 
            //     ? `
            //         CASE
            //             WHEN "PLANT" = '${sResolvedPlant}' THEN 0
            //             WHEN "PLANT" = '*' THEN 1
            //             ELSE 2
            //         END,
            //     `
            //     : `
            //         CASE
            //             WHEN "PLANT" = '*' THEN 0
            //             ELSE 1
            //         END,
            //     `;

            // const extQuery = `
            //     WITH ranked AS (
            //         SELECT
            //             *,
            //             ROW_NUMBER() OVER (
            //                 PARTITION BY
            //                     "MATERIAL_KEY",
            //                     "SALES_ORGANIZATION",
            //                     "DISTRIBUTION_CHANNEL"
            //                 ORDER BY
            //                     ${sPlantPriority}
            //                     SUBSTRING("CREATED_AT", 1, 19) DESC
            //             ) AS rn
            //         FROM "SAPECC"."T_MATERIAL_MASTER_DATA"
            //         WHERE ${where}
            //     )
            //     SELECT *
            //     FROM ranked
            //     WHERE rn = 1
            // `;

            const materialsMaster = await extdb.run(extQuery);
            await enrichCountryOfOrigin(materialsMaster);
            await mergeMaterialStatus(materialsMaster);

            return materialsMaster;
        };

        const toProperCase = value => {
            const description = String(value ?? "").trim();

            if (!description) {
                return null;
            }

            return description.toLowerCase().replace(/\b[a-z]/g, character => character.toUpperCase());
        };

        const resolveMaterialDescription = material => {
            const pricelistProductDescription = String(material.ProductDescription2 ?? "").trim();

            if (pricelistProductDescription) {
                return toProperCase(pricelistProductDescription);
            }

            return toProperCase(material.MATERIAL_DESCRIPTION);
        };

        // ── step 8: material-only flat rows ────────────────────
        const buildMaterialRows = (itemStructureDatas, materialsMaster) => {
            const byCategory = new Map();
            materialsMaster.forEach(mat => {
                const k = getCategoryKey(mat, CATEGORY_FIELDS);
                if (!byCategory.has(k)) byCategory.set(k, []);
                byCategory.get(k).push(mat);
            });
            return itemStructureDatas.flatMap(row => {
                const matches = byCategory.get(getCategoryKey(row, CATEGORY_FIELDS)) || [];
                return matches.map(mat => ({
                    ...row,
                    MaterialKey: mat.MATERIAL_KEY,
                    Material: mat.MATERIAL,
                    MaterialDescription: resolveMaterialDescription(mat),
                    CountryOfOrigin: mat.CountryOfOrigin || null,
                    Status: mat.ProductStatus || null,
                    StatusValidFromDate: mat.StatusValidity || null,
                    StatusValidToDate: mat.StatusExpiry  || null,
                    Supplier: mat.ThirdPartySupplier || null,
                    SupplierSKU: mat.ThirdPartySupplierSKU || null
                }));
            });
        };

        // ── step 4-7: pricing index ────────────────────────────
        // const buildUniquePricingRules = (pricingParameters) => {
        //     const rules = [], seen = new Set();
        //     for (const rec of (pricingParameters || [])) {
        //         const slots = [
        //             { seq: 'AccessSequence', cond: 'ConditionType', prio: 'Priority', isDiscount: false },
        //             { seq: 'DiscountAccessSequence', cond: 'DiscountConditionType', prio: 'DiscountPriority', isDiscount: true }
        //         ];
        //         for (const { seq, cond, prio, isDiscount } of slots) {
        //             for (let i = 1; i <= 10; i++) {
        //                 const seqV = rec[`${seq}${i}`], condV = rec[`${cond}${i}`];
        //                 if (!seqV || !condV) continue;
        //                 const key = `${seqV}::${condV}`;
        //                 if (seen.has(key)) continue;
        //                 seen.add(key);
        //                 rules.push({
        //                     accessSequence: seqV, conditionType: condV,
        //                     priority: parseInt(rec[`${prio}${i}`] || i),
        //                     salesOrg: rec.SalesOrg || null, distChannel: rec.DistChannel || null,
        //                     isDiscount
        //                 });
        //             }
        //         }
        //     }
        //     return rules;
        // };

        // const fetchPriceRecords = async (materialsMaster, uniquePricingRules) => {
        //     const colRows = await extdb.run(`SELECT COLUMN_NAME FROM SYS.TABLE_COLUMNS WHERE SCHEMA_NAME = 'SAPECC' AND TABLE_NAME = 'T_PRICELIST_MASTER_DATA' ORDER BY POSITION`);
        //     const availableCols = new Set(colRows.map(r => r.COLUMN_NAME));
        //     const colsAlreadyMapped = new Set(['CONDITION_RECORD_NUMBER', 'APPLICATION', 'CONDITION_TYPE', 'VALID_FROM_DATE', 'VALID_TO_DATE', 'MATERIAL']);
        //     const activePrefixes = new Set(uniquePricingRules.map(r => r.accessSequence));
        //     const allExtraSuffixes = new Set();
        //     for (const col of availableCols) {
        //         const [prefix, ...suffixParts] = col.split('_');
        //         const suffix = suffixParts.join('_');
        //         if (activePrefixes.has(prefix) && !colsAlreadyMapped.has(suffix)) allExtraSuffixes.add(suffix);
        //     }
        //     const extraSuffixList = [...allExtraSuffixes];
        //     const materialKeys = [...new Set(materialsMaster.map(mat => mat.MATERIAL).filter(Boolean))];
        //     if (!materialKeys.length) return [];
        //     const matListSql = materialKeys.map(m => `'${escapeSql(m)}'`).join(', ');

        //     const sqlQuery = uniquePricingRules.map(rule => {
        //         const p = rule.accessSequence;
        //         const has = s => availableCols.has(`${p}_${s}`);
        //         const col = s => `"${p}_${s}"`;
        //         if (!has('CONDITION_TYPE')) return null;
        //         const hasMat = has('MATERIAL');
        //         const where = [
        //             hasMat && `${col('MATERIAL')} IN (${matListSql})`,
        //             `${col('CONDITION_TYPE')} = '${escapeSql(rule.conditionType)}'`,
        //             has('SALES_ORGANIZATION') && rule.salesOrg && `${col('SALES_ORGANIZATION')} = '${escapeSql(rule.salesOrg)}'`,
        //             has('DISTRIBUTION_CHANNEL') && rule.distChannel && `${col('DISTRIBUTION_CHANNEL')} = '${escapeSql(rule.distChannel)}'`
        //         ].filter(Boolean);
        //         const vFrom = has('VALID_FROM_DATE') ? col('VALID_FROM_DATE') : 'CAST(NULL AS NVARCHAR(50))';
        //         const vTo = has('VALID_TO_DATE') ? col('VALID_TO_DATE') : 'CAST(NULL AS NVARCHAR(50))';
        //         const matCol = hasMat ? col('MATERIAL') : 'CAST(NULL AS NVARCHAR(40))';
        //         const extras = extraSuffixList.map(s => has(s) ? `${col(s)} AS "${s}"` : `NULL AS "${s}"`).join(', ');
        //         return `
        //         SELECT '${escapeSql(p)}' AS "ACCESS_SEQUENCE", ${Number(rule.priority || 999)} AS "PRIORITY",
        //             ${matCol} AS "MATERIAL", ${col('CONDITION_TYPE')} AS "CONDITION_TYPE",
        //             "KONP_RATE" AS "PRICE", "KONP_RATE_UNIT" AS "PRICE_UNIT",
        //             ${vFrom} AS "VALID_FROM", ${vTo} AS "VALID_TO"
        //             ${extras ? ', ' + extras : ''}
        //         FROM "SAPECC"."T_PRICELIST_MASTER_DATA"
        //         WHERE ${where.join(' AND ')}`;
        //     }).filter(Boolean);

        //     return sqlQuery.length ? await extdb.run(sqlQuery.join(' UNION ALL ')) : [];
        // };

        // const loadPricingIndex = async (materialsMaster) => {
        //     const pricingParameters = await db.run(SELECT.from('PricingParameterDetermination')
        //         .where({ ...(PricelistType && { PricelistType }), ...(MarketScopeRegion && { MarketScopeRegion }), ...(MarketScopeCountry && { MarketScopeCountry }) })
        //         .orderBy({ createdAt: 'desc' }));

        //     const uniquePricingRules = buildUniquePricingRules(pricingParameters);
        //     if (!uniquePricingRules.length) return null;

        //     const Customers = CustomerNumber
        //         ? await extdb.run(`SELECT * FROM SAPECC.T_CUSTOMER_MASTER_DATA WHERE SALES_ORGANIZATION = '${escapeSql(SalesOrg)}' AND DISTRIBUTION_CHANNEL = '${escapeSql(DistChannel)}' AND CUSTOMER = '${escapeSql(CustomerNumber)}'`)
        //         : [];

        //     const fetchedPriceRecords = await fetchPriceRecords(materialsMaster, uniquePricingRules);

        //     const discountConditionTypes = new Set(uniquePricingRules.filter(r => r.isDiscount).map(r => r.conditionType));
        //     const materialMasterMap = new Map(materialsMaster.map(mat => [mat.MATERIAL, mat]));
        //     const customerDivisionMap = new Map(Customers.map(c => [c.DIVISION, c]));
        //     const recordsByMaterial = new Map(), broadcastRecords = [];
        //     fetchedPriceRecords.forEach(rec => {
        //         if (rec.MATERIAL) {
        //             if (!recordsByMaterial.has(rec.MATERIAL)) recordsByMaterial.set(rec.MATERIAL, []);
        //             recordsByMaterial.get(rec.MATERIAL).push(rec);
        //         } else broadcastRecords.push(rec);
        //     });

        //     return { discountConditionTypes, materialMasterMap, customerDivisionMap, recordsByMaterial, broadcastRecords };
        // };

        // ── step 10: apply price / future / discount ───────────
        // const accessSequenceFilters = {
        //     'A020': (rec, mat, cust) => rec.DIVISION === mat.DIVISION && rec.CUSTOMER_PRICE_GROUP === cust.PRICE_GROUP,
        //     'A932': (rec, mat, cust) => rec.DIVISION === mat.DIVISION && rec.MATERIAL_CLASS === mat.MATERIAL_GROUP_2 && rec.SOLD_TO === CustomerNumber,
        //     'A030': (rec, mat, cust) => rec.SOLDTO === CustomerNumber && rec.MATERIAL_PRICE_GROUP === mat.MATERIAL_PRICE_GROUP,
        //     'A031': (rec, mat, cust) => rec.CUSTOMER_PRICE_GROUP === cust.PRICE_GROUP && rec.MATERIAL_PRICE_GROUP === mat.MATERIAL_PRICING_GROUP,
        //     'A917': (rec, mat, cust) => rec.CUSTOMER_GROUP_1 === cust.CUSTOMER_GROUP_1 && rec.PRICELIST === CustPriceList,
        //     'A916': (rec, mat, cust) => rec.PRICELIST_TYPE === CustPriceList,
        //     'A305': (rec, mat, cust) => rec.SOLDTO === CustomerNumber,
        //     'A937': (rec, mat, cust) => rec.MATERIAL_TYPE === mat.MATERIAL_TYPE && rec.DIVISION === mat.DIVISION
        // };

        // const applyPricing = (rows, idx, opts) => {
        //     const { discountConditionTypes, materialMasterMap, customerDivisionMap, recordsByMaterial, broadcastRecords } = idx;

        //     const getCandidateRecords = (materialId, materialContext) => {
        //         const customerContext = customerDivisionMap.get(materialContext.DIVISION) || {};
        //         const passes = (rec) => {
        //             const predicate = accessSequenceFilters[rec.ACCESS_SEQUENCE];
        //             return !predicate || predicate(rec, materialContext, customerContext);
        //         };
        //         return [...(recordsByMaterial.get(materialId) || []).filter(passes), ...broadcastRecords.filter(passes)];
        //     };

        //     const effectiveDate = EffectiveDate ? new Date(EffectiveDate) : null;
        //     const publishedDate = PublishedDate ? new Date(PublishedDate) : new Date(EffectiveDate);
        //     const publishedPlus30 = publishedDate ? new Date(publishedDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

        //     rows.forEach(row => {
        //         const materialContext = materialMasterMap.get(row.Material);
        //         if (!materialContext) return;

        //         const candidates = getCandidateRecords(row.Material, materialContext);
        //         const priceRecords = candidates.filter(rec => !discountConditionTypes.has(rec.CONDITION_TYPE));
        //         const discountRecords = candidates.filter(rec => discountConditionTypes.has(rec.CONDITION_TYPE));
        //         const currentMatch = pickBestByDate(priceRecords, effectiveDate);

        //         if (opts.price && currentMatch) {
        //             row.Price = currentMatch.PRICE || null;
        //             row.PriceUnit = currentMatch.PRICE_UNIT || null;
        //             row.PriceValidFrom = currentMatch.VALID_FROM || null;
        //             row.PriceValidTo = currentMatch.VALID_TO || null;
        //             row.AccessSequence = currentMatch.ACCESS_SEQUENCE || null;
        //             row.ConditionType = currentMatch.CONDITION_TYPE || null;
        //         }

        //         if (opts.future) {
        //             const futureMatch = pickBestByDate(priceRecords, publishedPlus30);
        //             if (futureMatch && futureMatch !== currentMatch) {
        //                 row.FuturePrice = futureMatch.PRICE || null;
        //                 row.FuturePriceValidFrom = futureMatch.VALID_FROM || null;
        //                 row.FuturePriceValidTo = futureMatch.VALID_TO || null;
        //             }
        //         }

        //         if (opts.discount) {
        //             const discountMatch = pickBestByDate(discountRecords, effectiveDate);
        //             if (discountMatch) {
        //                 row.DiscountRate = discountMatch.PRICE || null;
        //                 row.DiscountValidFrom = discountMatch.VALID_FROM || null;
        //                 row.DiscountValidTo = discountMatch.VALID_TO || null;
        //                 row.DiscountConditionType = discountMatch.CONDITION_TYPE || null;
        //                 row.DiscountAccessSequence = discountMatch.ACCESS_SEQUENCE || null;
        //             }
        //         }
        //     });
        // };

        // ── step 4-7: pricing index ────────────────────────────
        const loadPricingIndex = async (materialsMaster) => {
            const materialIds = [...new Set(materialsMaster.map(mat => mat.MATERIAL).filter(Boolean))];

            const context = {
                PricelistType,
                MarketScopeRegion,
                MarketScopeCountry,
                SalesOrg,
                DistChannel,
                CustPriceList,
                CustGroup1,
                ErpCustomer,
                DeliveringPlant
            };

            const priceRows = await resolvePricingParameters({
                db,
                extdb,
                context,
                materialIds,
                parameterType: 'P',
                effectiveDate: EffectiveDate
            });

            const priceByMaterial = new Map(priceRows.map(row => [
                    String(row.Material || '').trim(), row
                ])
            );

            const futureRows = await resolvePricingParameters({
                db,
                extdb,
                context,
                materialIds,
                parameterType: 'P',
                resolutionMode: 'nextAfterCurrent',
                currentRowsByMaterial: priceByMaterial
            });

            return {
                priceByMaterial,
                futureByMaterial: new Map(
                    futureRows.map(row => [
                        String(row.Material || '').trim(),
                        row
                    ])
                )
            };
        };

        // ── step 10: apply price / future / discount ───────────
        const applyPricing = (rows, idx, opts) => {
            rows.forEach(row => {
                if (opts.price) {
                    const materialKey = String(row.Material || '').trim();
                    const price = idx.priceByMaterial.get(materialKey);

                    if (price) {
                        row.Price = price.Rate ?? null;
                        row.PriceUnit = price.RateUnit ?? null;
                        row.PriceValidFrom = price.ValidFrom ?? null;
                        row.PriceValidTo = price.ValidTo ?? null;
                        row.AccessSequence = price.AccessSequence ?? null;
                        row.ConditionType = price.ConditionType ?? null;
                    }
                }

                if (opts.future) {
                    const materialKey = String(row.Material || '').trim();
                    const future = idx.futureByMaterial.get(materialKey);
                    row.FuturePrice = future?.Rate ?? null;
                    row.FuturePriceValidFrom = future?.ValidFrom ?? null;
                    row.FuturePriceValidTo = future?.ValidTo ?? null;
                }

                // Discount is intentionally not resolved in Maintain because internal users do not have a customer account-assignment context.
                if (opts.discount) {
                    row.DiscountRate = null;
                    row.DiscountValidFrom = null;
                    row.DiscountValidTo = null;
                    row.DiscountConditionType = null;
                    row.DiscountAccessSequence = null;
                }
            });
        };

        // ── step 12: sort  ─────────────────────────
        const sortResults = (rows) => {
            const groupKey = (r) => [r.MainCategory, r.SubCategory1, r.SubCategory2, r.SubCategory3, r.SubCategory4, r.SubCategory5].join('|');
            return [...rows].sort((a, b) =>
                groupKey(a) === groupKey(b) ? (a.Material || '').localeCompare(b.Material || '') : 0
            );
        };

        // ── compose ────────────────────────────────────────────
        const itemStructure = await loadItemStructure();
        if (!itemStructure.length) return [];

        const materials = await loadMaterials(itemStructure);
        let rows = buildMaterialRows(itemStructure, materials);   // material only

        await mergePartNumberTerms(rows);

        rows.forEach(row => {
            row.Notes = row.PartNumberTermsandCond ?? null;
        });

        if (include.price || include.future || include.discount) {
            const pricingIndex = await loadPricingIndex(materials);
            if (pricingIndex) applyPricing(rows, pricingIndex, include);

            //Commenting the below line, as reuirement is to fetch products even if the price is not defined for them.
            // if (include.price) rows = rows.filter(row => row.Price != null);
        }

        await mergePOAFOCFallback(rows);

        rows = rows.filter((row) => {
            return String(row.Price ?? "").trim() !== "";
        });

        return sortResults(rows);
    });

    this.on('saveProductPriceList', saveProductPriceList(this));

    this.on("resolvePricelistTermsAndConditions", async req => {
        const tx = cds.transaction(req);

        const headerCriteria = {
            PricelistType: req.data.PricelistType,
            MarketScopeRegion: req.data.MarketScopeRegion,
            MarketScopeCountry: req.data.MarketScopeCountry,
            SalesOrg: req.data.SalesOrg,
            DistChannel: req.data.DistChannel,
            CustPriceList: req.data.CustPriceList,
            CustGroup1: req.data.CustGroup1,
            ErpCustomer: req.data.ErpCustomer,
            DeliveringPlant: req.data.DeliveringPlant
        };

        const candidates = await tx.run(
            SELECT.from(TermsAndConditions).where({
                PricelistDataLevel: "Header",
                PricelistFieldName: "TermsAndConditions"
            })
        );

        const resolvedRecord = resolvePricelistTermsAndConditions(candidates,headerCriteria);

        return resolvedRecord?.TermsAndConditionContent ?? null;
    });

    // Added for Pricelist header-level defaults.
    this.on("resolvePricelistHeaderDefaults", async req => {
        const tx = cds.transaction(req);

        const headerCriteria = {
            PricelistType: req.data.PricelistType,
            MarketScopeRegion: req.data.MarketScopeRegion,
            MarketScopeCountry: req.data.MarketScopeCountry,
            SalesOrg: req.data.SalesOrg,
            DistChannel: req.data.DistChannel,
            CustPriceList: req.data.CustPriceList,
            CustGroup1: req.data.CustGroup1,
            ErpCustomer: req.data.ErpCustomer,
            DeliveringPlant: req.data.DeliveringPlant
        };

        const candidates = await tx.run(
            SELECT.from(TermsAndConditions).columns(
                "ID",
                "modifiedAt",
                "PricelistType",
                "MarketScopeRegion",
                "MarketScopeCountry",
                "SalesOrg",
                "DistChannel",
                "CustPriceList",
                "CustGroup1",
                "ErpCustomer",
                "DeliveringPlant",
                "HeaderTermsAndConditions",
                "HeaderNotes"
            )
        );

        const termsCandidates = candidates.filter(record => {
            return record.HeaderTermsAndConditions !== null && record.HeaderTermsAndConditions !== undefined && String(record.HeaderTermsAndConditions).trim() !== "";
        });

        const notesCandidates = candidates.filter(record => {
            return record.HeaderNotes !== null && record.HeaderNotes !== undefined && String(record.HeaderNotes).trim() !== "";
        });

        const resolvedTermsRecord = resolvePricelistTermsAndConditions(termsCandidates,headerCriteria);
        const resolvedNotesRecord = resolvePricelistTermsAndConditions(notesCandidates,headerCriteria);

        return {
            TermsAndConditions: resolvedTermsRecord?.HeaderTermsAndConditions ?? null,
            Notes: resolvedNotesRecord?.HeaderNotes ?? null
        };
    });

    //PDF Export
    this.on("exportTermsPdf", async (req) => {
        const tx = cds.transaction(req);

        // 1. Resolve header-level terms
        const headerCriteria = {
            PricelistType: req.data.PricelistType,
            MarketScopeRegion: req.data.MarketScopeRegion,
            MarketScopeCountry: req.data.MarketScopeCountry,
            SalesOrg: req.data.SalesOrg,
            DistChannel: req.data.DistChannel,
            CustPriceList: req.data.CustPriceList,
            CustGroup1: req.data.CustGroup1,
            ErpCustomer: req.data.ErpCustomer,
            DeliveringPlant: req.data.DeliveringPlant
        };

        const headerCandidates = await tx.run(
            SELECT.from(TermsAndConditions).where({
                PricelistDataLevel: "Header",
                PricelistFieldName: "TermsAndConditions"
            })
        );

        const resolvedHeaderRecord = resolvePricelistTermsAndConditions(headerCandidates,headerCriteria);

        const headerTerms = resolvedHeaderRecord ? [resolvedHeaderRecord] : [];

        //Item Level
        const pricelistId = req.data.ID;
        /* const headerWithItems = await tx.run(
            SELECT.one.from(PricelistData)
            .columns(
                "ID",
                "PricelistTitle",
                "TradeScenario","MarketScopeRegion","MarketScopeCountry",
                "SalesOrg","DistChannel","CustPriceList","CustGroup1","ErpCustome r","DeliveringPlant",
                { items: [
                "PricelistPartNumber",
                "PartNumberDescrLong",
                "MainCategory",
                "Subcategory1","Subcategory2","Subcategory3","Subcategory4","Subcategory5",
                "Price","PriceUnit",
                "MainCategoryTermsandCond",
                "SubCategory1TermsandCond","SubCategory2TermsandCond",
                "SubCategory3TermsandCond","SubCategory4TermsandCond","SubCategory5TermsandCond",
                "PartNumberTermsandCond"
                ]}
            )
            .where({ ID: pricelistId })
            .expand("items")   // <-- expand composition
        );
     
        const detailTerms = headerWithItems?.items || []; */
        const itemCandidates = await tx.run(
            SELECT.from(PricelistItemData)
                .columns(
                    "PricelistPartNumber", "PartNumberDescrLong",
                    "MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5",
                    "Price", "PriceUnit",
                    "MainCategoryTermsandCond", "SubCategory1TermsandCond", "SubCategory2TermsandCond",
                    "SubCategory3TermsandCond", "SubCategory4TermsandCond", "SubCategory5TermsandCond",
                    "PartNumberTermsandCond"
                )
                .where({ pricelist_ID: pricelistId })   // <-- association foreign key
        );

        // Build PDF buffer
        const pdfBuffer = await buildPdfBuffer({ headerCriteria, headerTerms, detailTerms: itemCandidates });

        const res = req._.res;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Terms_Conditions_${new Date().toISOString().slice(0, 10)}.pdf"`);
        res.status(200).end(pdfBuffer);

        return;
    });

    // Return the centrally maintained Pricelist Display column catalogue. The configuration is code-owned and does not access HANA.
    this.on("getPricelistDisplayColumnConfiguration",() => {
            return getPricelistDisplayColumns();
        }
    );

    // Tree Table Column Layout (Save/Load/Delete)
    this.on('getAvailableLayouts', async (req) => {
        const { tableId } = req.data;
        if (!tableId) return req.error(400, "Table Id is required");

        const db = cds.transaction(req);
        const sUserId = req.user?.id || req.user?.email || '';

        const [aOwn, aMasterDefaults] = await Promise.all([
            db.run(SELECT.from(PriceListTreeLayout).where({ tableId: tableId, userId: sUserId })),
            db.run(SELECT.from(PriceListTreeLayout).where({ tableId: tableId, masterDefault: true }))
        ]);

        const oMerged = new Map();
        aOwn.forEach(r => oMerged.set(r.ID, r));
        aMasterDefaults.forEach(r => { if (!oMerged.has(r.ID)) oMerged.set(r.ID, r); });

        return Array.from(oMerged.values())
            .map(r => ({ ...r, isOwn: r.userId === sUserId }))
            .sort((a, b) => String(a.layoutName || '').localeCompare(String(b.layoutName || '')));
    });

    this.on('saveTreeLayout', async (req) => {
        const { ID, tableId, layoutName, defaultLayout, masterDefault, config } = req.data;

        if (!tableId || !layoutName) return req.error(400, "Table Id and layout Name are required");

        const db = cds.transaction(req);
        const sUserId = req.user?.id || req.user?.email || '';

        // only one personal default per user, only one master default per table
        if (defaultLayout) {
            await db.run(UPDATE(PriceListTreeLayout).set({ defaultLayout: false }).where({ tableId, userId: sUserId }));
        }
        if (masterDefault) {
            await db.run(UPDATE(PriceListTreeLayout).set({ masterDefault: false }).where({ tableId }));
        }

        if (ID) {
            const oExisting = await db.run(SELECT.one.from(PriceListTreeLayout).where({ ID }));
            if (!oExisting) return req.error(404, "Layout not found");
            if (oExisting.userId !== sUserId) return req.error(403, "You can only update your own layouts");

            await db.run(
                UPDATE(PriceListTreeLayout)
                    .set({ layoutName, defaultLayout: !!defaultLayout, masterDefault: !!masterDefault, config })
                    .where({ ID })
            );
            return await db.run(SELECT.one.from(PriceListTreeLayout).where({ ID }));
        }

        const sNewId = cds.utils.uuid();
        await db.run(
            INSERT.into(PriceListTreeLayout).entries({
                ID: sNewId, userId: sUserId, tableId, layoutName,
                defaultLayout: !!defaultLayout, masterDefault: !!masterDefault, config
            })
        );
        return await db.run(SELECT.one.from(PriceListTreeLayout).where({ ID: sNewId }));
    });

    this.on('deleteTreeLayout', async (req) => {

        const { ID, tableId, layoutName, defaultLayout, masterDefault, config } = req.data;

        const db = cds.transaction(req);
        const sUserId = req.user?.id || req.user?.email || '';

        const oExisting = await db.run(SELECT.one.from(PriceListTreeLayout).where({ ID }));

        if (!oExisting) {
            return req.error(404, "Layout not found");
        }

        if (oExisting.userId !== sUserId) {
            return req.error(403, "You can only delete your own layouts");
        }

        await db.run(DELETE.from(PriceListTreeLayout).where({ ID }));

        return true;
    });

    // My request
    // this.on('READ', 'MyRequestPriorityVH', async () => {
    //     return [
    //         { Priority: 'Low' },
    //         { Priority: 'Medium' },
    //         { Priority: 'High' }
    //     ];
    // });

    // this.on('READ', 'MyRequestRepeatVH', async () => {
    //     return [
    //         { Repeat: 'Does not repeat' },
    //         { Repeat: 'Repeat' }
    //     ];
    // });

    // function getCurrentNzDateTime() {
    //     const now = new Date();

    //     const date = new Intl.DateTimeFormat('en-CA', {
    //         timeZone: 'Pacific/Auckland',
    //         year: 'numeric',
    //         month: '2-digit',
    //         day: '2-digit'
    //     }).format(now);

    //     const time = new Intl.DateTimeFormat('en-GB', {
    //         timeZone: 'Pacific/Auckland',
    //         hour: '2-digit',
    //         minute: '2-digit',
    //         second: '2-digit',
    //         hour12: false
    //     }).format(now);

    //     return { date, time };
    // }

    // function setMyRequestDefaults(req) {
    //     const { date, time } = getCurrentNzDateTime();

    //     req.data.AccountName = req.data.AccountName || req.user?.id || req.user?.email || 'Unknown User';
    //     req.data.ReqDate = req.data.ReqDate || date;
    //     req.data.ReqTime = req.data.ReqTime || time;
    //     req.data.ReqStatus = req.data.ReqStatus || 'New';

    //     req.data.ReqPriority = req.data.ReqPriority || 'Low';
    //     req.data.ReqRepeat = req.data.ReqRepeat || 'Does not repeat';

    //     req.data.ReqInfoProvided = req.data.ReqInfoProvided ?? false;
    //     req.data.ReqCatalogUpdated = req.data.ReqCatalogUpdated ?? false;
    //     req.data.ReqMasterPLUpdated = req.data.ReqMasterPLUpdated ?? false;
    //     req.data.ReqSecCommerceChecked = req.data.ReqSecCommerceChecked ?? false;
    // }

    // this.before('NEW', 'MyRequest', (req) => {
    //     console.log('>>> MyRequest NEW default handler called');
    //     setMyRequestDefaults(req);
    // });

    // this.before('CREATE', 'MyRequest', (req) => {
    //     console.log('>>> MyRequest CREATE default handler called');
    //     setMyRequestDefaults(req);
    // });

    // this.before('CREATE', 'MyRequest.drafts', (req) => {
    //     console.log('>>> MyRequest.drafts CREATE default handler called');
    //     setMyRequestDefaults(req);
    // });

    this.on('getTileAuthorization', async (req) => {        
        const email = req.data.Email;

        console.log("========== getTileAuthorization ==========");
        console.log("Logged-in Email:", email);
        console.log("req.user:", JSON.stringify(req.user, null, 2));

        // // Temporary bypass for all users except Pom
        // if (email !== "smanpoom.thiratanapan@gallagher.com") {
        //     console.log("Non-Pom user detected. Granting full authorization.");

        //     return {
        //         ControlPriceListView: true,
        //         ControlPriceView: true,
        //         ControlDiscountIndicator: true,
        //         ControlDiscountRate: true,
        //         ControlWorkflowTile: true,
        //         ControlPriceListReviewScheduleTile: true,
        //         ControlPricelistMaintenance: true,
        //         ControlDataMaintenance: true,
        //         ControlMyRequestTile: true,
        //         ControlApplicationLogTile: true
        //     };
        // }

        const auth = await SELECT.one
            .from(cds.entities.AccountAssignment)
            .columns(
                'ControlPriceListView',
                'ControlPriceView',
                'ControlDiscountIndicator',
                'ControlDiscountRate',
                'ControlPricelistMaintenance',
                'ControlDataMaintenance',
                'ControlMyRequestTile',
                'ControlApplicationLogTile'
            )
            .where({
                Email: email
            });

        // If user is not found, hide everything
        if (!auth) {
            return {
                ControlPriceListView: false,
                ControlPriceView: false,
                ControlDiscountIndicator: false,
                ControlDiscountRate: false,
                ControlPricelistMaintenance: false,
                ControlDataMaintenance: false,
                ControlMyRequestTile: false,
                ControlApplicationLogTile: false
            };
        }

        // Convert null/undefined to false
        const result = {
            ControlPriceListView:               auth.ControlPriceListView ?? false,
            ControlPriceView:                   auth.ControlPriceView ?? false,
            ControlDiscountIndicator:           auth.ControlDiscountIndicator ?? false,
            ControlDiscountRate:                auth.ControlDiscountRate ?? false,
            ControlPricelistMaintenance:        auth.ControlPricelistMaintenance ?? false,
            ControlDataMaintenance:             auth.ControlDataMaintenance ?? false,
            ControlMyRequestTile:               auth.ControlMyRequestTile ?? false,
            ControlApplicationLogTile:          auth.ControlApplicationLogTile ?? false
        };

        return result;        
    });    
});