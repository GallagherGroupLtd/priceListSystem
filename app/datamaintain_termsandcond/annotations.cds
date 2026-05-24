using PriceListService as service from '../../srv/service';
annotate service.TermsAndConditions with @(
    UI.HeaderInfo: {
        TypeName      : 'Term & Condition',
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

    UI.FieldGroup #Subcategory1 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory1 }
        ]
    },

    UI.FieldGroup #Subcategory1Local : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory1Local }
        ]
    },

    UI.FieldGroup #Subcategory2 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory2 }
        ]
    },

    UI.FieldGroup #Subcategory2Local : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory2Local }
        ]
    },

    UI.FieldGroup #Subcategory3 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory3 }
        ]
    },

    UI.FieldGroup #Subcategory3Local : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory3Local }
        ]
    },

    UI.FieldGroup #Subcategory4 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory4 }
        ]
    },

    UI.FieldGroup #Subcategory4Local : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory4Local }
        ]
    },

    UI.FieldGroup #Subcategory5 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory5 }
        ]
    },

    UI.FieldGroup #Subcategory5Local : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory5Local }
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
            Label  : 'Subcategory1',
            Target : '@UI.FieldGroup#Subcategory1'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet6',
            Label  : 'Subcategory1 Translation',
            Target : '@UI.FieldGroup#Subcategory1Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet7',
            Label  : 'Subcategory2',
            Target : '@UI.FieldGroup#Subcategory2'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet8',
            Label  : 'Subcategory2 Translation',
            Target : '@UI.FieldGroup#Subcategory2Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet9',
            Label  : 'Subcategory3',
            Target : '@UI.FieldGroup#Subcategory3'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet10',
            Label  : 'Subcategory3 Translation',
            Target : '@UI.FieldGroup#Subcategory3Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet11',
            Label  : 'Subcategory4',
            Target : '@UI.FieldGroup#Subcategory4'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet12',
            Label  : 'Subcategory4 Translation',
            Target : '@UI.FieldGroup#Subcategory4Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet13',
            Label  : 'Subcategory5',
            Target : '@UI.FieldGroup#Subcategory5'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet14',
            Label  : 'Subcategory5 Translation',
            Target : '@UI.FieldGroup#Subcategory5Local'
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
    
    Subcategory1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Subcategory1VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'Subcategory1', 
                    ValueListProperty: 'Subcategory1' }
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
    Subcategory1Local  @UI.MultiLineText;
    Subcategory2Local  @UI.MultiLineText;
    Subcategory3Local  @UI.MultiLineText;
    Subcategory4Local  @UI.MultiLineText;
    Subcategory5Local  @UI.MultiLineText;  
}
