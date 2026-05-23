const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

const { SELECT, INSERT } = cds.ql;

/**
 * Generic Mass Upload Handler
 * @param {Object} req - CAP request object
 * @param {String} entity - Projection entity name
 * @param {Array} requiredHeaders - List of required headers
 * @param {Function} mapRow - Function to map Excel row → entity fields
 **/
async function handleMassUpload(req, entity, requiredHeaders, mapRow) {
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
        const firstRowKeys = Object.keys(rows[0] || {}).map(k => k.replace(/\s+/g, "").trim());
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

function specificityScore(term, header) {
    const fields = [
        "TradeScenario",
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
            `TradeScenario: ${headerCriteria.TradeScenario || ""} | Region: ${headerCriteria.MarketScopeRegion || ""} | Country: ${headerCriteria.MarketScopeCountry || ""}`
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

module.exports = cds.service.impl(async function () {
    // Match the names exactly as they appear in your CSN definitions
    const { User, TradeScenarios, ItemStructure, PartNumbers, TermsAndConditions, PricingParameters, TileContent, ContactInfo, AccountAssignment, PricingCondType,
        PricelistData, PricelistItemData, ExternalMaterials, ExternalCustomers, ExternalPricelist, ResolvedPricelistItem } = this.entities;

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

        // Pricing Parameters
        const pricingFieldMap = Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== undefined && String(v).trim() !== "")
        );
        const pricingWhere = buildWhereClause(pricingFieldMap);

        const pricingParams = await db.run(
            SELECT.from(PricingParameters).where(pricingWhere).orderBy('ErpSequence')
        );

        //Build final list
        const resolvedItems = [];

        for (const mat of materials) {
            let price = null, currency = null, discount = null, discounteffdate = null,
                pricevalidfr = null, pricevalidto = null;

            for (const param of pricingParams) {
                const seq = param.ErpPricingAccessSequence;
                const fields = param.TechnicalFilter ? param.TechnicalFilter.split('/') : [];
                const conditions = [];

                for (const f of fields) {
                    let value;
                    switch (f) {
                        case 'SALES_ORGANIZATION': value = filters.SalesOrg; break;
                        case 'DISTRIBUTION_CHANNEL': value = filters.DistChannel; break;
                        case 'CUSTOMER': value = filters.ErpCustomer; break;
                        case 'CUSTOMER_GROUP_1': value = filters.CustGroup1; break;
                        case 'PRICELIST_TYPE': value = filters.CustPriceList; break;
                        case 'PRICE_GROUP': value = mat.MATERIAL_PRICING_GROUP; break;
                        case 'MATERIAL': value = mat.MATERIAL; break;
                        default: continue;
                    }
                    if (value && value.trim() !== '') {
                        conditions.push(`${seq}_${f} = '${value}'`);
                    }
                }

                //Get Price/Discount from Pricelist Table
                const pricelistWhere = conditions.join(' AND ');
                let pricelsitStatement = `SELECT TOP 1 * FROM "SAPECC"."T_PRICELIST_MASTER_DATA"`;
                if (pricelsitStatement && pricelistWhere.trim() !== "") {
                    pricelsitStatement += ` WHERE ${pricelistWhere}`;
                }
                const record = await extdb.run(pricelsitStatement);

                if (record && record[0]) {
                    price = record[0].RATE;
                    currency = record[0].RATE_UNIT;
                    discount = record[0].DISCOUNT_RATE;
                    discounteffdate = record[0].DISCOUNT_EFF_DATE;
                    pricevalidfr = record[0][`${seq}_VALID_FROM_DATE`];
                    pricevalidto = record[0][`${seq}_VALID_TO_DATE`];
                    break;
                }
            }

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
                DiscountRate: safe(discount),
                DiscountEffectiveDate: safe(discounteffdate),
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

        // Create the new record as a DRAFT to allows the user to see the new row and edit it before saving.
        return this.create(target).entries(dataToCopy);
    });

    // Handler for Mass Upload - Data Maintenance App
    // 1. Trade Scenarios
    this.on('MassUploadTradeScenarios', req =>
        handleMassUpload(req, cds.entities.TradeAndMarketScenarioDetermination,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry"],
            r => ({
                TradeScenario: r["Trade Scenario"] || r["TradeScenario"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"]
            })
        )
    );

    // 2. Item Structure
    this.on('MassUploadItemStructure', req =>
        handleMassUpload(req, cds.entities.PricelistItemStructureComponents,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "SalesOrg", "DistChannel", "CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant",
                "MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5",
                "MainCategoryLocal", "Subcategory1Local", "Subcategory2Local", "Subcategory3Local", "Subcategory4Local", "Subcategory5Local"],
            r => ({
                TradeScenario: r["Trade Scenario"] || r["TradeScenario"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                SalesOrg: r["Sales Org"] || r["SalesOrg"],
                DistChannel: r["Distribution Channel"] || r["DistChannel"],
                CustPriceList: r["Customer Pricelist"] || r["CustPriceList"],
                CustGroup1: r["Customer Group 1"] || r["CustGroup1"],
                ErpCustomer: r["ERP Customer"] || r["ErpCustomer"],
                DeliveringPlant: r["Plant"] || r["DeliveringPlant"],
                MainCategory: r["Main Category"] || r["MainCategory"],
                Subcategory1: r["Subcategory 1"] || r["Subcategory1"],
                Subcategory2: r["Subcategory 2"] || r["Subcategory2"],
                Subcategory3: r["Subcategory 3"] || r["Subcategory3"],
                Subcategory4: r["Subcategory 4"] || r["Subcategory4"],
                Subcategory5: r["Subcategory 5"] || r["Subcategory5"],
                MainCategoryLocal: r["Main Category Local"] || r["MainCategoryLocal"],
                Subcategory1Local: r["Subcategory 1 Local"] || r["Subcategory1Local"],
                Subcategory2Local: r["Subcategory 2 Local"] || r["Subcategory2Local"],
                Subcategory3Local: r["Subcategory 3 Local"] || r["Subcategory3Local"],
                Subcategory4Local: r["Subcategory 4 Local"] || r["Subcategory4Local"],
                Subcategory5Local: r["Subcategory 5 Local"] || r["Subcategory5Local"],
            })
        )
    );

    // 3. Part Numbers
    this.on('MassUploadPartNumbers', req =>
        handleMassUpload(req, cds.entities.PricelistPartNumberDetermination,
            ["MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5", "PricelistPartNumber"], // "ProductHierarchy3", "ProductHierarchy2", "ProductHierarchy1"],
            r => ({
                MainCategory: r["Main Category"] || r["MainCategory"],
                Subcategory1: r["Subcategory 1"] || r["Subcategory1"],
                Subcategory2: r["Subcategory 2"] || r["Subcategory2"],
                Subcategory3: r["Subcategory 3"] || r["Subcategory3"],
                Subcategory4: r["Subcategory 4"] || r["Subcategory4"],
                Subcategory5: r["Subcategory 5"] || r["Subcategory5"],
                PricelistPartNumber: r["Pricelist Part Number"] || r["PricelistPartNumber"]
            })
        )
    );

    // 4. Terms and Conditions
    this.on('MassUploadTermsandCond', req =>
        handleMassUpload(req, cds.entities.TermsAndConditionDetermination,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "SalesOrg", "DistChannel", "CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant",
                "TermsAndCondition", "MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5"],
            r => ({
                TradeScenario: r["Trade Scenario"] || r["TradeScenario"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                SalesOrg: r["Sales Org"] || r["SalesOrg"],
                DistChannel: r["Distribution Channel"] || r["DistChannel"],
                CustPriceList: r["Customer Pricelist"] || r["CustPriceList"],
                CustGroup1: r["Customer Group 1"] || r["CustGroup1"],
                ErpCustomer: r["ERP Customer"] || r["ErpCustomer"],
                DeliveringPlant: r["Plant"] || r["DeliveringPlant"],
                TermsAndConditions: r["General Terms and Conditions"] || r["TermsAndCondition"],
                MainCategory: r["Main Category"] || r["MainCategory"],
                Subcategory1: r["Subcategory 1"] || r["Subcategory1"],
                Subcategory2: r["Subcategory 2"] || r["Subcategory2"],
                Subcategory3: r["Subcategory 3"] || r["Subcategory3"],
                Subcategory4: r["Subcategory 4"] || r["Subcategory4"],
                Subcategory5: r["Subcategory 5"] || r["Subcategory5"]
            })
        )
    );

    // 5. Pricing Parameters
    this.on('MassUploadPricingParam', req =>
        handleMassUpload(req, cds.entities.PricingParameterDetermination,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "SalesOrg", "DistChannel", "CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant", "ErpPriceCondition", "ErpSequence", "ErpPricingAccessSequence"],
            r => ({
                TradeScenario: r["Trade Scenario"] || r["TradeScenario"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                SalesOrg: r["Sales Org"] || r["SalesOrg"],
                DistChannel: r["Distribution Channel"] || r["DistChannel"],
                CustPriceList: r["Customer Pricelist"] || r["CustPriceList"],
                CustGroup1: r["Customer Group 1"] || r["CustGroup1"],
                ErpCustomer: r["ERP Customer"] || r["ErpCustomer"],
                DeliveringPlant: r["Plant"] || r["DeliveringPlant"],
                ErpPriceCondition: r["ERP Price Condition"] || r["ErpPriceCondition"],
                ErpSequence: r["ERP Sequence"] || r["ErpSequence"],
                ErpPricingAccessSequence: r["ERP Pricing Access Sequence"] || r["ErpPricingAccessSequence"]
            })
        )
    );

    // 6. Tile Content
    this.on('MassUploadTileContent', req =>
        handleMassUpload(req, cds.entities.InformationTileContent,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "InformationHeading", "InformationDetails", "ImageLink"],
            r => ({
                TradeScenario: r["Trade Scenario"] || r["TradeScenario"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                InformationHeading: r["Information Heading"] || r["InformationHeading"],
                InformationDetails: r["Information Details"] || r["InformationDetails"],
                ImageLink: r["Image Link"] || r["ImageLink"]
            })
        )
    );

    // 7. Contact Info
    this.on('MassUploadContactInfo', req =>
        handleMassUpload(req, cds.entities.ContactInformation,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "ContactEmail", "ContactNumber"],
            r => ({
                TradeScenario: r["Trade Scenario"] || r["TradeScenario"],
                MarketScopeRegion: r["Market Scope Region"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["Market Scope Country"] || r["MarketScopeCountry"],
                ContactEmail: r["Contact E-Mail"] || r["ContactEmail"],
                ContactNumber: r["Contact Number"] || r["ContactNumber"]
            })
        )
    );

    // 8. Account Assignment
    this.on('MassUploadAcctAssign', req =>
        handleMassUpload(req, cds.entities.AccountAssignment,
            ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "Type", "FirstName", "LastName", "Email", "CustomerNumber", "SalesOrg", "DistChannel"],
            r => ({
                FirstName: r["FirstName"] || r["FirstName"],
                LastName: r["LastName"] || r["LastName"],
                Type: r["Type"] || r["Type"],
                Email: r["Email"] || r["Email"],
                TradeScenario: r["TradeScenario"] || r["TradeScenario"],
                MarketScopeRegion: r["MarketScopeRegion"] || r["MarketScopeRegion"],
                MarketScopeCountry: r["MarketScopeCountry"] || r["MarketScopeCountry"],
                CustomerNumber: r["CustomerNumber"] || r["CustomerNumber"],
                SalesOrg: r["SalesOrg"] || r["SalesOrg"],
                DistChannel: r["DistChannel"] || r["DistChannel"]
            })
        )
    );

    this.on("MassUploadItemTermsandConditions", async (req) => {
        const extdb = await cds.connect.to('extdb');
        const db = cds.transaction(req);

        const filters = {
            TradeScenario: req.data.TradeScenario,
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

    this.on('READ', 'TradeScenarioVH', () => cds.run(SELECT.distinct.from('TradeAndMarketScenarioDetermination').columns('TradeScenario').orderBy('TradeScenario')));
    this.on('READ', 'MarketRegionVH', () => cds.run(SELECT.distinct.from('TradeAndMarketScenarioDetermination').columns('MarketScopeRegion').orderBy('MarketScopeRegion')));


    // Distinct Countries filtered by TradeScenario + Region
    this.on('READ', 'MarketCountryVH', async (req) => {
        const db = cds.transaction(req);
        let q = SELECT.distinct.from(TradeScenarios)
            // .columns('TradeScenario', 'MarketScopeRegion', 'MarketScopeCountry');
            .columns('MarketScopeCountry');

        if (req.query.SELECT.where) {
            const filters = {};

            // Walk through the where array
            for (let i = 0; i < req.query.SELECT.where.length; i++) {
                const w = req.query.SELECT.where[i];
                const next = req.query.SELECT.where[i + 2]; // pattern: ref, '=', val

                if (w.ref && w.ref[0] === 'TradeScenario' && next && next.val) {
                    filters.TradeScenario = next.val;
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

    // ─── Value Help Handlers ──────────────────────────────────────────────────────
    this.on('READ', 'SalesOrgVH', req => readVH(req, 'ERP_SALES_ORG', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'DistributionChannelVH', req => readVH(req, 'ERP_DIST_CHANNEL', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'PlantVH', req => readVH(req, 'ERP_PLANT', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));

    this.on('READ', 'PricelistVH', req => readVH(req, 'ERP_CUSTPRICELIST', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));
    this.on('READ', 'CustomerGroup1VH', req => readVH(req, 'ERP_CUSTGRP1', { codeCol: 'CODE', descCol: 'DESCRIPTION' }));


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

    //Pricing Parameters - Product Price Access Sequence (Value Help)
    this.on('READ', 'PriceAccessSequenceVH', (req) => {
        const data = [
            { Code: 'A304', Description: 'Material with release status' },
            { Code: 'A305', Description: 'Customer/material with release status' },
            { Code: 'A032', Description: 'Price group/Material' },
            { Code: 'A503', Description: 'Sales org./Distr. Ch/Price list/Item/Material' },
            { Code: 'A506', Description: 'Sales org./Distr. Ch/SalesDocTy/Function/Partner/Material' },
            { Code: 'A916', Description: 'Sales org./Distr. Ch/Price list/Material' },
            { Code: 'A917', Description: 'Sales org./Distr. Ch/Cust Grp1/Price list/Material' },
            { Code: 'A918', Description: 'Sales org./Distr. Ch/Cust Grp1/Material' },
            { Code: 'A930', Description: 'Sales org./Distr. Ch/SalesDocTy/Customer/Material' }
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    //Pricing Parameters - Discount Condition Type (Value Help)
    this.on('READ', 'DiscountConditionTypeVH', (req) => {
        const data = [
            { Code: 'K030' },
            { Code: 'K029' },
            { Code: 'To follow on other condition types' }
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    //Pricing Parameters - Discount Access Sequence (Value Help)
    this.on('READ', 'DiscountAccessSequenceVH', (req) => {
        const data = [
            { Code: 'TBA' }
        ];

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
        const data = [
            { code: 'Initial', name: 'Initial' },
            { code: 'Active', name: 'Active' },
            { code: 'Inactive', name: 'Inactive' }
        ];

        if (req.query.SELECT.count) {
            data.$count = data.length;
        }

        return data;
    });

    // Handler for PricelistData Status Assignment
    this.before('CREATE', PricelistData, async (req) => {
        req.data.Status = 'Initial';
    });

    // Handler upon create of Pricing Parameters
    this.before('CREATE', PricingParameters, async (req) => {
        const extdb = cds.transaction(req);

        // Get pricing parameters dynamically
        const pricingCondType = await extdb.run(
            SELECT.one.from(PricingCondType).where({
                ErpPricingAccessSequence: req.data.ErpPricingAccessSequence
            })
        );

        if (pricingCondType) {
            req.data.SequenceDescription = pricingCondType.SequenceDescription;
            req.data.TechnicalFilter = pricingCondType.TechnicalFilter;
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

    //PDF Export
    this.on("exportTermsPdf", async (req) => {
        const tx = cds.transaction(req);

        // 1. Resolve header-level terms
        const headerCriteria = {
            TradeScenario: req.data.TradeScenario,
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
            SELECT.from(TermsAndConditions).where(headerCriteria)
        );
        const headerTerms = resolveSpecificOverWildcard(headerCandidates, headerCriteria)
            .filter(r => r.PricelistDataLevel === "Header");

        //Item Level
        const pricelistId = req.data.ID;
        /* const headerWithItems = await tx.run(
            SELECT.one.from(PricelistData)
            .columns(
                "ID",
                "PricelistTitle",
                "TradeScenario","MarketScopeRegion","MarketScopeCountry",
                "SalesOrg","DistChannel","CustPriceList","CustGroup1","ErpCustomer","DeliveringPlant",
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
});