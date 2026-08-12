const authorization = require('./pricelist-display_srv-code/authorization');
const { getAuthorizedProductTree } = require("./pricelist-display_srv-code/product-tree-authorization");
const { getUserEmail } = require("./lib/account-assignment-authorization");
const { resolvePricingParameters } = require('./lib/pricing-parameter-resolver');
const { getPricelistDisplayColumns } = require("./lib/pricelist-display-columns");
const buildVersionHistoryComparison = require("./pricelist-display_srv-code/version-history-comparison");
const { logUserEngagement } = require("./application_log_srv-code/user-engagement-log");
const { pruneTreeRows } = require("./pricelist-display_srv-code/product-tree-authorization");

const { SELECT } = cds.ql;

module.exports = cds.service.impl(async function () {
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
            console.error("[ApplicationLog][PriceListDisplay] Failed to log user engagement:",error);
            return false;
        }
    });

    this.on("getPricelistDisplayColumnConfiguration",() => {
            return getPricelistDisplayColumns();
        }
    );
    
    this.on("getPricelistDisplayLayout",async (req) => {
        const { pricelistId } = req.data || {};

        if (!pricelistId) {
            return req.error(400,"Pricelist ID is required.");
        }

        const db = cds.tx(req);

        const { PricelistData } = this.entities;

        const row = await db.run(
            SELECT.one
                .from(PricelistData)
                .columns("ID","Status","DisplayLayoutConfig","DisplayLayoutMaintainedBy","DisplayLayoutMaintainedAt")
                .where({
                    ID: pricelistId,
                    Status: "Published"
                })
        );

        if (!row) {
            return req.error(404,"Published pricelist was not found.");
        }

        const currentUserContext = await authorization.getCurrentAccountAssignment(req);
        const currentUserEmail = getUserEmail(req);

        const maintainedBy = String(row.DisplayLayoutMaintainedBy || "").trim().toLowerCase();
        const bIsMaintainer = !!currentUserEmail && !!maintainedBy && currentUserEmail === maintainedBy;

        const bIsAdmin = authorization.isInternalAdmin(currentUserContext?.assignment);
        const bCanManage = bIsMaintainer || bIsAdmin;

        return {
            config: row.DisplayLayoutConfig || "",
            hasSavedLayout: !!row.DisplayLayoutConfig,
            canManageLayout: bCanManage,
            maintainedBy: bCanManage ? row.DisplayLayoutMaintainedBy || "" : "",
            maintainedAt: bCanManage ? row.DisplayLayoutMaintainedAt || null : null
        };
    });

    this.on('getDiscountUserContext', async (req) => {
        const userContext = await authorization.getCurrentAccountAssignment(req);

        if (!userContext || !userContext.assignment) {
            return req.error(403, 'No account assignment was found for the current user.');
        }

        const { assignment } = userContext;

        return {
            IsInternalUser: authorization.isInternalUser(assignment),
            IsExternalUser: authorization.isExternalCustomer(assignment),
            CustomerNumber: authorization.isExternalCustomer(assignment)
                ? assignment.CustomerNumber || ''
                : ''
        };
    });

    this.on("getAuthorizedProductTree", async (req) => {
        const {pricelistId,customerNumber: requestedCustomerNumber} = req.data || {};

        if (!pricelistId) {
            return req.error(400,"Pricelist ID is required.");
        }

        const currentUserContext = await authorization.getCurrentAccountAssignment(req);

        if (!currentUserContext || !currentUserContext.assignment) {
            return req.error(403,"No account assignment was found for the current user.");
        }

        const currentAssignment = currentUserContext.assignment;
        const isInternal = authorization.isInternalUser(currentAssignment);
        const isExternal = authorization.isExternalCustomer(currentAssignment);

        if (!isInternal && !isExternal) {
            return req.error(403,"The current account type is not permitted to display the product tree.");
        }

        const customerNumber = isExternal ? String(currentAssignment.CustomerNumber || "").trim() : String(requestedCustomerNumber || "").trim();
        const db = cds.tx(req);

        const {
            PricelistData,
            ProductPriceList
        } = this.entities;

        if (isInternal && !customerNumber) {
            const rows = await db.run(SELECT.from(ProductPriceList).where({
                    pricelist_ID: pricelistId,
                    IsDeleted: {
                        "!=": true
                    }
                }).orderBy("OrderIndex")
            );

            const productIdsWithPrice = new Set(rows.filter((row) => String(row.Kind || "").trim() === "Product" && String(row.Price ?? "").trim() !== "")
                .map((row) => String(row.ID || "").trim())
                .filter(Boolean)
            );

            return pruneTreeRows(rows, productIdsWithPrice);
        }

        if (!customerNumber) {
            return req.error(400,"Customer number is required.");
        }

        const extdb = await cds.connect.to("extdb");
        const result = await getAuthorizedProductTree({db,extdb,ProductPriceList,PricelistData,pricelistId,customerNumber});

        if (result.status) {
            return req.error(result.status,result.message);
        }

        return result.rows;
    });

    this.on('resolveDiscounts', async (req) => {
        const {
            pricelistId,
            customerNumber: requestedCustomerNumber
        } = req.data || {};

        if (!pricelistId) {
            return req.error(400, 'Pricelist ID is required.');
        }

        const currentUserContext =
            await authorization.getCurrentAccountAssignment(req);

        if (!currentUserContext || !currentUserContext.assignment) {
            return req.error(
                403,
                'No account assignment was found for the current user.'
            );
        }

        const currentAssignment = currentUserContext.assignment;

        const isInternal =
            authorization.isInternalUser(currentAssignment);

        const isExternal =
            authorization.isExternalCustomer(currentAssignment);

        if (!isInternal && !isExternal) {
            return req.error(
                403,
                'The current account type is not permitted to retrieve discounts.'
            );
        }

        let customerNumber;

        if (isExternal) {
            customerNumber = currentAssignment.CustomerNumber;
        } else {
            // Internal Admin and Internal Regional users may simulate an external customer by entering a customer number.
            customerNumber = requestedCustomerNumber;
        }

        if (!customerNumber) {
            return req.error(400, 'Customer number is required.');
        }

        const db = cds.tx(req);
        const extdb = await cds.connect.to('extdb');

        const {
            PricelistData
        } = this.entities;

        const dbEntities = cds.entities('com.sap.pricelistsystem');

        const {
            AccountAssignment,
            AccountAssignmentScope
        } = dbEntities;

        const pricelist = await db.run(
            SELECT.one
                .from(PricelistData)
                .columns(
                    'ID',
                    'PricelistType',
                    'MarketScopeRegion',
                    'MarketScopeCountry',
                    'SalesOrg',
                    'DistChannel',
                    'CustPriceList',
                    'CustGroup1',
                    'ErpCustomer',
                    'DeliveringPlant',
                    'EffectiveDate'
                )
                .where({ ID: pricelistId })
        );

        if (!pricelist) {
            return req.error(404, 'Pricelist not found.');
        }

        const customerAssignment = await db.run(
            SELECT.one
                .from(AccountAssignment)
                .where({ CustomerNumber: customerNumber })
        );

        if (!customerAssignment) {
            return req.error(
                404,
                `No account assignment was found for customer ${customerNumber}.`
            );
        }

        const customerScopes = await db.run(
            SELECT
                .from(AccountAssignmentScope)
                .where({ parent_ID: customerAssignment.ID })
        );

        if (!customerScopes || customerScopes.length === 0) {
            return req.error(
                404,
                `No account-assignment scope was found for customer ${customerNumber}.`
            );
        }

        const matchingScope = findMatchingCustomerScope(
            customerScopes,
            pricelist
        );

        if (!matchingScope) {
            return req.error(
                404,
                `No account-assignment scope for customer ${customerNumber} matches the displayed pricelist.`
            );
        }

        const discountRows = await resolvePricingParameters({
            db,
            extdb,
            context: {
                PricelistType: pricelist.PricelistType,
                MarketScopeRegion: pricelist.MarketScopeRegion,
                MarketScopeCountry: pricelist.MarketScopeCountry,

                SalesOrg: matchingScope.SalesOrg,
                DistChannel: matchingScope.DistChannel,

                CustPriceList: customerAssignment.CustPriceList,

                CustGroup1: customerAssignment.CustGroup1,

                ErpCustomer: '',
                DeliveringPlant: customerAssignment.DeliveringPlant
            },
            materialIds: [],
            parameterType: 'D',
            effectiveDate: pricelist.EffectiveDate
        });

        return discountRows.map((row) => ({
            Material: row.Material,
            DiscountRate: row.RateDisplay,
            DiscountValidFrom: row.ValidFrom,
            DiscountValidTo: row.ValidTo,
            DiscountConditionType: row.ConditionType,
            DiscountAccessSequence: row.AccessSequence
        }));
    });

    this.on('READ', 'PricelistData', async (req) => {
        return authorization.filterPricelistData(req);
    });

    this.on("getPricelistUpdates",async req => {
        return buildVersionHistoryComparison(this,req);
    });
});

function findMatchingCustomerScope(scopes, pricelist) {
    const normalize = (value) =>
        value === null || value === undefined
            ? ''
            : String(value).trim();

    const exactMatch = (scopes || []).find((scope) => {
        return (
            normalize(scope.SalesOrg) === normalize(pricelist.SalesOrg) &&
            normalize(scope.DistChannel) === normalize(pricelist.DistChannel) &&
            normalize(scope.PricelistType) === normalize(pricelist.PricelistType) &&
            normalize(scope.MarketScopeRegion) === normalize(pricelist.MarketScopeRegion) &&
            normalize(scope.MarketScopeCountry) === normalize(pricelist.MarketScopeCountry)
        );
    });

    if (exactMatch) {
        return exactMatch;
    }

    // Fallback to the fields currently used by external display authorization.
    return (scopes || []).find((scope) => {
        const distributionChannelMatches =
            !normalize(scope.DistChannel) ||
            normalize(scope.DistChannel) === normalize(pricelist.DistChannel);

        return (
            normalize(scope.SalesOrg) === normalize(pricelist.SalesOrg) &&
            normalize(scope.PricelistType) === normalize(pricelist.PricelistType) &&
            normalize(scope.MarketScopeRegion) === normalize(pricelist.MarketScopeRegion) &&
            normalize(scope.MarketScopeCountry) === normalize(pricelist.MarketScopeCountry) &&
            distributionChannelMatches
        );
    }) || null;
}

function stripInternalVersionFields(v) {
    return {
        version: v.version,
        versionNumber: v.versionNumber,
        publishedDate: v.publishedDate,
        publishedBy: v.publishedBy,
        status: v.status,
        displayText: v.displayText
    };
}

function resolveVersionForLog(log, mVersionByHeaderId, mProductById, aEffectiveVersions) {
    if (log.source === 'Header') {
        return mVersionByHeaderId.get(log.refId) || {};
    }

    const oProduct = mProductById.get(log.refId);
    if (oProduct && oProduct.pricelist_ID) {
        return mVersionByHeaderId.get(oProduct.pricelist_ID) || {};
    }

    return aEffectiveVersions[0] || {};
}

function enrichLog(log, version, mProductById) {
    const oProduct = mProductById.get(log.refId);

    return {
        changedAt: log.changedAt,
        changedBy: log.changedBy,
        source: log.source,
        refId: log.refId,
        changeType: log.changeType,
        field: log.field,
        oldValue: log.oldValue,
        newValue: log.newValue,
        version: version.version || '',
        versionDisplay: version.displayText || version.version || '',
        item: oProduct
            ? [oProduct.Title, oProduct.Description].filter(Boolean).join(' - ')
            : 'Pricelist Header'
    };
}