const STORED_FIELDS = [
    "OrderIndex",
    "Kind",
    "CategoryLevel",
    "Title",
    "Description",
    "MaterialKey",

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
    "SupplierSKU"
];

const HEADER_TRACKED_FIELDS = [
    'PricelistTitle',
    'PricelistType',
    'MarketScopeRegion',
    'MarketScopeCountry',
    'SalesOrg',
    'DistChannel',
    'CustPriceList',
    'CustGroup1',
    'ErpCustomer',
    'DeliveringPlant',
    'Status',
    'PublishedBy',
    'PublishedDate',
    'EffectiveDate',
    'ExpiryDate',
    'Currency',
    'Version',
    'TermsAndConditions',
    'TACDisableExtUser',
    'TACDisableIntUser',
    'Notes',
    'NotesDisableExtUser',
    'NotesDisableIntUser'
];

const LARGE_TEXT_FIELDS = [
    "TermsAndConditions",
    "Notes"
];

const TREE_TRACKED_FIELDS = STORED_FIELDS;

const LARGE_TEXT_CHANGE_MARKER = "[Large text content changed]";

module.exports = { STORED_FIELDS, HEADER_TRACKED_FIELDS, TREE_TRACKED_FIELDS, LARGE_TEXT_FIELDS, LARGE_TEXT_CHANGE_MARKER };