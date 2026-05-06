using PriceListService as service from '../../srv/service';
annotate service.TileContent with @(
    UI.HeaderInfo: {
        TypeName      : 'Tile Content',
        TypeNamePlural: 'Tile Contents'
    },

    // Selection Fields for Filtering
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

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

annotate service.TileContent with {
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
    // SalesOrg @(
    //     Common.ValueListWithFixedValues : true,
    //     Common.ValueList: {
    //         $Type         : 'Common.ValueListType',
    //     }        
    // );

    // DistChannel @(
    //     Common.ValueListWithFixedValues : true,
    //     Common.ValueList: {
    //         $Type         : 'Common.ValueListType',
    //     }        
    // );

    // CustPriceList @(
    //     Common.ValueListWithFixedValues : true,
    //     Common.ValueList: {
    //         $Type         : 'Common.ValueListType',
    //     }        
    // );

    // CustGroup1 @(
    //     Common.ValueListWithFixedValues : true,
    //     Common.ValueList: {
    //         $Type         : 'Common.ValueListType',
    //     }        
    // );
        
    // ErpCustomer @(
    //     Common.ValueListWithFixedValues : true,
    //     Common.ValueList: {
    //         $Type         : 'Common.ValueListType',
    //     }        
    // );
};