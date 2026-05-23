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
                Value: createdBy,
                Label: 'Created By'
            },            
        ]
    },
 
    UI.FieldGroup #UsersGroup     : {
        Data: [
            {
                Value: modifiedAt,
                Label: 'Updated On'
            },            
            {
                Value: modifiedBy,
                Label: 'Updated By'
            },
        ]
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
    ]     
);

annotate PriceListService.TradeScenarios with {

    // TradeScenario @(
    //     Common.ValueList: {
    //         // $Type         : 'Common.ValueListType',
    //         Parameters: [
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' }
    //         ]
    //     }
    // );

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