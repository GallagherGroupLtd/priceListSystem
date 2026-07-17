"use strict";

/**
 * Central Product-tree column configuration for Pricelist Display.
 *
 * This is the single source of truth consumed by:
 * - Pricelist Maintain when publishing a version.
 * - Pricelist Display when applying the published layout.
 *
 * Column IDs must match the IDs declared in:
 * app/pricelistdisplay/webapp/ext/fragment/ProductsTree.fragment.xml
 */
const PRICELIST_DISPLAY_COLUMNS = Object.freeze([
    Object.freeze({
        id: "ColCategoriesAndProducts",
        label: "Categories and Products",
        mandatory: true,
        defaultVisible: true,
        order: 10
    }),
    Object.freeze({
        id: "ColDescription",
        label: "Description",
        mandatory: true,
        defaultVisible: true,
        order: 20
    }),
    Object.freeze({
        id: "ColCountryOfOrigin",
        label: "Country of Origin",
        mandatory: false,
        defaultVisible: true,
        order: 30
    }),
    Object.freeze({
        id: "ColPriceCurrency",
        label: "Price (Currency)",
        mandatory: false,
        defaultVisible: true,
        order: 40
    }),
    Object.freeze({
        id: "ColValidity",
        label: "Price Validity",
        mandatory: false,
        defaultVisible: true,
        order: 50
    }),
    Object.freeze({
        id: "ColDiscountRate",
        label: "Discount",
        mandatory: false,
        defaultVisible: true,
        order: 60
    }),
    Object.freeze({
        id: "ColDiscountEffectiveDate",
        label: "Discount Effective Date",
        mandatory: false,
        defaultVisible: true,
        order: 70
    }),
    Object.freeze({
        id: "ColDiscountExpiryDate",
        label: "Discount Expiry Date",
        mandatory: false,
        defaultVisible: true,
        order: 80
    }),
    Object.freeze({
        id: "ColPriceChangeIndicator",
        label: "Price Change Indicator",
        mandatory: false,
        defaultVisible: true,
        order: 90
    }),
    Object.freeze({
        id: "ColStatus",
        label: "Status",
        mandatory: false,
        defaultVisible: true,
        order: 100
    }),
    Object.freeze({
        id: "ColStatusValidity",
        label: "Status Validity",
        mandatory: false,
        defaultVisible: true,
        order: 110
    }),
    Object.freeze({
        id: "ColSupplier",
        label: "Supplier",
        mandatory: false,
        defaultVisible: true,
        order: 120
    }),
    Object.freeze({
        id: "ColSupplierSKU",
        label: "Supplier SKU",
        mandatory: false,
        defaultVisible: true,
        order: 130
    })
]);

function getPricelistDisplayColumns() {
    return PRICELIST_DISPLAY_COLUMNS.map((column) => ({ ...column })).sort((first, second) => first.order - second.order);
}

module.exports = {
    getPricelistDisplayColumns
};