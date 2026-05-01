using PriceListService as service from '../../srv/service';
annotate service.TermsAndConditions with @(
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
        { Value: MainCategory },
        { Value: Subcategory1 },
        { Value: Subcategory2 },
        { Value: Subcategory3 },
        { Value: Subcategory4 },
        { Value: Subcategory5 },
        { Value: PricelistFieldName }, 
        { Value: PricelistDataLevel },
        { Value: TermsAndConditionContent }
    ],

    UI.PresentationVariant : {
        SortOrder      : [
            {
                $Type      : 'Common.SortOrderType',
                Property   : HasActiveEntity,
                Descending : false // Drafts (false) come before Active (true)
            },
            {
                $Type      : 'Common.SortOrderType',
                Property   : createdAt, // Optional: secondary sort by newest
                Descending : true
            }
        ],
        Visualizations : ['@UI.LineItem']
    },

    UI.FieldGroup #MarketScope : {
        Data: [
            { Value: TradeScenario, Label: 'Trade Scenario' },
            { Value: MarketScopeRegion, Label: 'Region' },
            { Value: MarketScopeCountry, Label: 'Country' }
        ]
    },

    UI.FieldGroup #CommercialScope : {
        Data: [
            { Value: SalesOrg, Label: 'Sales Org' },
            { Value: DistChannel, Label: 'Dist. Channel' },
            { Value: CustPriceList, Label: 'Cust. Price List' },
            { Value: CustGroup1, Label: 'Cust. Group 1' },
            { Value: ErpCustomer, Label: 'Customer Code' },
            { Value: DeliveringPlant, Label: 'Delivering Plant' }
        ]
    },

    UI.FieldGroup #ProductCategory : {
        Data: [
            { $Type : 'UI.DataField', Value : MainCategory },
            { $Type : 'UI.DataField', Value : Subcategory1 },
            { $Type : 'UI.DataField', Value : Subcategory2 },
            { $Type : 'UI.DataField', Value : Subcategory3 },
            { $Type : 'UI.DataField', Value : Subcategory4 },
            { $Type : 'UI.DataField', Value : Subcategory5 },
        ]
    },

    UI.FieldGroup #TermsDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : TermsAndConditionCategory },
            { $Type : 'UI.DataField', Value : PricelistFieldName },
            { $Type : 'UI.DataField', Value : PricelistDataLevel }
        ]
    },

    UI.FieldGroup #TermsContent : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : TermsAndConditionContent }
        ]
    },

    UI.Facets : [
        {
            $Type : 'UI.CollectionFacet',
            Label : 'Terms and Conditions',
            ID    : 'TCFacet',
            Facets: [
                { 
                    $Type : 'UI.CollectionFacet', 
                    ID : 'ScopeContainer', 
                    Label : '', 
                    Facets: [
                        { $Type : 'UI.ReferenceFacet', Label : 'Market Scope', Target: '@UI.FieldGroup#MarketScope' },
                        { $Type : 'UI.ReferenceFacet', Label : 'Commercial Scope', Target: '@UI.FieldGroup#CommercialScope' }
                    ]
                },
                { 
                    $Type : 'UI.ReferenceFacet', 
                    Label : '', 
                    Target: '@UI.FieldGroup#ProductCategory' 
                },
                { 
                    $Type : 'UI.ReferenceFacet', 
                    Label : '', 
                    Target: '@UI.FieldGroup#TermsDetails' 
                },
                { 
                    $Type : 'UI.ReferenceFacet', 
                    Label : '', 
                    Target: '@UI.FieldGroup#TermsContent' 
                }
            ]
        }
    ]
);

annotate service.TermsAndConditions with {
    PricelistFieldName @UI.MultiLineText;
    TermsAndConditionContent @UI.MultiLineText;

    TradeScenario @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'TradeScenarioVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' }
            ]
        }
    );

    MarketScopeRegion @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MarketRegionVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeRegion', ValueListProperty: 'MarketScopeRegion' }
            ]
        }
    );

    MarketScopeCountry @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MarketCountryVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeRegion', ValueListProperty: 'MarketScopeRegion' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeCountry', ValueListProperty: 'MarketScopeCountry' }
            ]
        }
    );

    PricelistDataLevel @(
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'TermsDataLevelValues',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'Level', ValueListProperty: 'Level' }
            ]
        }
    );
}
