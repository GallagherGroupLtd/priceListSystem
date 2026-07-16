const authorization = require('./pricelist-display_srv-code/authorization');
const { getVersionNumber } = require('./pricelist_maintain_srv-code/version-helper');
const { resolvePricingParameters } = require('./lib/pricing-parameter-resolver');

module.exports = cds.service.impl(async function () {
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

    this.on('getPricelistUpdates', async (req) => {
        const { pricelistId, fromVersion, toVersion } = req.data || {};

        if (!pricelistId) {
            return req.error(400, 'Pricelist ID is required.');
        }

        const {
            PricelistData,
            ProductPriceList,
            PricelistChangeLog
        } = this.entities;

        const tx = cds.tx(req);

        const oCurrent = await tx.run(
            SELECT.one.from(PricelistData)
                .columns('ID', 'PricelistGroupID', 'Version')
                .where({ ID: pricelistId })
        );

        if (!oCurrent) {
            return req.error(404, 'Pricelist not found.');
        }

        const sGroupId = oCurrent.PricelistGroupID || oCurrent.ID;

        const aVersionsRaw = await tx.run(
            SELECT.from(PricelistData)
                .columns('ID', 'Version', 'PublishedDate', 'PublishedBy', 'Status')
                .where({ PricelistGroupID: sGroupId })
        );

        const aVersions = (aVersionsRaw || [])
            .map((v) => {
                const nVersion = getVersionNumber(v.Version);

                return {
                    id: v.ID,
                    version: v.Version,
                    versionNumber: nVersion,
                    publishedDate: v.PublishedDate || null,
                    publishedBy: v.PublishedBy || '',
                    status: v.Status || '',
                    displayText: [
                        v.Version || '',
                        v.PublishedDate ? `Published ${v.PublishedDate}` : 'Not Published',
                        v.PublishedBy ? `By ${v.PublishedBy}` : ''
                    ].filter(Boolean).join(' | ')
                };
            })
            .sort((a, b) => a.versionNumber - b.versionNumber);

        const nFrom = fromVersion ? getVersionNumber(fromVersion) : null;
        const nTo = toVersion ? getVersionNumber(toVersion) : null;

        const aSelectedVersions = aVersions.filter((v) => {
            if (nFrom !== null && v.versionNumber < nFrom) return false;
            if (nTo !== null && v.versionNumber > nTo) return false;
            return true;
        });

        const aEffectiveVersions = aSelectedVersions.length ? aSelectedVersions : aVersions;
        const aHeaderIds = aEffectiveVersions.map(v => v.id);

        if (!aHeaderIds.length) {
            return {
                versions: aVersions.map(stripInternalVersionFields),
                summary: { totalChanges: 0, totalVersions: aVersions.length },
                priceUpdates: [],
                futurePriceUpdates: [],
                categoryUpdates: [],
                notesUpdates: []
            };
        }

        const aProductRows = await tx.run(
            SELECT.from(ProductPriceList)
                .columns('ID', 'Title', 'Description', 'MaterialKey', 'Kind', 'pricelist_ID')
                .where({ pricelist_ID: { in: aHeaderIds } })
        );

        const mProductById = new Map();
        const mVersionByHeaderId = new Map();

        aEffectiveVersions.forEach((v) => {
            mVersionByHeaderId.set(v.id, v);
        });

        (aProductRows || []).forEach((row) => {
            mProductById.set(row.ID, row);
        });

        const aRefIds = [
            ...aHeaderIds,
            ...(aProductRows || []).map(row => row.ID)
        ];

        const aLogs = await tx.run(
            SELECT.from(PricelistChangeLog)
                .columns('changedAt', 'changedBy', 'source', 'refId', 'changeType', 'field', 'oldValue', 'newValue')
                .where({ refId: { in: aRefIds } })
                .orderBy('changedAt desc')
        );

        const aPriceFields = [
            'Price',
            'PriceUnit',
            'PriceValidFrom',
            'PriceValidTo',
            'PriceChangeIndicator'
        ];

        const aFuturePriceFields = [
            'FuturePrice',
            'FuturePriceValidFrom',
            'FuturePriceValidTo'
        ];

        const aNotesFields = [
            'TermsAndConditions',
            'TACDisableExtUser',
            'TACDisableIntUser',
            'Notes',
            'NotesDisableExtUser',
            'NotesDisableIntUser',
            'IsTACDisableExt',
            'IsTACDisableInt',
            'IsNotesDisableExt',
            'IsNotesDisableInt'
        ];

        const oResult = {
            versions: aVersions.map(stripInternalVersionFields),
            summary: {
                totalChanges: 0,
                totalVersions: aVersions.length
            },
            priceUpdates: [],
            futurePriceUpdates: [],
            categoryUpdates: [],
            notesUpdates: []
        };

        (aLogs || []).forEach((log) => {
            const oVersion = resolveVersionForLog(log, mVersionByHeaderId, mProductById, aEffectiveVersions);
            const oItem = enrichLog(log, oVersion, mProductById);

            if (aPriceFields.includes(log.field)) {
                oResult.priceUpdates.push(oItem);
            } else if (aFuturePriceFields.includes(log.field)) {
                oResult.futurePriceUpdates.push(oItem);
            } else if (log.changeType === 'CREATE' || log.changeType === 'DELETE') {
                oResult.categoryUpdates.push(oItem);
            } else if (aNotesFields.includes(log.field)) {
                oResult.notesUpdates.push(oItem);
            }
        });

        oResult.summary.totalChanges =
            oResult.priceUpdates.length +
            oResult.futurePriceUpdates.length +
            oResult.categoryUpdates.length +
            oResult.notesUpdates.length;

        return oResult;
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