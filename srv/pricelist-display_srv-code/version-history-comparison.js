const cds = require("@sap/cds");
const { getVersionNumber } = require("../pricelist_maintain_srv-code/version-helper");

const { SELECT } = cds.ql;

module.exports = async function buildVersionHistoryComparison(service, req) {
    // comparison implementation
    const { pricelistId } = req.data || {};

    if (!pricelistId) {
        return req.error(400, "Pricelist ID is required.");
    }

    const {PricelistData,ProductPriceList} = service.entities;

    const tx = cds.tx(req);

    const currentHeader = await tx.run(
        SELECT.one.from(PricelistData).columns(
            "ID",
            "PricelistGroupID",
            "Version",
            "Status",
            "PublishedDate",
            "PublishedBy",
            "TermsAndConditions",
            "Notes"
        ).where({ ID: pricelistId })
    );

    if (!currentHeader) {
        return req.error(404, "Pricelist not found.");
    }

    if (currentHeader.Status !== "Published") {
        return req.error(400,"Version History is available only for published pricelists.");
    }

    const groupId = currentHeader.PricelistGroupID || currentHeader.ID;

    let publishedHeaders = await tx.run(
        SELECT.from(PricelistData).columns(
            "ID",
            "PricelistGroupID",
            "Version",
            "Status",
            "PublishedDate",
            "PublishedBy",
            "TermsAndConditions",
            "Notes"
        ).where({
            PricelistGroupID: groupId,
            Status: "Published"
        })
    );

    if (!publishedHeaders.some(header => String(header.ID) === String(currentHeader.ID))) {
        const legacyHeader = await tx.run(
            SELECT.one.from(PricelistData).columns(
                "ID",
                "PricelistGroupID",
                "Version",
                "Status",
                "PublishedDate",
                "PublishedBy",
                "TermsAndConditions",
                "Notes"
            ).where({
                ID: groupId,
                Status: "Published"
            })
        );

        if (legacyHeader) {
            publishedHeaders.push(legacyHeader);
        }
    }
    publishedHeaders = publishedHeaders.filter(header => header.Status === "Published").sort((left, right) => getVersionNumber(left.Version) - getVersionNumber(right.Version));
    const currentIndex = publishedHeaders.findIndex(header => String(header.ID) === String(currentHeader.ID));

    if (currentIndex < 0) {
        return req.error(404,"The current published version was not found in its version group.");
    }

    const previousHeader = currentIndex > 0 ? publishedHeaders[currentIndex - 1] : null;
    const currentSnapshot = await readProductSnapshot(tx,ProductPriceList,currentHeader.ID);
    const currentRows = buildSnapshotRows(currentSnapshot);

    if (!previousHeader) {
        const firstVersionRows = currentRows.map(row => createFirstVersionRow(row));
        const currentPricelist = sortRowsHierarchically(firstVersionRows);
        const upcomingPrices = buildFilteredHierarchy(firstVersionRows,row => hasValue(row.updatedFuturePrice));

        return {
            currentVersion: currentHeader.Version || "",
            previousVersion: "",
            hasPreviousVersion: false,

            summary: {
                totalChanges: 0,
                currentPricelistCount: countBusinessRows(currentPricelist),
                updatesCount: 0,
                upcomingPriceCount: countMatchingRows(upcomingPrices,row => hasValue(row.updatedFuturePrice)),
                addedRemovedCount: 0,
                termsNotesCount: 0
            },

            currentPricelist,
            pricelistUpdates: [],
            upcomingPrices,
            addedRemovedProducts: [],
            termsNotesUpdates: []
        };
    }

    const previousSnapshot = await readProductSnapshot(tx,ProductPriceList,previousHeader.ID);
    const previousRows = buildSnapshotRows(previousSnapshot);
    const mergedRows = buildComparisonRows(previousRows,currentRows);
    const headerComparisonRow = buildHeaderComparisonRow(previousHeader,currentHeader);
    const currentPricelist = sortRowsHierarchically(mergedRows.filter(row => !row.isRemoved));

    const pricelistUpdates = buildFilteredHierarchy(mergedRows,row => row.hasDescriptionChange || row.hasPriceChange || row.hasDiscountChange || row.hasFuturePriceChange || row.isAdded || row.isRemoved);
    const upcomingPrices = buildFilteredHierarchy(mergedRows,row => !row.isRemoved && hasValue(row.updatedFuturePrice));

    const addedRemovedProducts = buildFilteredHierarchy(mergedRows,row => row.isAdded || row.isRemoved);

    let termsNotesUpdates = buildFilteredHierarchy(mergedRows,row => row.hasTermsChange || row.hasNotesChange);

    if (headerComparisonRow) {
        termsNotesUpdates = [
            headerComparisonRow,
            ...termsNotesUpdates
        ];
    }

    const hierarchyChangeCount = mergedRows.filter(row => row.isChanged && !row.isStructuralOnly).length;
    const headerChangeCount = headerComparisonRow ? 1 : 0;

    return {
        currentVersion: currentHeader.Version || "",
        previousVersion: previousHeader.Version || "",
        hasPreviousVersion: true,
        summary: {
            totalChanges: hierarchyChangeCount + headerChangeCount,
            currentPricelistCount: countBusinessRows(currentPricelist),
            updatesCount: countMatchingRows(pricelistUpdates,row => row.hasDescriptionChange || row.hasPriceChange || row.hasDiscountChange || row.hasFuturePriceChange || row.isAdded || row.isRemoved),
            upcomingPriceCount: countMatchingRows(upcomingPrices,row => !row.isRemoved && hasValue(row.updatedFuturePrice)),
            addedRemovedCount: countMatchingRows(addedRemovedProducts,row => row.isAdded || row.isRemoved),
            termsNotesCount: countMatchingRows(termsNotesUpdates,row => row.hasTermsChange || row.hasNotesChange)
        },
        currentPricelist,
        pricelistUpdates,
        upcomingPrices,
        addedRemovedProducts,
        termsNotesUpdates
    };
};

async function readProductSnapshot(tx,ProductPriceList,pricelistId) {
    return tx.run(
        SELECT.from(ProductPriceList).columns(
            "ID",
            "parent_ID",
            "pricelist_ID",
            "MaterialKey",
            "Kind",
            "CategoryLevel",
            "Title",
            "Description",
            "OrderIndex",
            "IsDeleted",
            "Price",
            "PriceUnit",
            "PriceValidFrom",
            "PriceValidTo",
            "DiscountRate",
            "DiscountValidFrom",
            "DiscountValidTo",
            "FuturePrice",
            "FuturePriceValidFrom",
            "FuturePriceValidTo",
            "TermsAndConditions",
            "Notes"
        ).where({
            pricelist_ID: pricelistId
        })
    );
}

function buildSnapshotRows(snapshotRows) {
    const rowsById = new Map(snapshotRows.map(row => [String(row.ID),row]));

    const keyCache = new Map();
    const parentKeyCache = new Map();

    return snapshotRows
        .filter(row => !row.IsDeleted)
        .map(row => {
            const rowKey = buildBusinessKey(row,rowsById,keyCache);
            const parentKey = buildParentBusinessKey(row,rowsById,keyCache,parentKeyCache);

            return {
                sourceId: String(row.ID),
                rowKey,
                parentKey,
                kind: row.Kind || "",
                categoryLevel: row.CategoryLevel === null || row.CategoryLevel === undefined ? null : Number(row.CategoryLevel),
                title: row.Title || "",
                description: row.Description || "",
                materialKey: row.MaterialKey || "",
                orderIndex: row.OrderIndex === null || row.OrderIndex === undefined ? 0 : Number(row.OrderIndex),
                price: row.Price,
                priceUnit: row.PriceUnit,
                priceValidFrom: row.PriceValidFrom,
                priceValidTo: row.PriceValidTo,
                discountRate: row.DiscountRate,
                discountValidFrom: row.DiscountValidFrom,
                discountValidTo: row.DiscountValidTo,
                futurePrice: row.FuturePrice,
                futurePriceValidFrom: row.FuturePriceValidFrom,
                futurePriceValidTo: row.FuturePriceValidTo,
                termsAndConditions: row.TermsAndConditions,
                notes: row.Notes
            };
        }
    );
}

function buildBusinessKey(row,rowsById,keyCache) {
    const rowId = String(row.ID);

    if (keyCache.has(rowId)) {
        return keyCache.get(rowId);
    }

    const parentPath = buildParentPath(row,rowsById);

    const kind = normalizeKeyPart(row.Kind);
    const level = row.CategoryLevel === null || row.CategoryLevel === undefined ? "" : String(row.CategoryLevel);
    const title = normalizeKeyPart(row.Title);

    let rowKey;

    if (isProductRow(row)) {
        rowKey = ["PRODUCT",parentPath,title].join("|");
    } else {
        rowKey = [kind || "CATEGORY",level,parentPath,title].join("|");
    }

    keyCache.set(rowId, rowKey);

    return rowKey;
}

function buildParentBusinessKey(row,rowsById,keyCache,parentKeyCache) {
    const rowId = String(row.ID);

    if (parentKeyCache.has(rowId)) {
        return parentKeyCache.get(rowId);
    }

    if (!row.parent_ID) {
        parentKeyCache.set(rowId, null);
        return null;
    }

    const parentRow = rowsById.get(
        String(row.parent_ID)
    );

    if (!parentRow || parentRow.IsDeleted) {
        parentKeyCache.set(rowId, null);
        return null;
    }

    const parentKey = buildBusinessKey(parentRow,rowsById,keyCache);

    parentKeyCache.set(rowId, parentKey);

    return parentKey;
}

function buildParentPath(row,rowsById) {
    const pathParts = [];
    const visitedIds = new Set();

    let parentId = row.parent_ID;

    while (parentId) {
        const normalizedParentId = String(parentId);

        if (visitedIds.has(normalizedParentId)) {
            break;
        }

        visitedIds.add(normalizedParentId);
        const parentRow = rowsById.get(normalizedParentId);

        if (!parentRow) {
            break;
        }

        pathParts.unshift(normalizeKeyPart(parentRow.Title));
        parentId = parentRow.parent_ID;
    }

    return pathParts.join("/");
}

function normalizeKeyPart(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function isProductRow(row) {
    return normalizeKeyPart(row.Kind) === "PRODUCT";
}

function createFirstVersionRow(currentRow) {
    return {
        rowKey: currentRow.rowKey,
        parentKey: currentRow.parentKey,

        kind: currentRow.kind,
        categoryLevel: currentRow.categoryLevel,
        title: currentRow.title,
        description: currentRow.description,
        previousDescription: "",
        updatedDescription: currentRow.description,
        materialKey: currentRow.materialKey,
        orderIndex: currentRow.orderIndex,

        previousPrice: "",
        updatedPrice: toDisplayValue(currentRow.price),
        priceUnit: currentRow.priceUnit || "",

        previousPriceValidFrom: null,
        updatedPriceValidFrom: currentRow.priceValidFrom || null,

        previousPriceValidTo: null,
        updatedPriceValidTo: currentRow.priceValidTo || null,

        percentageChange: "",
        priceDirection: "NOT_COMPARABLE",

        previousDiscountRate: "",
        updatedDiscountRate: toDisplayValue(currentRow.discountRate),

        previousDiscountValidFrom: null,
        updatedDiscountValidFrom: currentRow.discountValidFrom || null,

        previousDiscountValidTo: null,
        updatedDiscountValidTo: currentRow.discountValidTo || null,

        previousFuturePrice: "",
        updatedFuturePrice: toDisplayValue(currentRow.futurePrice),

        previousFuturePriceValidFrom: null,
        updatedFuturePriceValidFrom: currentRow.futurePriceValidFrom || null,

        previousFuturePriceValidTo: null,
        updatedFuturePriceValidTo: currentRow.futurePriceValidTo || null,

        previousTermsAndConditions: "",
        updatedTermsAndConditions: currentRow.termsAndConditions || "",

        previousNotes: "",
        updatedNotes: currentRow.notes || "",

        changeType: "UNCHANGED",

        isChanged: false,
        isAdded: false,
        isRemoved: false,
        isStructuralOnly: false,

        hasPriceChange: false,
        hasDiscountChange: false,
        hasFuturePriceChange: false,
        hasTermsChange: false,
        hasNotesChange: false,
        hasDescriptionChange: false
    };
}

function buildComparisonRows(
    previousRows,
    currentRows
) {
    const previousByKey = new Map(
        previousRows.map(row => [
            row.rowKey,
            row
        ])
    );

    const currentByKey = new Map(
        currentRows.map(row => [
            row.rowKey,
            row
        ])
    );

    const allKeys = new Set([
        ...previousByKey.keys(),
        ...currentByKey.keys()
    ]);

    return Array.from(allKeys).map(rowKey => {
        const previousRow =
            previousByKey.get(rowKey) || null;

        const currentRow =
            currentByKey.get(rowKey) || null;

        return createComparisonRow(
            previousRow,
            currentRow
        );
    });
}

function createComparisonRow(previousRow, currentRow) {
    const effectiveRow = currentRow || previousRow;
    const isAdded = !previousRow && Boolean(currentRow);
    const isRemoved = Boolean(previousRow) && !currentRow;
    const hasPriceChange = (Boolean(previousRow && currentRow) && (
        !areValuesEqual(previousRow.price,currentRow.price) ||
        !areValuesEqual(previousRow.priceUnit,currentRow.priceUnit) ||
        !areValuesEqual(previousRow.priceValidFrom,currentRow.priceValidFrom) ||
        !areValuesEqual(previousRow.priceValidTo,currentRow.priceValidTo))) || (
        isAdded && (hasValue(currentRow?.price) || hasValue(currentRow?.priceUnit) || hasValue(currentRow?.priceValidFrom) || hasValue(currentRow?.priceValidTo))) || (
        isRemoved && (hasValue(previousRow?.price) || hasValue(previousRow?.priceUnit) || hasValue(previousRow?.priceValidFrom) || hasValue(previousRow?.priceValidTo))
    );

    const hasDiscountChange = (Boolean(previousRow && currentRow) && (
        !areValuesEqual(previousRow.discountRate,currentRow.discountRate) ||
        !areValuesEqual(previousRow.discountValidFrom,currentRow.discountValidFrom) ||
        !areValuesEqual(previousRow.discountValidTo,currentRow.discountValidTo))) || (
        isAdded && (hasValue(currentRow?.discountRate) || hasValue(currentRow?.discountValidFrom) || hasValue(currentRow?.discountValidTo))) || (
        isRemoved && (hasValue(previousRow?.discountRate) || hasValue(previousRow?.discountValidFrom) || hasValue(previousRow?.discountValidTo))
    );

    const hasFuturePriceChange = (Boolean(previousRow && currentRow) && (
        !areValuesEqual(previousRow.futurePrice,currentRow.futurePrice) ||
        !areValuesEqual(previousRow.futurePriceValidFrom,currentRow.futurePriceValidFrom) ||
        !areValuesEqual(previousRow.futurePriceValidTo,currentRow.futurePriceValidTo))) || (
        isAdded && (hasValue(currentRow?.futurePrice) || hasValue(currentRow?.futurePriceValidFrom) || hasValue(currentRow?.futurePriceValidTo))) || (
        isRemoved && (hasValue(previousRow?.futurePrice) || hasValue(previousRow?.futurePriceValidFrom) || hasValue(previousRow?.futurePriceValidTo))
    );
    const hasTermsChange = (Boolean(previousRow && currentRow) && 
        !areValuesEqual(previousRow.termsAndConditions,currentRow.termsAndConditions)) || (
        isAdded && hasValue(currentRow?.termsAndConditions)) || (
        isRemoved && hasValue(previousRow?.termsAndConditions)
    );

    const hasNotesChange = (Boolean(previousRow && currentRow) &&
        !areValuesEqual(previousRow.notes,currentRow.notes)) || (
        isAdded && hasValue(currentRow?.notes)) || (
        isRemoved && hasValue(previousRow?.notes)
    );
    const hasDescriptionChange = Boolean(previousRow && currentRow) && !areValuesEqual(previousRow.description,currentRow.description);

    const isChanged = isAdded || isRemoved || hasPriceChange || hasDiscountChange || hasFuturePriceChange || hasTermsChange || hasNotesChange || hasDescriptionChange;

    let changeType = "UNCHANGED";

    if (isAdded) {
        changeType = "ADDED";
    } else if (isRemoved) {
        changeType = "REMOVED";
    } else if (isChanged) {
        changeType = "UPDATED";
    }

    const priceDirection = calculatePriceDirection(previousRow?.price,currentRow?.price,isAdded,isRemoved);

    return {
        rowKey: effectiveRow.rowKey,
        parentKey: effectiveRow.parentKey,

        kind: effectiveRow.kind,
        categoryLevel: effectiveRow.categoryLevel,

        title: effectiveRow.title,
        description: currentRow ? currentRow.description || "" : previousRow?.description || "",
        previousDescription: previousRow?.description || "",
        updatedDescription: currentRow?.description || "",

        materialKey: effectiveRow.materialKey,
        orderIndex: effectiveRow.orderIndex,

        previousPrice: toDisplayValue(previousRow?.price),
        updatedPrice: toDisplayValue(currentRow?.price),

        priceUnit: currentRow ? currentRow.priceUnit || "" : previousRow?.priceUnit || "",

        previousPriceValidFrom: previousRow?.priceValidFrom || null,
        updatedPriceValidFrom: currentRow?.priceValidFrom || null,

        previousPriceValidTo: previousRow?.priceValidTo || null,
        updatedPriceValidTo: currentRow?.priceValidTo || null,

        percentageChange: calculatePercentageChange(previousRow?.price,currentRow?.price),

        priceDirection,

        previousDiscountRate: toDisplayValue(previousRow?.discountRate),
        updatedDiscountRate: toDisplayValue(currentRow?.discountRate),

        previousDiscountValidFrom: previousRow?.discountValidFrom || null,
        updatedDiscountValidFrom: currentRow?.discountValidFrom || null,

        previousDiscountValidTo: previousRow?.discountValidTo || null,
        updatedDiscountValidTo: currentRow?.discountValidTo || null,

        previousFuturePrice: toDisplayValue(previousRow?.futurePrice),
        updatedFuturePrice: toDisplayValue(currentRow?.futurePrice),

        previousFuturePriceValidFrom: previousRow?.futurePriceValidFrom || null,
        updatedFuturePriceValidFrom: currentRow?.futurePriceValidFrom || null,

        previousFuturePriceValidTo: previousRow?.futurePriceValidTo || null,
        updatedFuturePriceValidTo: currentRow?.futurePriceValidTo || null,

        previousTermsAndConditions: previousRow?.termsAndConditions || "",
        updatedTermsAndConditions: currentRow?.termsAndConditions || "",

        previousNotes: previousRow?.notes || "",
        updatedNotes: currentRow?.notes || "",

        changeType,

        isChanged,
        isAdded,
        isRemoved,
        isStructuralOnly: false,

        hasPriceChange,
        hasDiscountChange,
        hasFuturePriceChange,
        hasTermsChange,
        hasNotesChange,
        hasDescriptionChange
    };
}

function buildHeaderComparisonRow(previousHeader,currentHeader) {
    const hasTermsChange = !areValuesEqual(previousHeader.TermsAndConditions,currentHeader.TermsAndConditions);
    const hasNotesChange = !areValuesEqual(previousHeader.Notes,currentHeader.Notes);

    if (!hasTermsChange && !hasNotesChange) {
        return null;
    }

    return {
        rowKey: "__PRICELIST_HEADER__",
        parentKey: null,

        kind: "Pricelist",
        categoryLevel: -1,
        title: "Pricelist",
        description: "",
        previousDescription: "",
        updatedDescription: "",
        materialKey: "",
        orderIndex: -1,

        previousPrice: "",
        updatedPrice: "",
        priceUnit: "",

        previousPriceValidFrom: null,
        updatedPriceValidFrom: null,
        previousPriceValidTo: null,
        updatedPriceValidTo: null,

        percentageChange: "",
        priceDirection: "NOT_COMPARABLE",

        previousDiscountRate: "",
        updatedDiscountRate: "",
        previousDiscountValidFrom: null,
        updatedDiscountValidFrom: null,
        previousDiscountValidTo: null,
        updatedDiscountValidTo: null,

        previousFuturePrice: "",
        updatedFuturePrice: "",
        previousFuturePriceValidFrom: null,
        updatedFuturePriceValidFrom: null,
        previousFuturePriceValidTo: null,
        updatedFuturePriceValidTo: null,

        previousTermsAndConditions: previousHeader.TermsAndConditions || "",
        updatedTermsAndConditions: currentHeader.TermsAndConditions || "",

        previousNotes: previousHeader.Notes || "",
        updatedNotes: currentHeader.Notes || "",

        changeType: "UPDATED",

        isChanged: true,
        isAdded: false,
        isRemoved: false,
        isStructuralOnly: false,

        hasPriceChange: false,
        hasDiscountChange: false,
        hasFuturePriceChange: false,
        hasTermsChange,
        hasNotesChange,
        hasDescriptionChange: false
    };
}

function buildFilteredHierarchy(allRows,predicate) {
    const rowsByKey = new Map(allRows.map(row => [row.rowKey,row]));

    const selectedKeys = new Set();

    allRows.forEach(row => {
        if (!predicate(row)) {
            return;
        }

        selectedKeys.add(row.rowKey);

        let parentKey = row.parentKey;

        while (parentKey) {
            selectedKeys.add(parentKey);

            const parentRow = rowsByKey.get(parentKey);

            if (!parentRow) {
                break;
            }

            parentKey = parentRow.parentKey;
        }
    });

    const filteredRows = allRows.filter(row =>
        selectedKeys.has(row.rowKey)
    ).map(row => {
        const isDirectMatch = predicate(row);

        if (isDirectMatch) {
            return {
                ...row,
                isStructuralOnly: false
            };
        }

        return {
            ...row,
            isChanged: false,
            isStructuralOnly: true
        };
    });

    return sortRowsHierarchically(filteredRows);
}

function sortRowsHierarchically(rows) {
    const rowsByParent = new Map();

    rows.forEach(row => {
        const parentKey = row.parentKey || "__ROOT__";

        if (!rowsByParent.has(parentKey)) {
            rowsByParent.set(parentKey,[]);
        }

        rowsByParent.get(parentKey).push(row);
    });

    rowsByParent.forEach(children => {
        children.sort(compareHierarchyRows);
    });

    const result = [];
    const visited = new Set();

    function appendChildren(parentKey) {
        const children = rowsByParent.get(parentKey) || [];

        children.forEach(child => {
            if (visited.has(child.rowKey)) {
                return;
            }

            visited.add(child.rowKey);
            result.push(child);

            appendChildren(child.rowKey);
        });
    }

    appendChildren("__ROOT__");

    rows.filter(row =>
        !visited.has(row.rowKey)
    ).sort(compareHierarchyRows)
    .forEach(row => {
        if (visited.has(row.rowKey)) {
            return;
        }

        visited.add(row.rowKey);
        result.push(row);

        appendChildren(row.rowKey);
    });

    return result;
}

function compareHierarchyRows(left,right) {
    const leftOrder = Number(left.orderIndex || 0);
    const rightOrder = Number(right.orderIndex || 0);

    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }

    return String(left.title || "").localeCompare(String(right.title || ""));
}

function calculatePriceDirection(previousPrice,updatedPrice,isAdded,isRemoved) {
    if (isAdded || isRemoved) {
        return "NOT_COMPARABLE";
    }

    const previousNumber = parseNumericValue(previousPrice);
    const updatedNumber = parseNumericValue(updatedPrice);

    if (previousNumber === null || updatedNumber === null) {
        return "NOT_COMPARABLE";
    }

    if (updatedNumber > previousNumber) {
        return "INCREASE";
    }

    if (updatedNumber < previousNumber) {
        return "DECREASE";
    }

    return "UNCHANGED";
}

function calculatePercentageChange(previousPrice,updatedPrice) {
    const previousNumber = parseNumericValue(previousPrice);
    const updatedNumber = parseNumericValue(updatedPrice);

    if (previousNumber === null || updatedNumber === null || previousNumber === 0) {
        return "";
    }

    const percentage = ((updatedNumber - previousNumber) / previousNumber) * 100;

    return `${percentage.toFixed(2)}%`;
}

function parseNumericValue(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const normalizedValue = String(value).replace(/,/g, "").replace(/%/g, "").trim();

    if (!normalizedValue) {
        return null;
    }

    const numericValue = Number(normalizedValue);

    return Number.isFinite(numericValue) ? numericValue : null;
}

function areValuesEqual(left,right) {
    return normalizeComparableValue(left) === normalizeComparableValue(right);
}

function normalizeComparableValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    return String(value).trim();
}

function toDisplayValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value);
}

function hasValue(value) {
    return !(value === null || value === undefined || String(value).trim() === "");
}

function countBusinessRows(rows) {
    return rows.filter(
        row => !row.isStructuralOnly && row.kind !== "Pricelist" && !row.isRemoved).length;
}

function countMatchingRows(rows,predicate) {
    return rows.filter(row => !row.isStructuralOnly && predicate(row)).length;
}