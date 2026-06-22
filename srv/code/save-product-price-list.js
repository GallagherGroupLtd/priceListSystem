// const cds = require('@sap/cds');

// /**
//  * Reconciles the submitted product price list tree with what's already
//  * persisted for this record.
//  *
//  * - Existing rows (matched by ID, looked up under the ORIGINAL header values)
//  *   are UPSERTed in place -> ID, createdAt, createdBy are preserved.
//  * - Nodes with no matching ID (new nodes, or category nodes still carrying a
//  *   synthetic template-generated ID) get a freshly minted UUID.
//  * - Anything that existed before but isn't in the submitted tree anymore is
//  *   treated as user-deleted and removed.
//  *
//  * Exported as a factory so it can be bound to the service instance (`srv`)
//  * at registration time, giving it access to `srv.entities`.
//  */
// module.exports = (srv) => async function saveProductPriceList(req) {
//     const { ProductPriceList } = srv.entities;

//     let header, originalHeader, tree;
//     try {
//         header = JSON.parse(req.data.headerData);
//         originalHeader = JSON.parse(req.data.originalHeaderData);
//         tree = JSON.parse(req.data.treeData);
//     } catch (e) {
//         return req.error(400, `Invalid JSON payload: ${e.message}`);
//     }

//     if (!Array.isArray(tree)) {
//         return req.error(400, 'treeData must be a JSON array.');
//     }

//     // Fields copied as-is from each tree node into the persisted row.
//     // ID, parent, children, and the header/key fields are handled separately below.
//     const STORED_FIELDS = [
//         'OrderIndex', 'Kind', 'CategoryLevel', 'Title', 'Description',
//         'PublishedName', 'TermsAndConditions', 'IsTACDisableExt', 'IsTACDisableInt',
//         'Notes', 'IsNotesDisableExt', 'IsNotesDisableInt',
//         'Price', 'PriceUnit', 'PriceValidFrom', 'PriceValidTo',
//         'DiscountRate', 'DiscountValidFrom', 'DiscountValidTo', 'PriceChangeIndicator',
//         'FuturePrice', 'FuturePriceValidFrom', 'FuturePriceValidTo',
//         'Status', 'StatusValidFromDate', 'StatusValidToDate',
//         'Supplier', 'SupplierSKU'
//     ];

//     const pick = (oNode, aFields) => {
//         const oResult = {};
//         aFields.forEach((sField) => {
//             if (oNode[sField] !== undefined) oResult[sField] = oNode[sField];
//         });
//         return oResult;
//     };

//     // 1. Find rows already persisted for this record, scoped by the ORIGINAL
//     //    header values (the header fields are user-editable, so the live
//     //    `header` may no longer match what's in the DB).
//     const existingRows = await SELECT.from(ProductPriceList).columns('ID').where(originalHeader);
//     const existingIds = new Set(existingRows.map((r) => r.ID));

//     // 2. Walk the submitted tree, resolving real IDs and parent_ID links.
//     const flatRows = [];
//     const seenIds = new Set();

//     const flatten = (aNodes, sParentId) => {
//         aNodes.forEach((oNode) => {
//             const sId = oNode.ID && existingIds.has(oNode.ID) ? oNode.ID : cds.utils.uuid();
//             seenIds.add(sId);

//             flatRows.push({
//                 ID: sId,
//                 ...header,             // current (possibly edited) header values, written on every row
//                 parent_ID: sParentId,
//                 ...pick(oNode, STORED_FIELDS)
//             });

//             if (Array.isArray(oNode.children) && oNode.children.length) {
//                 flatten(oNode.children, sId);
//             }
//         });
//     };
//     flatten(tree, null);

//     // 3. Anything that existed before but wasn't seen in the submitted tree
//     //    was removed by the user (delete is implicit, not separately tracked).
//     const idsToDelete = [...existingIds].filter((id) => !seenIds.has(id));

//     if (flatRows.length) {
//         await UPSERT.into(ProductPriceList).entries(flatRows);
//     }
//     if (idsToDelete.length) {
//         await DELETE.from(ProductPriceList).where({ ID: { in: idsToDelete } });
//     }

//     return 'OK';
// };

const cds = require("@sap/cds");

module.exports = (srv) => async function saveProductPriceList(req) {
    const { ProductPriceList } = srv.entities;
    const tx = cds.tx(req);

    let header, originalHeader, tree;

    try {
        header = JSON.parse(req.data.headerData);
        originalHeader = JSON.parse(req.data.originalHeaderData);
        tree = JSON.parse(req.data.treeData);
    } catch (e) {
        return req.error(400, `Invalid JSON payload: ${e.message}`);
    }

    if (!Array.isArray(tree)) {
        return req.error(400, "treeData must be a JSON array.");
    }

    /**
     * IMPORTANT:
     * Only copy fields that really exist in ProductPriceList
     * and are part of the pricelist header/mapping.
     *
     * Do NOT copy ID, createdAt, createdBy, modifiedAt, modifiedBy, children, parent, etc.
     */
    const normalizeHeader = (oHeader = {}) => {
        return {
            PricelistType: oHeader.PricelistType,
            MarketScopeRegion: oHeader.MarketScopeRegion,
            MarketScopeCountry: oHeader.MarketScopeCountry,
            SalesOrg: oHeader.SalesOrg,
            DistChannel: oHeader.DistChannel,
            CustPriceList: oHeader.CustPriceList,
            CustGroup1: oHeader.CustGroup1,
            ErpCustomer: oHeader.ErpCustomer,
            DeliveringPlant: oHeader.DeliveringPlant
        };
    };

    const cleanObject = (oObject) => {
        const oResult = {};

        Object.keys(oObject).forEach((sKey) => {
            if (
                oObject[sKey] !== undefined &&
                oObject[sKey] !== null &&
                oObject[sKey] !== ""
            ) {
                oResult[sKey] = oObject[sKey];
            }
        });

        return oResult;
    };

    const headerId = header.ID || originalHeader.ID;
    if (!headerId) {
        return req.error(400, "Missing header ID — cannot scope pricelist items.");
    }

    const currentHeader = { ...cleanObject(normalizeHeader(header)), pricelist_ID: headerId };
    const headerWhere = { pricelist_ID: headerId };

    const STORED_FIELDS = [
        "OrderIndex",
        "Kind",
        "CategoryLevel",
        "Title",
        "Description",

        "PublishedName",
        "TermsAndConditions",
        "IsTACDisableExt",
        "IsTACDisableInt",

        "Notes",
        "IsNotesDisableExt",
        "IsNotesDisableInt",

        "Price",
        "PriceUnit",
        "PriceValidFrom",
        "PriceValidTo",

        "DiscountRate",
        "DiscountValidFrom",
        "DiscountValidTo",
        "PriceChangeIndicator",

        "FuturePrice",
        "FuturePriceValidFrom",
        "FuturePriceValidTo",

        "Status",
        "StatusValidFromDate",
        "StatusValidToDate",

        "Supplier",
        "SupplierSKU",

        // Keep this here if ProductPriceList has MaterialKey
        "MaterialKey"
    ];

    const pick = (oNode, aFields) => {
        const oResult = {};

        aFields.forEach((sField) => {
            if (oNode[sField] !== undefined) {
                oResult[sField] = oNode[sField];
            }
        });

        return oResult;
    };

    // console.log("[saveProductPriceList] currentHeader:", currentHeader);
    // console.log("[saveProductPriceList] submitted root nodes:", tree.length);

    const existingRows = await tx.run(
        SELECT.from(ProductPriceList)
            .columns("ID")
            .where(headerWhere)
    );

    const existingIds = new Set(existingRows.map((r) => r.ID));

    console.log("[saveProductPriceList] existing rows:", existingRows.length);

    const flatRows = [];
    const seenIds = new Set();

    const flatten = (aNodes, sParentId) => {
        aNodes.forEach((oNode) => {
            const bReuseExistingId =
                oNode.ID &&
                existingIds.has(oNode.ID);

            const sId = bReuseExistingId
                ? oNode.ID
                : cds.utils.uuid();

            if (seenIds.has(sId)) {
                req.error(400, `Duplicate node ID found in submitted tree: ${sId}`);
                return;
            }

            seenIds.add(sId);

            flatRows.push({
                ...currentHeader,
                ID: sId,
                parent_ID: sParentId,
                ...pick(oNode, STORED_FIELDS)
            });

            if (Array.isArray(oNode.children) && oNode.children.length > 0) {
                flatten(oNode.children, sId);
            }
        });
    };

    // Add this just before flatten() call
    // console.log("[saveProductPriceList] sample node IDs from payload:", 
    //     tree.slice(0, 3).map(n => n.ID));

    flatten(tree, null);

    // console.log("[saveProductPriceList] rows to upsert:", flatRows.length);

    if (flatRows.length === 0) {
        return req.error(400, "No rows to save. Submitted tree is empty.");
    }

    const idsToDelete = [...existingIds].filter((id) => !seenIds.has(id));

    // console.log("[saveProductPriceList] rows to delete:", idsToDelete.length);

    // At the bottom — replace the UPSERT/DELETE block with this:

    try {
        await tx.run(
            UPSERT.into(ProductPriceList).entries(flatRows)
        );

        if (idsToDelete.length > 0) {
            await tx.run(
                DELETE.from(ProductPriceList).where({
                    ID: { in: idsToDelete }
                })
            );
        }

        await tx.commit(); // ← THIS was missing

        console.log("[saveProductPriceList] save completed");
        return "OK";

    } catch (e) {
        await tx.rollback();
        console.error("[saveProductPriceList] save failed:", e.message);
        return req.error(500, `Save failed: ${e.message}`);
    }

};