using PriceListService as service from '../../srv/service';
annotate service.TileContent with @(
    UI.HeaderInfo: {
        TypeName      : 'Tile Content',
        TypeNamePlural: 'Tile Contents'
    },
    UI.LineItem  : [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        {
            Value: InformationHeading,
            Label: 'Heading'
        },
        {
            Value: InformationDetails,
            Label: 'Details'
        },
        {
            Value: ImageLink,
            Label: 'Image URL'
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
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : TradeScenario,
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeRegion,
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeCountry,
            },
            {
                $Type : 'UI.DataField',
                Value : InformationHeading,
            },
            {
                $Type : 'UI.DataField',
                Value : InformationDetails,
            },
            {
                $Type : 'UI.DataField',
                Value : ImageLink,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ]
);

