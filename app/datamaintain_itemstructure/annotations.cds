using PriceListService as service from '../../srv/service';

annotate service.ItemStructure with @(
    UI.HeaderInfo: {
        TypeName      : 'Item Structure Component1',
        TypeNamePlural: 'Item Structure Components'
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

    // Product Categories ---
    UI.FieldGroup #ProductCategories : {
        Data: [
            { $Type : 'UI.DataField', Value : MainCategory },
            { $Type : 'UI.DataField', Value : Subcategory1 },
            { $Type : 'UI.DataField', Value : Subcategory2 },
            { $Type : 'UI.DataField', Value : Subcategory3 },
            { $Type : 'UI.DataField', Value : Subcategory4 },
            { $Type : 'UI.DataField', Value : Subcategory5 }
        ]
    },

    // UI.FieldGroup #ProductCategoriesLocal : {
    //     Data: [
    //         { $Type : 'UI.DataField', Value : MainCategoryLocal },
    //         { $Type : 'UI.DataField', Value : Subcategory1Local },
    //         { $Type : 'UI.DataField', Value : Subcategory2Local },
    //         { $Type : 'UI.DataField', Value : Subcategory3Local },
    //         { $Type : 'UI.DataField', Value : Subcategory4Local },
    //         { $Type : 'UI.DataField', Value : Subcategory5Local }
    //     ]
    // },

    UI.FieldGroup #MainCategory : {
        Data: [
            { $Type : 'UI.DataField', Value : MainCategory },
            { $Type : 'UI.DataField', Value : MainCategoryLocal }
        ]
    },

    UI.FieldGroup #Subcategory1 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory1 },
            { $Type : 'UI.DataField', Value : Subcategory1Local }
        ]
    },

    UI.FieldGroup #Subcategory2 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory2 },
            { $Type : 'UI.DataField', Value : Subcategory2Local }
        ]
    },

    UI.FieldGroup #Subcategory3 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory3 },
            { $Type : 'UI.DataField', Value : Subcategory3Local }
        ]
    },

    UI.FieldGroup #Subcategory4 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory4 },
            { $Type : 'UI.DataField', Value : Subcategory4Local }
        ]
    },

    UI.FieldGroup #Subcategory5 : {
        Data: [
            { $Type : 'UI.DataField', Value : Subcategory5 },
            { $Type : 'UI.DataField', Value : Subcategory5Local }
        ]
    },

    // Facets to Render the Sections
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
            $Type : 'UI.CollectionFacet',
            ID    : 'ProductCategories',
            Label : 'Product Categories',
            Facets: [
                { $Type : 'UI.ReferenceFacet', Label : 'Main Category', Target: '@UI.FieldGroup#MainCategory' },
                { $Type : 'UI.ReferenceFacet', Label : 'Subcategory 1', Target: '@UI.FieldGroup#Subcategory1' },
                { $Type : 'UI.ReferenceFacet', Label : 'Subcategory 2', Target: '@UI.FieldGroup#Subcategory2' },
                { $Type : 'UI.ReferenceFacet', Label : 'Subcategory 3', Target: '@UI.FieldGroup#Subcategory3' },
                { $Type : 'UI.ReferenceFacet', Label : 'Subcategory 4', Target: '@UI.FieldGroup#Subcategory4' },
                { $Type : 'UI.ReferenceFacet', Label : 'Subcategory 5', Target: '@UI.FieldGroup#Subcategory5' }
            ]
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
        { Value: MainCategory },
        { Value: Subcategory1 },
        { Value: Subcategory2 },
        { Value: Subcategory3 },
        { Value: Subcategory4 },
        { Value: Subcategory5 },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.uploadData',
            Label : 'Upload Files',
            InvocationGrouping : #ChangeSet
        },   
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.duplicateRecord',
            Label : 'Duplicate Record',
            InvocationGrouping : #ChangeSet
        },         
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.copy',
            Label : 'Copy',
            InvocationGrouping : #ChangeSet
        },       
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.exportExcel',
            Label : 'Export as Excel',
            InvocationGrouping : #ChangeSet,
            criticality: #CRITICAL
        }         
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

    // Header Section at the top
    UI.HeaderInfo                 : {
        ImageUrl      : 'sap-icon://sales-order-item'
    },    
    UI.HeaderFacets               : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'DatesFacet',
            Target: '@UI.FieldGroup#DatesGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'UsersFacet',
            Target: '@UI.FieldGroup#UsersGroup'
        }
    ],
    UI.FieldGroup #DatesGroup     : {
        Data: [
            {
                Value: createdAt,
                Label: 'Created On'
            },
            {
                Value: modifiedAt,
                Label: 'Updated On'
            }
        ]
    },
 
    UI.FieldGroup #UsersGroup     : {
        Data: [
            {
                Value: createdBy,
                Label: 'Created By'
            },
            {
                Value: modifiedBy,
                Label: 'Updated By'
            }
        ]
    }       
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
            $Type         : 'Common.ValueListParameterInOut',
            CollectionPath: 'SalesOrgVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SalesOrg', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'Description', 
                    ValueListProperty: 'Description' 
                }
            ]            
        }        
    );

    DistChannel @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListParameterInOut',
            CollectionPath: 'DistributionChannelVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DistributionChannel', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'Description2', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    CustPriceList @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );

    CustGroup1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );
        
    ErpCustomer @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );
    MainCategoryLocal  @UI.MultiLineText;
    Subcategory1Local  @UI.MultiLineText;
    Subcategory2Local  @UI.MultiLineText;
    Subcategory3Local  @UI.MultiLineText;
    Subcategory4Local  @UI.MultiLineText;
    Subcategory5Local  @UI.MultiLineText;
};


