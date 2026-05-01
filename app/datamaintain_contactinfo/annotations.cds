using PriceListService as service from '../../srv/service';
annotate service.ContactInfo with @(
    UI.HeaderInfo: {
        TypeName      : 'Contact Information',
        TypeNamePlural: 'Contact Information'
    },
    UI.LineItem  : [
        { Value: TradeScenario },
        { Value: MarketScopeRegion },
        { Value: MarketScopeCountry },
        {
            Value: ContactEmail,
            Label: 'E-mail Address'
        },
        {
            Value: ContactNumber,
            Label: 'Phone Number'
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
                Value : ContactEmail,
            },
            {
                $Type : 'UI.DataField',
                Value : ContactNumber,
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

