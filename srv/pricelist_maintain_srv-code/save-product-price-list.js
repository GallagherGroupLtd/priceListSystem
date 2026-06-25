const cds = require("@sap/cds");
const { UPDATE } = cds.ql;
const logHeaderChanges = require('./log-header-changes');

const logTreeChanges = require('./log-tree-changes');

const { STORED_FIELDS } = require('./constants');

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
            .columns("ID", ...STORED_FIELDS)
            .where(headerWhere)
    );

    const existingIds = new Set(existingRows.map((r) => r.ID));

    console.log("[saveProductPriceList] existing rows:", existingRows.length);

    const flatRows = [];
    const seenIds = new Set();

    const flatten = (aNodes, sParentId) => {
        aNodes.forEach((oNode, iIndex) => {
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

            //Added additional parameter: IsDeleted: false, to ensure that when refreshing the pricelist, already deleted items are not bought back.
            flatRows.push({
                ...currentHeader,
                ID: sId,
                parent_ID: sParentId,
                ...pick(oNode, STORED_FIELDS),
                OrderIndex: iIndex,
                IsDeleted: false
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
    const idsToDelete = [...existingIds].filter((id) => !seenIds.has(id));

    if (flatRows.length === 0 && idsToDelete.length === 0) {
        return req.error(400, "No rows to save. Submitted tree is empty.");
    }

    try {

        if (flatRows.length > 0) {
            await tx.run(UPSERT.into(ProductPriceList).entries(flatRows));
        }

        if (idsToDelete.length > 0) {
            await tx.run(
                // DELETE.from(ProductPriceList).where({
                //     ID: { in: idsToDelete }
                // })
                //Added update instead of delete, so that when refreshing the pricelist, already deleted items are not bought back.
                UPDATE(ProductPriceList)
                    .set({ IsDeleted: true })
                    .where({
                        ID: { in: idsToDelete }
                    })
            );
        }

        await logHeaderChanges(srv, tx, req, originalHeader, header, headerId);
        await logTreeChanges(srv, tx, req, existingRows, flatRows, idsToDelete);

        await tx.commit();

        console.log("[saveProductPriceList] save completed");
        return "Successfully Saved.";

    } catch (e) {
        await tx.rollback();
        console.error("[saveProductPriceList] save failed:", e.message);
        return req.error(500, `Save failed: ${e.message}`);
    }

};