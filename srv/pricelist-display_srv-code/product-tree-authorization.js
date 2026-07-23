const { SELECT } = cds.ql;

const normalize = (value) => String(value === null || value === undefined ? "" : value).trim();
const escapeSql = (value) => normalize(value).replace(/'/g, "''");

 // Loads the selected customer's classification. The customer lookup is restricted by the sales organization and distribution channel of the displayed pricelist.
async function getCustomerClassification({extdb,customerNumber,salesOrg,distChannel}) {
    const customer = escapeSql(customerNumber);
    const salesOrganization = escapeSql(salesOrg);
    const distributionChannel = escapeSql(distChannel);

    if (!customer) {
        return "";
    }

    const conditions = [`"CUSTOMER" = '${customer}'`];

    if (salesOrganization) {
        conditions.push(`"SALES_ORGANIZATION" = '${salesOrganization}'`);
    }

    if (distributionChannel) {
        conditions.push(`"DISTRIBUTION_CHANNEL" = '${distributionChannel}'`);
    }

    const rows = await extdb.run(`
        SELECT
            "CUSTOMER_CLASSIFICATION"
        FROM SAPECC.T_CUSTOMER_MASTER_DATA
        WHERE ${conditions.join(" AND ")}
    `);

    return normalize(Array.isArray(rows) && rows.length ? rows[0].CUSTOMER_CLASSIFICATION : "");
}

async function getMaterialClassifications({extdb,materialIds,salesOrg,distChannel}) {
    const uniqueMaterialIds = [
        ...new Set((materialIds || []).map(normalize).filter(Boolean))
    ];

    if (!uniqueMaterialIds.length) {
        return new Map();
    }

    const materialValues = uniqueMaterialIds.map((materialId) => `'${escapeSql(materialId)}'`).join(",");

    const conditions = [`"MATERIAL" IN (${materialValues})`];
    const salesOrganization = escapeSql(salesOrg);
    const distributionChannel = escapeSql(distChannel);

    if (salesOrganization) {
        conditions.push(`("SALES_ORGANIZATION" = '${salesOrganization}' OR "SALES_ORGANIZATION" IS NULL OR "SALES_ORGANIZATION" = '')`);
    }

    if (distributionChannel) {
        conditions.push(`("DISTRIBUTION_CHANNEL" = '${distributionChannel}' OR "DISTRIBUTION_CHANNEL" IS NULL OR "DISTRIBUTION_CHANNEL" = '')`);
    }

    const rows = await extdb.run(`
        SELECT
            "MATERIAL",
            "MATERIAL_GROUP_2"
        FROM SAPECC.T_MATERIAL_MASTER_DATA
        WHERE ${conditions.join(" AND ")}
    `);

    const classificationByMaterial = new Map();

    (rows || []).forEach((row) => {
        const materialId = normalize(row.MATERIAL);
        const classification = normalize(row.MATERIAL_GROUP_2);

        if (materialId && !classificationByMaterial.has(materialId)) {
            classificationByMaterial.set(materialId,classification);
        }
    });

    return classificationByMaterial;
}

/**
 * Retains allowed products and every ancestor required to display them.
 * Empty category and subcategory branches are removed automatically.
 */
function pruneTreeRows(rows, allowedProductIds) {
    const rowById = new Map((rows || []).map((row) => [normalize(row.ID),row]));
    const retainedIds = new Set();

    (rows || []).forEach((row) => {
        const rowId = normalize(row.ID);

        if (normalize(row.Kind) !== "Product" || !allowedProductIds.has(rowId)) {
            return;
        }

        retainedIds.add(rowId);
        let parentId = normalize(row.parent_ID);

        while (parentId && !retainedIds.has(parentId)) {
            retainedIds.add(parentId);
            const parentRow = rowById.get(parentId);
            parentId = parentRow ? normalize(parentRow.parent_ID) : "";
        }
    });

    return (rows || []).filter((row) => retainedIds.has(normalize(row.ID)));
}

async function getAuthorizedProductTree({db,extdb,ProductPriceList,PricelistData,pricelistId,customerNumber}) {
    const pricelist = await db.run(
        SELECT.one
            .from(PricelistData)
            .columns("ID","SalesOrg","DistChannel")
            .where({ID: pricelistId})
    );

    if (!pricelist) {
        return {
            status: 404,
            message: "Pricelist not found."
        };
    }

    const rows = await db.run(
        SELECT
            .from(ProductPriceList)
            .where({
                pricelist_ID: pricelistId,
                IsDeleted: {
                    "!=": true
                }
            })
            .orderBy("OrderIndex")
    );

    if (!Array.isArray(rows) || !rows.length) {
        return {
            rows: []
        };
    }

    const customerClassification = await getCustomerClassification({extdb,customerNumber,salesOrg: pricelist.SalesOrg,distChannel: pricelist.DistChannel});

    if (!customerClassification) {
        return {
            status: 404,
            message:
                `No customer classification was found for customer ${customerNumber}.`
        };
    }

    const productRows = rows.filter((row) => normalize(row.Kind) === "Product");
    const materialIds = productRows.map((row) => normalize(row.MaterialKey || row.Title)).filter(Boolean);
    const classificationByMaterial = await getMaterialClassifications({extdb,materialIds,salesOrg: pricelist.SalesOrg,distChannel: pricelist.DistChannel});

    const allowedProductIds = new Set();

    productRows.forEach((row) => {
        const materialId = normalize(row.MaterialKey || row.Title);
        const materialClassification = normalize(classificationByMaterial.get(materialId));

        if (materialClassification && materialClassification === customerClassification) {
            allowedProductIds.add(normalize(row.ID));
        }
    });

    return {
        rows: pruneTreeRows(rows,allowedProductIds)
    };
}

module.exports = {
    getAuthorizedProductTree
};