using PriceListService as service from '../../srv/service';

annotate service.PricingParameters with @(
    UI.HeaderInfo                : {
        TypeName      : 'Pricing Parameter',
        TypeNamePlural: 'Pricing Parameters'
    },
    UI.LineItem                  : [
        {Value: TradeScenario},
        {Value: MarketScopeRegion},
        {Value: MarketScopeCountry},
        {Value: SalesOrg},
        {Value: DistChannel},
        {Value: CustPriceList},
        {Value: CustGroup1},
        {Value: ErpCustomer},
        {Value: DeliveringPlant},
        {Value: ErpPriceCondition},
        {Value: ErpSequence},
        {Value: ErpPricingAccessSequence}
    ],
    UI.PresentationVariant       : {
        SortOrder     : [
            {
                $Type     : 'Common.SortOrderType',
                Property  : HasActiveEntity,
                Descending: false // Drafts (false) come before Active (true)
            },
            {
                $Type     : 'Common.SortOrderType',
                Property  : createdAt, // Optional: secondary sort by newest
                Descending: true
            }
        ],
        Visualizations: ['@UI.LineItem']
    },
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: TradeScenario,
            },
            {
                $Type: 'UI.DataField',
                Value: MarketScopeRegion,
            },
            {
                $Type: 'UI.DataField',
                Value: MarketScopeCountry,
            },
            {
                $Type: 'UI.DataField',
                Value: SalesOrg,
            },
            {
                $Type: 'UI.DataField',
                Value: DistChannel,
            },
            {
                $Type: 'UI.DataField',
                Value: CustPriceList,
            },
            {
                $Type: 'UI.DataField',
                Value: CustGroup1,
            },
            {
                $Type: 'UI.DataField',
                Value: ErpCustomer,
            },
            {
                $Type: 'UI.DataField',
                Value: DeliveringPlant,
            },
            {
                $Type: 'UI.DataField',
                Value: ErpPriceCondition,
            },
            {
                @Type: 'UI.DataField',
                Value: ErpSequence,
            },
            {
                $Type: 'UI.DataField',
                Value: ErpPricingAccessSequence,
            }
        ],
    },
    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ]
);

annotate service.PricingParameters with {
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

    ErpCustomer @(
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
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' }
            ]
        }
    );

    DeliveringPlant @(
        Common.ValueList: {
            CollectionPath: 'PlantVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DeliveringPlant', ValueListProperty: 'DELIVERING_PLANT' }
            ]
        }
    );

    ErpPricingAccessSequence @(Common.ValueList: {
        CollectionPath : 'PricingCondType',
        SearchSupported: true,
        Parameters     : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: 'ErpPricingAccessSequence',
                ValueListProperty: 'ErpPricingAccessSequence'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'SequenceDescription'
            }
        ]
    });
}
