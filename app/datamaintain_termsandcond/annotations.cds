using PriceListService as service from '../../srv/service';
annotate service.TermsAndConditions with @(
    UI.HeaderInfo: {
        TypeName      : 'Terms & Conditions',
        TypeNamePlural: 'Terms & Conditions'
    },

    // Header Section at the top
    UI.HeaderInfo                 : {
        ImageUrl      : 'sap-icon://sales-order-item'
    },    
    UI.HeaderFacets               : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'DatesFacet',
            Target: '@UI.FieldGroup#CreateGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'UsersFacet',
            Target: '@UI.FieldGroup#UpdateGroup'
        }
    ],
    UI.FieldGroup #CreateGroup     : {
        Data: [
            {
                Value: createdAt,
                Label: 'Created On'
            },
            {
                Value: createdBy,
                Label: 'Created BY'
            }
        ]
    },
    UI.FieldGroup #UpdateGroup     : {
        Data: [
            {
                Value: modifiedAt,
                Label: 'Updated On'
            },
            {
                Value: modifiedBy,
                Label: 'Updated By'
            }
        ]
    },

    // Selection Fields for Filtering
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

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
        { Value: MainCategory },
        { Value: SubCategory1 },
        { Value: SubCategory2 },
        { Value: SubCategory3 },
        { Value: SubCategory4 },
        { Value: SubCategory5 }
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

    UI.FieldGroup #TradeParameters : {
        Data: [
            { Value: TradeScenario, Label: 'Trade Scenario' },
            { Value: MarketScopeRegion, Label: 'Region' },
            { Value: MarketScopeCountry, Label: 'Country' }
        ]
    },

    UI.FieldGroup #ErpData : {
        Data: [
            { Value: SalesOrg, Label: 'Sales Org' },
            { Value: DistChannel, Label: 'Dist. Channel' },
            { Value: CustPriceList, Label: 'Cust. Price List' },
            { Value: CustGroup1, Label: 'Cust. Group 1' },
            { Value: ErpCustomer, Label: 'Customer Code' },
            { Value: DeliveringPlant, Label: 'Delivering Plant' }
        ]
    },

    UI.FieldGroup #TermsContent : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : TermsAndConditionContent }
        ]
    },

    UI.FieldGroup #MainCategory : {
        Data: [
            { $Type : 'UI.DataField', Value : MainCategory }
        ]
    },

    UI.FieldGroup #MainCategoryLocal : {
        Data: [
            { $Type : 'UI.DataField', Value : MainCategoryLocal }
        ]
    },

    UI.FieldGroup #SubCategory1 : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory1 }
        ]
    },

    UI.FieldGroup #SubCategory1Local : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory1Local }
        ]
    },

    UI.FieldGroup #SubCategory2 : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory2 }
        ]
    },

    UI.FieldGroup #SubCategory2Local : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory2Local }
        ]
    },

    UI.FieldGroup #SubCategory3 : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory3 }
        ]
    },

    UI.FieldGroup #SubCategory3Local : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory3Local }
        ]
    },

    UI.FieldGroup #SubCategory4 : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory4 }
        ]
    },

    UI.FieldGroup #SubCategory4Local : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory4Local }
        ]
    },

    UI.FieldGroup #SubCategory5 : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory5 }
        ]
    },

    UI.FieldGroup #SubCategory5Local : {
        Data: [
            { $Type : 'UI.DataField', Value : SubCategory5Local }
        ]
    },

    UI.Facets : [
        { 
            $Type : 'UI.ReferenceFacet', 
            ID    : 'FacetTradeParameters',
            Label : 'Trade Parameters', 
            Target: '@UI.FieldGroup#TradeParameters' 
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'FacetERPData',
            Label : 'ERP Data',
            Target: '@UI.FieldGroup#ERPData'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet3',
            Label  : 'Main Category',
            Target : '@UI.FieldGroup#MainCategory'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet4',
            Label  : 'Main Category Translation',
            Target : '@UI.FieldGroup#MainCategoryLocal'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet5',
            Label  : 'SubCategory1',
            Target : '@UI.FieldGroup#SubCategory1'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet6',
            Label  : 'SubCategory1 Translation',
            Target : '@UI.FieldGroup#SubCategory1Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet7',
            Label  : 'SubCategory2',
            Target : '@UI.FieldGroup#SubCategory2'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet8',
            Label  : 'SubCategory2 Translation',
            Target : '@UI.FieldGroup#SubCategory2Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet9',
            Label  : 'SubCategory3',
            Target : '@UI.FieldGroup#SubCategory3'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet10',
            Label  : 'SubCategory3 Translation',
            Target : '@UI.FieldGroup#SubCategory3Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet11',
            Label  : 'SubCategory4',
            Target : '@UI.FieldGroup#SubCategory4'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet12',
            Label  : 'SubCategory4 Translation',
            Target : '@UI.FieldGroup#SubCategory4Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet13',
            Label  : 'SubCategory5',
            Target : '@UI.FieldGroup#SubCategory5'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet14',
            Label  : 'SubCategory5 Translation',
            Target : '@UI.FieldGroup#SubCategory5Local'
        }
    ],

    // ERP Data ---
    UI.FieldGroup #ERPData : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : SalesOrg },
            { $Type : 'UI.DataField', Value : DistChannel },
            { $Type : 'UI.DataField', Value : CustPriceList },
            { $Type : 'UI.DataField', Value : CustGroup1 },
            { $Type : 'UI.DataField', Value : ErpCustomer },
            { $Type : 'UI.DataField', Value : DeliveringPlant }
        ]
    },
);

annotate service.TermsAndConditions with {  
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
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeCountry', ValueListProperty: 'MarketScopeCountry' }
            ]
        }
    );

    MainCategory @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MainCategoryVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'MainCategory', 
                    ValueListProperty: 'MainCategory' }
            ]
        }
    );
    
    SubCategory1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'SubCategory1VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SubCategory1', 
                    ValueListProperty: 'SubCategory1' }
            ]
        }
    );

    SubCategory3 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'SubCategory3VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SubCategory3', 
                    ValueListProperty: 'SubCategory3' }
            ]
        }
    );

    SubCategory4 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'SubCategory4VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SubCategory4', 
                    ValueListProperty: 'SubCategory4' }
            ]
        }
    );

    SubCategory5 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'SubCategory5VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SubCategory5', 
                    ValueListProperty: 'SubCategory5' }
            ]
        }
    );

    SubCategory2 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'SubCategory2VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SubCategory2', 
                    ValueListProperty: 'SubCategory2' }
            ]
        }
    );
    SalesOrg @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'SalesOrgVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SalesOrg', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'Description' 
                }
            ]            
        }        
    );

    DistChannel @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DistributionChannelVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DistChannel', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    CustPriceList @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PricelistVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'CustPriceList', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    CustGroup1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'CustomerGroup1VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'CustGroup1', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    DeliveringPlant @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PlantVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DeliveringPlant', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    ); 
    
    MainCategoryLocal  @UI.MultiLineText;
    SubCategory1Local  @UI.MultiLineText;
    SubCategory2Local  @UI.MultiLineText;
    SubCategory3Local  @UI.MultiLineText;
    SubCategory4Local  @UI.MultiLineText;
    SubCategory5Local  @UI.MultiLineText;  
}