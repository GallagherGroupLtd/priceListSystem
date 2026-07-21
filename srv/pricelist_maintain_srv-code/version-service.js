const cds = require("@sap/cds");
const { SELECT, INSERT, UPDATE } = cds.ql;

const {
    PUBLISHED,
    computeVersion,
    getVersionNumber
} = require("./version-helper");

const DRAFT_AND_NAV_FIELDS = [
    "HasActiveEntity",
    "HasDraftEntity",
    "IsActiveEntity",
    "DraftAdministrativeData",
    "DraftAdministrativeData_DraftUUID",
    "DraftMessages",
    "SiblingEntity",
    "items",
    "children",
    "parent",
    "pricelist"
];

function cleanForInsert(row) {
    const copy = { ...row };

    for (const field of DRAFT_AND_NAV_FIELDS) {
        delete copy[field];
    }

    delete copy.createdAt;
    delete copy.createdBy;
    delete copy.modifiedAt;
    delete copy.modifiedBy;

    return copy;
}

function getRequestId(req) {
    return req.data?.ID || req.params?.[0]?.ID;
}

async function handlePricelistCreate(req) {
    req.data.Status = "Drafted";
    req.data.PricelistGroupID = req.data.PricelistGroupID || cds.utils.uuid();

    // New working record should be visible in normal active-version list.
    req.data.IsVersionActive = req.data.IsVersionActive ?? true;
}

function determineVersionActiveState({status,version}) {
    // Every Published version is active when it is the version currently being saved. Older Published versions are deactivated separately when a newer version is published.
    if (status === PUBLISHED) {
        return true;
    }

    // Only the initial Drafted version 0.1 is active. Drafted revisions such as 1.1, 2.1, etc. are working revisions and must remain inactive, including when they are saved without a status change.
    if (status === "Drafted" && getVersionNumber(version) === 0.1) {
        return true;
    }

    return false;
}

async function handlePricelistSave(req, entities) {
    const {
        PricelistData,
        PricelistItemData,
        ProductPriceList
    } = entities;

    const ID = req.data?.ID;
    if (!ID) return;

    const tx = cds.tx(req);

    // Read full active header because old published state may need to be cloned.
    const active = await tx.run(
        SELECT.one.from(PricelistData).where({ ID })
    );

    const oldStatus = active?.Status;
    const newStatus = req.data.Status;

    const groupId = active?.PricelistGroupID || req.data.PricelistGroupID || cds.utils.uuid();

    // Backfill for old records that existed before PricelistGroupID was introduced.
    req.data.PricelistGroupID = groupId;

    const effectiveDate = req.data.EffectiveDate || active?.EffectiveDate;
    const baseVersion = active?.Version ?? req.data.Version ?? "0.1";

    if (active && oldStatus === PUBLISHED && newStatus !== PUBLISHED) {
        return req.reject(400, 'Published pricelists cannot be changed directly. Use "Move to For Revision".');
    }

    req.data.Version = computeVersion(baseVersion,oldStatus,newStatus,effectiveDate);
    req.data.IsVersionActive = determineVersionActiveState({status: newStatus,version: req.data.Version});

    /*
     * Revision/Draft -> Published:
     * Current row becomes latest active published version.
     * Previous published versions in same group become inactive.
     */
    if (newStatus === PUBLISHED && oldStatus !== PUBLISHED) {
        await deactivateOtherPublishedVersions(tx,PricelistData,groupId,ID);

        req.data.IsVersionActive = true;
        req.data.PublishedDate = new Date();
        req.data.PublishedBy = req.user?.id || req.user?.email || "system";
    }

    return {
        id: ID,
        isCreate: !active,
        oldData: active ?? {},
        newData: req.data
    };
}

// async function preservePublishedVersion(tx, entities, sourceHeader, options = {}) {
//     const {
//         PricelistData,
//         PricelistItemData,
//         ProductPriceList
//     } = entities;

//     const sourceHeaderId = sourceHeader.ID;
//     const targetHeaderId = cds.utils.uuid();

//     const groupId =
//         options.PricelistGroupID ||
//         sourceHeader.PricelistGroupID ||
//         cds.utils.uuid();

//     const headerCopy = cleanForInsert(sourceHeader);

//     headerCopy.ID = targetHeaderId;
//     headerCopy.PricelistGroupID = groupId;
//     headerCopy.Status = sourceHeader.Status;
//     headerCopy.Version = sourceHeader.Version;
//     headerCopy.IsVersionActive = true;

//     await tx.run(
//         INSERT.into(PricelistData).entries(headerCopy)
//     );

//     await copyPricelistItemData(
//         tx,
//         PricelistItemData,
//         sourceHeaderId,
//         targetHeaderId
//     );

//     await copyProductPriceList(
//         tx,
//         ProductPriceList,
//         sourceHeaderId,
//         targetHeaderId
//     );

//     return {
//         sourceHeaderId,
//         targetHeaderId,
//         PricelistGroupID: groupId
//     };
// }

async function createWorkingRevision(tx, entities, sourceHeader, targetStatus = "For Revision") {
    const {
        PricelistData,
        PricelistItemData,
        ProductPriceList
    } = entities;

    if (!sourceHeader?.ID) {
        throw new Error("Published pricelist header is required.");
    }

    if (sourceHeader.Status !== PUBLISHED) {
        throw new Error("Only Published pricelists can be moved to a working revision.");
    }

    if (sourceHeader.IsVersionActive !== true) {
        throw new Error("Only the active Published version can be moved to a working revision.");
    }

    const sourceHeaderId = sourceHeader.ID;
    const targetHeaderId = cds.utils.uuid();

    const groupId = sourceHeader.PricelistGroupID || cds.utils.uuid();

    if (!sourceHeader.PricelistGroupID) {
        await tx.run(
            UPDATE(PricelistData)
                .set({ PricelistGroupID: groupId })
                .where({ ID: sourceHeader.ID })
        );

        sourceHeader.PricelistGroupID = groupId;
    }

    const existingWorkingRevision = await tx.run(
        SELECT.one
            .from(PricelistData)
            .where([
                { ref: ["PricelistGroupID"] }, "=", { val: groupId },
                "and",
                { ref: ["Status"] }, "!=", { val: PUBLISHED }
            ])
            .columns("ID", "Status", "Version")
    );

    if (existingWorkingRevision) {
        throw new Error(`A working revision already exists with version ${existingWorkingRevision.Version}.`);
    }

    const targetVersion = computeVersion(sourceHeader.Version || "0.1",PUBLISHED,targetStatus,sourceHeader.EffectiveDate);

    const headerCopy = cleanForInsert(sourceHeader);

    headerCopy.ID = targetHeaderId;
    headerCopy.PricelistGroupID = groupId;
    headerCopy.Status = targetStatus;
    headerCopy.Version = targetVersion;
    headerCopy.IsVersionActive = false;
    headerCopy.PublishedDate = null;
    headerCopy.PublishedBy = null;

    await tx.run(INSERT.into(PricelistData).entries(headerCopy));

    await copyPricelistItemData(tx,PricelistItemData,sourceHeaderId,targetHeaderId);
    await copyProductPriceList(tx,ProductPriceList,sourceHeaderId,targetHeaderId);

    return await tx.run(
        SELECT.one
            .from(PricelistData)
            .where({ ID: targetHeaderId })
    );
}

async function copyPricelistItemData(tx, PricelistItemData, sourceHeaderId, targetHeaderId) {
    const sourceRows = await tx.run(
        SELECT.from(PricelistItemData).where({ pricelist_ID: sourceHeaderId })
    );

    if (!sourceRows?.length) return [];

    const idMap = new Map();

    const copies = sourceRows.map(row => {
        const newId = cds.utils.uuid();
        idMap.set(row.ID, newId);

        const copy = cleanForInsert(row);
        copy.ID = newId;
        copy.pricelist_ID = targetHeaderId;

        return copy;
    });

    for (const copy of copies) {
        if (copy.parent_ID && idMap.has(copy.parent_ID)) {
            copy.parent_ID = idMap.get(copy.parent_ID);
        }
    }

    await tx.run(
        INSERT.into(PricelistItemData).entries(copies)
    );

    return copies;
}

async function copyProductPriceList(tx, ProductPriceList, sourceHeaderId, targetHeaderId) {
    const sourceRows = await tx.run(
        SELECT.from(ProductPriceList).where({ pricelist_ID: sourceHeaderId })
    );

    if (!sourceRows?.length) return [];

    const idMap = new Map();

    const copies = sourceRows.map(row => {
        const newId = cds.utils.uuid();
        idMap.set(row.ID, newId);

        const copy = cleanForInsert(row);
        copy.ID = newId;
        copy.pricelist_ID = targetHeaderId;

        return copy;
    });

    for (const copy of copies) {
        if (copy.parent_ID && idMap.has(copy.parent_ID)) {
            copy.parent_ID = idMap.get(copy.parent_ID);
        }
    }

    await tx.run(
        INSERT.into(ProductPriceList).entries(copies)
    );

    return copies;
}

async function deactivateOtherPublishedVersions(tx, PricelistData, groupId, currentHeaderId) {
    if (!groupId || !currentHeaderId) return;

    await tx.run(
        UPDATE(PricelistData)
            .set({ IsVersionActive: false })
            .where([
                { ref: ["PricelistGroupID"] }, "=", { val: groupId },
                "and",
                { ref: ["Status"] }, "=", { val: PUBLISHED },
                "and",
                { ref: ["ID"] }, "!=", { val: currentHeaderId }
            ])
    );
}

async function rejectInactivePublishedHeader(req, PricelistData) {
    const ID = getRequestId(req);
    if (!ID) return;

    const tx = cds.tx(req);

    const row = await tx.run(
        SELECT.one.from(PricelistData)
            .where({ ID })
            .columns("ID", "Status", "IsVersionActive")
    );

    if (row?.Status === PUBLISHED && row?.IsVersionActive === false) {
        return req.reject(403, "Inactive published versions are read-only.");
    }
}

async function rejectInactivePublishedChild(req, entities, childEntity) {
    const { PricelistData } = entities;
    const tx = cds.tx(req);

    let pricelistId =
        req.data?.pricelist_ID ||
        req.params?.[0]?.pricelist_ID;

    const childId = getRequestId(req);

    if (!pricelistId && childId) {
        const child = await tx.run(
            SELECT.one.from(childEntity)
                .where({ ID: childId })
                .columns("ID", "pricelist_ID")
        );

        pricelistId = child?.pricelist_ID;
    }

    if (!pricelistId) return;

    const header = await tx.run(
        SELECT.one.from(PricelistData)
            .where({ ID: pricelistId })
            .columns("ID", "Status", "IsVersionActive")
    );

    if (header?.Status === PUBLISHED && header?.IsVersionActive === false) {
        return req.reject(403, "Inactive published versions are read-only.");
    }
}

module.exports = {
    PUBLISHED,
    handlePricelistCreate,
    handlePricelistSave,
    // preservePublishedVersion,
    copyPricelistItemData,
    copyProductPriceList,
    createWorkingRevision,
    deactivateOtherPublishedVersions,
    rejectInactivePublishedHeader,
    rejectInactivePublishedChild
};