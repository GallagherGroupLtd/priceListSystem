using PriceListService as service from '../../srv/service';

annotate service.AccountAssignment with @(
    UI.HeaderInfo: {
        TypeName      : 'Data Maintenance: Account Assignment',
        TypeNamePlural: 'Data Maintenance: Account Assignment'
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
    UI.SelectionFields: [ FirstName,LastName,Email,AccountType,AccountScope,TradeScenario, MarketScopeRegion, MarketScopeCountry ],

    // Line Items for the List Report
    UI.LineItem: [
        { $Type : 'UI.DataField', Value: CustomerNumber, Label: 'Customer Number' },
        { $Type : 'UI.DataField', Value: FirstName, Label: 'First Name' },
        { $Type : 'UI.DataField', Value: LastName, Label: 'Last Name' },
        { $Type : 'UI.DataField', Value: Email, Label: 'E-mail' }
    ],

    UI.PresentationVariant : {
        SortOrder: [
            { $Type: 'Common.SortOrderType', Property: HasActiveEntity, Descending: false },
            { $Type: 'Common.SortOrderType', Property: createdAt, Descending: true }
        ],
        Visualizations: ['@UI.LineItem']
    },

    // Facets to Organize Sections on Object Page
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Facet1',
            Label : 'General Information',
            Target: '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Facet2',
            Label : 'Commercial Scope',
            Target: '@UI.FieldGroup#CommercialScope'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Facet3',
            Label : 'ERP Data',
            Target: '@UI.FieldGroup#ErpData'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Facet4',
            Label : 'Account Control',
            Target: '@UI.FieldGroup#AccountControl'
        }
    ],
    
    //General Information Group
    UI.FieldGroup #GeneralInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: FirstName, Label: 'First Name' },
            { $Type : 'UI.DataField', Value: LastName, Label: 'Last Name' },
            { $Type : 'UI.DataField', Value: Email, Label: 'E-mail' },
            { $Type : 'UI.DataField', Value: AccountType, Label: 'AccountType' },
            { $Type : 'UI.DataField', Value: AccountScope, Label: 'AccountScope' }
        ]
    },

    //Commercial Scope Group
    UI.FieldGroup #CommercialScope : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: TradeScenario, Label: 'TradeScenario' },
            { $Type : 'UI.DataField', Value: MarketScopeRegion, Label: 'MarketScopeRegion' },
            { $Type : 'UI.DataField', Value: MarketScopeCountry, Label: 'MarketScopeCountry' }
        ]
    },

    //ERPData Group
    UI.FieldGroup #ErpData : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: SalesOrg, Label: 'Sales Organization' },
            { $Type : 'UI.DataField', Value: DistChannel, Label: 'Distribution Channel' },
            { $Type : 'UI.DataField', Value: CustPriceList, Label: 'Customer Pricelist' }, 
            { $Type : 'UI.DataField', Value: CustGroup1, Label: 'Customer Group 1' },
            { $Type : 'UI.DataField', Value: CustomerNumber, Label: 'Customer Code' },
            { $Type : 'UI.DataField', Value: DeliveringPlant, Label: 'Plant' }
        ]
    },

    //Account Control Group
    UI.FieldGroup #AccountControl : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: ControlPriceListView, Label: 'PriceList View' },
            { $Type : 'UI.DataField', Value: ControlPriceView, Label: 'Price View' },
            { $Type : 'UI.DataField', Value: ControlDiscountIndicator, Label: 'Discount Indicator' },
            { $Type : 'UI.DataField', Value: ControlDiscountRate, Label: 'Discount Rate' },
            { $Type : 'UI.DataField', Value: ControlWorkflowTile, Label: 'Workflow Tile' },
            { $Type : 'UI.DataField', Value: ContorlPriceListReviewScheduleTile, Label: 'Price List Review Schedule Tile' },
            { $Type : 'UI.DataField', Value: ControlPricelistMaintenance, Label: 'Pricelist Maintenance' },
            { $Type : 'UI.DataField', Value: ControlDataMaintenance, Label: 'Data Maintenance' },
            { $Type : 'UI.DataField', Value: ControlMyRequestTile, Label: 'My Request Tile' },
            { $Type : 'UI.DataField', Value: ControlApplicationLogTile, Label: 'Application Log Tile' }
        ]
    }
);

annotate service.AccountAssignment with {
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

    AccountType @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'AccountTypeVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'AccountType', ValueListProperty: 'Code' }
            ]
        }
    );

    AccountScope @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'AccountScopeVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'AccountScope', ValueListProperty: 'Code' }
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

    ControlPriceListView               @Common.FieldControl : #Editable;
    ControlPriceView                   @Common.FieldControl : #Editable;
    ControlDiscountIndicator           @Common.FieldControl : #Editable;
    ControlDiscountRate                @Common.FieldControl : #Editable;
    ControlWorkflowTile                @Common.FieldControl : #Editable;
    ContorlPriceListReviewScheduleTile @Common.FieldControl : #Editable;
    ControlPricelistMaintenance        @Common.FieldControl : #Editable;
    ControlDataMaintenance             @Common.FieldControl : #Editable;
    ControlMyRequestTile               @Common.FieldControl : #Editable;
    ControlApplicationLogTile          @Common.FieldControl : #Editable;
};