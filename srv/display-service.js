const authorization = require('./pricelist-display_srv-code/authorization');
const { getVersionNumber } = require('./pricelist_maintain_srv-code/version-helper');

module.exports = cds.service.impl(async function () {
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