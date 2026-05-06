using PriceListService as service from '../../srv/service';

annotate PriceListService.TradeScenarios with @(
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
        },
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

annotate PriceListService.TradeScenarios with {

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

};