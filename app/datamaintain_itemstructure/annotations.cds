using PriceListService as service from '../../srv/service';

annotate service.ItemStructure with @(
    UI.HeaderInfo: {
        TypeName      : 'Item Structure Component1',
        TypeNamePlural: 'Item Structure Components'
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

    // Trade Parameters ---
    UI.FieldGroup #TradeParameters : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value : TradeScenario },
            { $Type : 'UI.DataField', Value : MarketScopeRegion },
            { $Type : 'UI.DataField', Value : MarketScopeCountry }
        ]
    },

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
    
    UI.FieldGroup #TermsAndConditions : {
        Data: [
            { $Type : 'UI.DataField', Value : TermsAndCondition }
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

    // Facets to Render the Sections
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Facet1',
            Label : 'Trade Parameters',
            Target: '@UI.FieldGroup#TradeParameters'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Facet2',
            Label : 'ERP Data',
            Target: '@UI.FieldGroup#ERPData'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet3',
            Label  : 'General Terms and Conditions',
            Target : '@UI.FieldGroup#TermsAndConditions'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet4',
            Label  : 'Main Category',
            Target : '@UI.FieldGroup#MainCategory'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet5',
            Label  : 'Main Category Translation',
            Target : '@UI.FieldGroup#MainCategoryLocal'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet6',
            Label  : 'Subcategory1',
            Target : '@UI.FieldGroup#Subcategory1'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet7',
            Label  : 'Subcategory1 Translation',
            Target : '@UI.FieldGroup#Subcategory1Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet8',
            Label  : 'Subcategory2',
            Target : '@UI.FieldGroup#Subcategory2'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet9',
            Label  : 'Subcategory2 Translation',
            Target : '@UI.FieldGroup#Subcategory2Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet10',
            Label  : 'Subcategory3',
            Target : '@UI.FieldGroup#Subcategory3'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet11',
            Label  : 'Subcategory3 Translation',
            Target : '@UI.FieldGroup#Subcategory3Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet12',
            Label  : 'Subcategory4',
            Target : '@UI.FieldGroup#Subcategory4'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet13',
            Label  : 'Subcategory4 Translation',
            Target : '@UI.FieldGroup#Subcategory4Local'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet14',
            Label  : 'Subcategory5',
            Target : '@UI.FieldGroup#Subcategory5'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID    : 'Facet15',
            Label  : 'Subcategory5 Translation',
            Target : '@UI.FieldGroup#Subcategory5Local'
        }
    ],

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
        { Value: TermsAndConditions },
        { Value: MainCategory },
        { Value: Subcategory1 },
        { Value: Subcategory2 },
        { Value: Subcategory3 },
        { Value: Subcategory4 },
        { Value: Subcategory5 }
    ],

    UI.PresentationVariant : {
        SortOrder      : [
            {
                $Type      : 'Common.SortOrderType',
                Property   : HasActiveEntity,
                Descending : false
            },
            {
                $Type      : 'Common.SortOrderType',
                Property   : createdAt,
                Descending : true
            }
        ],
        Visualizations : ['@UI.LineItem']
    },     
);

annotate service.ItemStructure with {
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

    ErpCustomer @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'Test123VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ErpCustomer', 
                    ValueListProperty: 'code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'name' 
                }
            ]              
        }        
    );  

    TermsAndCondition  @UI.MultiLineText;
    MainCategory       @UI.MultiLineText;
    Subcategory1       @UI.MultiLineText;
    Subcategory2       @UI.MultiLineText;
    Subcategory3       @UI.MultiLineText;
    Subcategory4       @UI.MultiLineText;
    Subcategory5       @UI.MultiLineText;
    MainCategoryLocal  @UI.MultiLineText;
    Subcategory1Local  @UI.MultiLineText;
    Subcategory2Local  @UI.MultiLineText;
    Subcategory3Local  @UI.MultiLineText;
    Subcategory4Local  @UI.MultiLineText;
    Subcategory5Local  @UI.MultiLineText;
};


