using PriceListService as srv from '../../srv/service';

// ** Define the columns for the Initial List Page.
annotate srv.TableDirectory with @(
    UI.SelectionFields: [
        tableName,
        description,
    ],
    UI.HeaderInfo: {
        TypeName      : 'Maintenance Table',
        TypeNamePlural: 'Maintenance Tables',
        Title         : { Value: tableName },
        Description   : { Value: description }
    },
    UI.LineItem  : [
        {
            Value: tableName,
            Label: 'Table'
        },
        {
            Value: description,
            Label: 'Description'
        }
    ]
);

/* // Trade Scenarios
annotate srv.TradeScenarios with @(
    UI.SelectionFields: [
        TradeScenario,
        MarketScopeRegion,
        MarketScopeCountry
    ],
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value: TradeScenario,
                Label: 'Trade Scenario'
            },
            {
                $Type : 'UI.DataField',
                Value: MarketScopeRegion,
                Label: 'Region'
            },
            {
                $Type : 'UI.DataField',
                Value: MarketScopeCountry,
                Label: 'Country'
            }
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.HeaderInfo: {
        TypeName      : 'Data Maintenance: Trade Scenario',
        TypeNamePlural: 'Data Maintenance: Trade Scenario',
    },
    UI.LineItem: [
        {
            $Type : 'UI.DataField',
            Value: TradeScenario,
            Label: 'Trade Scenario'
        },
        {
            $Type : 'UI.DataField',
            Value: MarketScopeRegion,
            Label: 'Region'
        },
        {
            $Type : 'UI.DataField',
            Value: MarketScopeCountry,
            Label: 'Country'
        }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { Value: TradeScenario },
            { Value: MarketScopeRegion },
            { Value: MarketScopeCountry }
        ]
    }
); */

/* // Item Structure
annotate srv.ItemStructure with @(
    UI.HeaderInfo: {
        TypeName      : 'Item Structure',
        TypeNamePlural: 'Item Structure'
    },
    UI.LineItem: [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        { Value: SalesOrg },
        { Value: DistChannel },
        { Value: CustPriceList },
        { Value: CustGroup1 },
        { Value: ErpCustomer },
        { Value: DeliveringPlant },
        { Value: MainCategory },
        { Value: Subcategory1 },
        { Value: Subcategory2 },
        { Value: Subcategory3 },
        { Value: Subcategory4 },
        { Value: Subcategory5 }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { 
                Value: TradeScenario,
                @UI: {
                    LineItem: [ { position: 10 }],
                    Importance: @High
                }
            },
            {
                Value: MarketScopeRegion,
                @UI: {
                    LineItem: [ { position: 20 }],
                    Importance: @High
                }
            },
            { 
                Value: MarketScopeCountry,
                @UI: {
                    LineItem: [ { position: 30 }],
                    Importance: @High
                }
            },
            { Value: SalesOrg },
            { Value: DistChannel },
            { Value: CustPriceList },
            { Value: CustGroup1 },
            { Value: ErpCustomer },
            { Value: DeliveringPlant },
            { Value: MainCategory },
            { Value: Subcategory1 },
            { Value: Subcategory2 },
            { Value: Subcategory3 },
            { Value: Subcategory4 },
            { Value: Subcategory5 }
        ]
    }
); */

/* // --- Part Numbers ---
annotate srv.PartNumbers with @(
    UI.HeaderInfo: {
        TypeName      : 'Part Number',
        TypeNamePlural: 'Part Numbers'
    },
    UI.LineItem  : [
        { Value: MainCategory },
        { Value: Subcategory1 },
        { Value: Subcategory2 },
        { Value: Subcategory3 },
        { Value: Subcategory4 },
        { Value: Subcategory5 },
        { Value: PricelistPartNumber },
        { Value: ProductHierarchy1 },
        { Value: ProductHierarchy2 },
        { Value: ProductHierarchy3 }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { Value: MainCategory },
            { Value: Subcategory1 },
            { Value: Subcategory2 },
            { Value: Subcategory3 },
            { Value: Subcategory4 },
            { Value: Subcategory5 },
            { Value: PricelistPartNumber },
            { Value: ProductHierarchy1 },
            { Value: ProductHierarchy2 },
            { Value: ProductHierarchy3 }
        ]
    }
); */

/* // --- Terms & Conditions ---
annotate srv.TermsAndConditions with @(
    UI.HeaderInfo: {
        TypeName      : 'Term & Condition',
        TypeNamePlural: 'Terms & Conditions'
    },
    UI.LineItem  : [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        { Value: SalesOrg },
        { Value: DistChannel },
        { Value: CustPriceList },
        { Value: CustGroup1 },
        { Value: ErpCustomer },
        { Value: DeliveringPlant },
        { Value: TermsAndConditionCategory },
        { Value: PricelistFieldName },
        { Valie: PricelistDataLevel }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { Value: TradeScenario },
            { Value: MarketScopeRegion },
            { Value: MarketScopeCountry },
            { Value: SalesOrg },
            { Value: DistChannel },
            { Value: CustPriceList },
            { Value: CustGroup1 },
            { Value: ErpCustomer },
            { Value: DeliveringPlant },
            { Value: TermsAndConditionCategory },
            { Value: PricelistFieldName },
            { Valie: PricelistDataLevel }
        ]
    }
); */

/* // --- Pricing Parameters ---
annotate srv.PricingParameters with @(
    UI.HeaderInfo: {
        TypeName      : 'Pricing Parameter',
        TypeNamePlural: 'Pricing Parameters'
    },
    UI.LineItem  : [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        { Value: SalesOrg },
        { Value: DistChannel },
        { Value: CustPriceList },
        { Value: CustGroup1 },
        { Value: ErpCustomer },
        { Value: DeliveringPlant },
        { Value: ErpPriceCondition },
        { Value: ErpPricingAccessSequence }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { Value: TradeScenario },
            { Value: MarketScopeRegion },
            { Value: MarketScopeCountry },
            { Value: SalesOrg },
            { Value: DistChannel },
            { Value: CustPriceList },
            { Value: CustGroup1 },
            { Value: ErpCustomer },
            { Value: DeliveringPlant },
            { Value: ErpPriceCondition },
            { Value: ErpPricingAccessSequence }
        ]
    }
); */

/* // --- Tile Content ---
annotate srv.TileContent with @(
    UI.HeaderInfo: {
        TypeName      : 'Tile Content',
        TypeNamePlural: 'Tile Contents'
    },
    UI.LineItem  : [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        {
            Value: InformationHeading,
            Label: 'Heading'
        },
        {
            Value: InformationDetails,
            Label: 'Details'
        },
        {
            Value: ImageLink,
            Label: 'Image URL'
        }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { Value: TradeScenario },
            { Value: MarketScopeRegion },
            { Value: MarketScopeCountry },
            { Value: InformationHeading },
            { Value: InformationDetails },
            { Value: ImageLink }
        ]
    }
); */

/* // --- Contact Info ---
annotate srv.ContactInfo with @(
    UI.HeaderInfo: {
        TypeName      : 'Contact Information',
        TypeNamePlural: 'Contact Information'
    },
    UI.LineItem  : [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        {
            Value: ContactEmail,
            Label: 'E-mail Address'
        },
        {
            Value: ContactNumber,
            Label: 'Phone Number'
        }
    ],
    UI.FieldGroup #CreationParameters: {
        Data : [
            { Value: TradeScenario },
            { Value: MarketScopeRegion },
            { Value: MarketScopeCountry },
            { Value: ContactEmail },
            { Value: ContactNumber }
        ]
    }
); */