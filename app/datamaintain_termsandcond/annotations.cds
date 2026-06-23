using PriceListService as service from '../../srv/service';
annotate service.TermsAndConditions with @(
    UI.HeaderInfo: {
        TypeName      : 'Term & Condition',
        TypeNamePlural: 'Terms & Conditions'
    },

    // Selection Fields for Filtering
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

    // Header Section at the top
    UI.HeaderInfo                 : {
        ImageUrl      : 'sap-icon://sales-order-item'
    },    

    // Header Section at the top
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
        { Value: TermsAndConditionContent },
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
            ID    : 'FacetProductCategories',
            Label : 'Terms and Condition Details',
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
    }
    
    // UI.Facets : [
    //     {
    //         $Type : 'UI.CollectionFacet',
    //         Label : 'Terms and Conditions',
    //         ID    : 'TCFacet',
    //         Facets: [
    //             { 
    //                 $Type : 'UI.CollectionFacet', 
    //                 ID : 'ScopeContainer', 
    //                 Label : '', 
    //                 Facets: [
    //                     { $Type : 'UI.ReferenceFacet', Label : 'Market Scope', Target: '@UI.FieldGroup#MarketScope' },
    //                     { $Type : 'UI.ReferenceFacet', Label : 'Commercial Scope', Target: '@UI.FieldGroup#CommercialScope' }
    //                 ]
    //             },
    //             { 
    //                 $Type : 'UI.ReferenceFacet', 
    //                 Label : '', 
    //                 Target: '@UI.FieldGroup#ProductCategory' 
    //             },
    //             { 
    //                 $Type : 'UI.ReferenceFacet', 
    //                 Label : '', 
    //                 Target: '@UI.FieldGroup#TermsDetails' 
    //             },
    //             { 
    //                 $Type : 'UI.ReferenceFacet', 
    //                 Label : '', 
    //                 Target: '@UI.FieldGroup#TermsContent' 
    //             }
    //         ]
    //     }
    // ]    
);

annotate service.TermsAndConditions with {
    // PricelistFieldName @UI.MultiLineText;
    // TermsAndConditionContent @UI.MultiLineText;
    
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

    SalesOrg @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );

    DistChannel @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
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
    MainCategoryLocal @UI.MultiLineText;
    Subcategory1Local @UI.MultiLineText;
    Subcategory2Local @UI.MultiLineText;
    Subcategory3Local @UI.MultiLineText;
    Subcategory4Local @UI.MultiLineText;
    Subcategory5Local @UI.MultiLineText;    
}
