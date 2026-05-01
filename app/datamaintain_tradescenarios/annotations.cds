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
        }
    ]
);