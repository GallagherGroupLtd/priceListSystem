using PriceListService as service from '../../srv/service';

annotate service.AccountAssignment with @(
    UI.HeaderInfo: {
        TypeName      : 'Data Maintenance: Account Assignment',
        TypeNamePlural: 'Data Maintenance: Account Assignment'
    },

    // Selection Fields for Filtering
    UI.SelectionFields: [ TradeScenario, MarketScopeRegion, MarketScopeCountry ],

    // User Information Group
    UI.FieldGroup #UserInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: FirstName, Label: 'First Name' },
            { $Type : 'UI.DataField', Value: LastName, Label: 'Last Name' },
            { $Type : 'UI.DataField', Value: Email, Label: 'E-mail' },
            { $Type : 'UI.DataField', Value: Type, Label: 'Type' }
        ]
    },

    // Market Scope Group
    UI.FieldGroup #MarketScope : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: TradeScenario, Label: 'Trade Scenario' },
            { $Type : 'UI.DataField', Value: MarketScopeRegion, Label: 'Region' },
            { $Type : 'UI.DataField', Value: MarketScopeCountry, Label: 'Country' }
        ]
    },

    // Commercial Scope Group
    UI.FieldGroup #CommercialScope : {
        $Type : 'UI.FieldGroupType',
        Data : [
            { $Type : 'UI.DataField', Value: CustomerNumber, Label: 'Customer Number' },
            { $Type : 'UI.DataField', Value: SalesOrg, Label: 'Sales Organization' },
            { $Type : 'UI.DataField', Value: DistChannel, Label: 'Distribution Channel' }
        ]
    },

    // Facets to Organize Sections on Object Page
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'FacetUserInfo',
            Label : 'User Information',
            Target: '@UI.FieldGroup#UserInfo'
        },
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'FacetScope',
            Label : 'Scope Information',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    ID    : 'FacetMarket',
                    Label : 'Market Scope',
                    Target: '@UI.FieldGroup#MarketScope'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    ID    : 'FacetCommercial',
                    Label : 'Commercial Scope',
                    Target: '@UI.FieldGroup#CommercialScope'
                }
            ]
        }
    ],

    // Line Items for the List Report
    UI.LineItem: [
        { $Type : 'UI.DataField', Value: FirstName, Label: 'First Name' },
        { $Type : 'UI.DataField', Value: LastName, Label: 'Last Name' },
        { $Type : 'UI.DataField', Value: Email, Label: 'E-mail' },
        { $Type : 'UI.DataField', Value: Type, Label: 'Type' },
        { $Type : 'UI.DataField', Value: TradeScenario, Label: 'Trade Scenario' },
        { $Type : 'UI.DataField', Value: MarketScopeRegion, Label: 'Region' },
        { $Type : 'UI.DataField', Value: MarketScopeCountry, Label: 'Country' },
        { $Type : 'UI.DataField', Value: CustomerNumber, Label: 'Customer Number' },
        { $Type : 'UI.DataField', Value: SalesOrg, Label: 'Sales Organization' },
        { $Type : 'UI.DataField', Value: DistChannel, Label: 'Distribution Channel' }
    ],

    UI.PresentationVariant : {
        SortOrder: [
            { $Type: 'Common.SortOrderType', Property: HasActiveEntity, Descending: false },
            { $Type: 'Common.SortOrderType', Property: createdAt, Descending: true }
        ],
        Visualizations: ['@UI.LineItem']
    }
);

annotate service.AccountAssignment with {
    Type @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'UserTypeValues',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'Type', ValueListProperty: 'Type' }
            ]
        }
    );

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

    CustomerNumber @(
        Common.ValueList: {
            CollectionPath: 'CustomerVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' }
            ]
        }
    );

    SalesOrg @(
        Common.ValueList: {
            CollectionPath: 'SalesOrgVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' }
            ]
        }
    );

    DistChannel @(
        Common.ValueList: {
            CollectionPath: 'DistChannelVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' }
            ]
        }
    );
};