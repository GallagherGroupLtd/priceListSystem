const { SELECT } = cds.ql;

const normalize = (value) => String(value === null || value === undefined ? "" : value).trim();
const escapeSql = (value) => normalize(value).replace(/'/g, "''");
const normalizeClassification = (value) => normalize(value).toUpperCase();

// Loads the latest customer classification directly by customer numbe
async function getCustomerClassification({extdb,customerNumber}) {
    const customer = escapeSql(customerNumber);
    if (!customer) {
        return "";
    }

    const rows = await extdb.run(`
        SELECT
            "CUSTOMER_CLASSIFICATION",
            "UPDATED_AT",
            "CREATED_AT"
        FROM "SAPECC"."T_CUSTOMER_MASTER_DATA"
        WHERE "CUSTOMER" = '${customer}'
          AND "CUSTOMER_CLASSIFICATION" IS NOT NULL
          AND TRIM("CUSTOMER_CLASSIFICATION") <> ''
        ORDER BY
            SUBSTRING("UPDATED_AT", 1, 19) DESC,
            SUBSTRING("CREATED_AT", 1, 19) DESC
        LIMIT 1
    `);

    return normalizeClassification(Array.isArray(rows) && rows.length ? rows[0].CUSTOMER_CLASSIFICATION : "");
}

async function getProductListingAuthorization({extdb,customerClassification}) {
    const classification = escapeSql(customerClassification);

    if (!classification) {
        return {
            allowedMaterialGroups: new Set(),
            includeSharedProducts: false
        };
    }

    const rows = await extdb.run(`
        SELECT
            "MATERIAL_GROUP_2",
            "SHARED_PRODUCT"
        FROM "SAPECC"."T_PRODUCT_LISTING"
        WHERE UPPER(TRIM("CUSTOMER_CLASSIFICATION")) =
              UPPER(TRIM('${classification}'))
    `);

    const allowedMaterialGroups = new Set();
    let includeSharedProducts = false;

    (rows || []).forEach((row) => {
        const materialGroup = normalizeClassification(row.MATERIAL_GROUP_2);

        if (materialGroup) {
            allowedMaterialGroups.add(materialGroup);
        }

        if (normalizeClassification(row.SHARED_PRODUCT) === "X") {
            includeSharedProducts = true;
        }
    });

    return {
        allowedMaterialGroups,
        includeSharedProducts
    };
}

async function getMaterialAuthorization({extdb,materialIds,salesOrg,distChannel}) {
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
            "MATERIAL_GROUP_2",
            "PRODUCT_ATTRIBUTE_5"
        FROM SAPECC.T_MATERIAL_MASTER_DATA
        WHERE ${conditions.join(" AND ")}
    `);

    const authorizationByMaterial = new Map();
    (rows || []).forEach((row) => {
        const materialId = normalize(row.MATERIAL);
        if (!materialId) {
            return;
        }
        const existing = authorizationByMaterial.get(materialId) || {
            materialGroups: new Set(),
            isShared: false
        };

        const materialGroup = normalizeClassification(row.MATERIAL_GROUP_2);
        if (materialGroup) {
            existing.materialGroups.add(materialGroup);
        }
        if (normalizeClassification(row.PRODUCT_ATTRIBUTE_5) === "X") {
            existing.isShared = true;
        }

        authorizationByMaterial.set(
            materialId,
            existing
        );
    });

    return authorizationByMaterial;
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

    // const customerClassification = await getCustomerClassification({extdb,customerNumber,salesOrg: pricelist.SalesOrg,distChannel: pricelist.DistChannel});
    const customerClassification = await getCustomerClassification({extdb,customerNumber});

    if (!customerClassification) {
        return {
            status: 404,
            message:
                `No customer classification was found for customer ${customerNumber}.`
        };
    }

    const {allowedMaterialGroups,includeSharedProducts} = await getProductListingAuthorization({extdb,customerClassification});

    if (!allowedMaterialGroups.size && !includeSharedProducts) {
        return {
            rows: []
        };
    }

    const productRows = rows.filter((row) => normalize(row.Kind) === "Product");
    const materialIds = productRows.map((row) => normalize(row.Title)).filter(Boolean);
    const authorizationByMaterial = await getMaterialAuthorization({extdb,materialIds,salesOrg: pricelist.SalesOrg,distChannel: pricelist.DistChannel});

    const allowedProductIds = new Set();

    productRows.forEach((row) => {
        const materialId = normalize(row.Title);
        const materialAuthorization =  authorizationByMaterial.get(materialId);
        if (!materialAuthorization) {
            return;
        }
        const hasAllowedMaterialGroup = Array.from(materialAuthorization.materialGroups).some((materialGroup) => allowedMaterialGroups.has(materialGroup));

        const isAllowedSharedProduct = includeSharedProducts && materialAuthorization.isShared;

        if (hasAllowedMaterialGroup || isAllowedSharedProduct) {
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