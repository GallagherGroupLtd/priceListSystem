using PriceListService as service from '../../srv/service';

annotate service.PricelistData with @(
    // --- LIST PAGE ANNOTATIONS ---
    UI.SelectionFields            : [
        CustPriceList,
        Status,
        PublishedDate
    ],

    UI.LineItem                   : [
        {
            $Type: 'UI.DataField',
            Value: PricelistTitle
        },
        {
            $Type: 'UI.DataField',
            Value: TradeScenario,
        },
        {
            $Type: 'UI.DataField',
            Value: MarketDisplay
        },
        {
            $Type: 'UI.DataField',
            Value: Status
        },
        {
            $Type: 'UI.DataField',
            Value: PublishedDate
        },
        {
            $Type: 'UI.DataField',
            Value: Version
        }
    ],

    // --- OBJECT PAGE ANNOTATIONS ---
    UI.HeaderInfo                 : {
        TypeName      : 'Pricelist',
        TypeNamePlural: 'Pricelists',
        Title         : {Value: PricelistTitle},
        Description   : {Value: Version},
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
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'AdminFacet',
            Target: '@UI.FieldGroup#AdminGroup'
        }
    ],

    // Tabs
    UI.Facets                     : [{
        $Type : 'UI.CollectionFacet',
        Label : 'Pricelist Information',
        ID    : 'PricelistInfoFacet',
        Facets: [
            {
                $Type : 'UI.ReferenceFacet',
                Label : '',
                Target: '@UI.FieldGroup#GeneralInfo'
            },

            {
                $Type : 'UI.CollectionFacet',
                ID    : 'ScopeContainer',
                Label : '',
                Facets: [
                    {
                        $Type : 'UI.ReferenceFacet',
                        Label : 'Market Scope',
                        Target: '@UI.FieldGroup#MarketScope'
                    },
                    {
                        $Type : 'UI.ReferenceFacet',
                        Label : 'Commercial Scope',
                        Target: '@UI.FieldGroup#CommercialScope'
                    }
                ]
            }
        ]
    }],

    UI.FieldGroup #DatesGroup     : {Data: [
        {
            Value: createdAt,
            Label: 'Created on'
        },
        {
            Value: modifiedAt,
            Label: 'Last Revised On'
        },
        {
            Value: PublishedDate,
            Label: 'Published On'
        }
    ]},

    UI.FieldGroup #UsersGroup     : {Data: [
        {
            Value: createdBy,
            Label: 'Created By'
        },
        {
            Value: modifiedBy,
            Label: 'Revised By'
        },
        {
            Value: PublishedBy,
            Label: 'Published By'
        }
    ]},

    UI.FieldGroup #AdminGroup     : {Data: [
        {
            Value: Version,
            Label: 'Version'
        },
        {
            Value: Status,
            Label: 'Status'
        }
    ]},

    UI.FieldGroup #GeneralInfo    : {
        Data: [
            {Value: PricelistTitle},
            {Value: Currency},
            {Value: EffectiveDate},
            {Value: ExpiryDate}
        ]
    },

    UI.FieldGroup #MarketScope    : {Data: [
        {
            Value: TradeScenario,
            Label: 'Trade Scenario'
        },
        {
            Value: MarketScopeRegion,
            Label: 'Region'
        },
        {
            Value: MarketScopeCountry,
            Label: 'Country'
        }
    ]},

    UI.FieldGroup #CommercialScope: {Data: [
        {
            Value: SalesOrg,
            Label: 'Sales Org'
        },
        {
            Value: DistChannel,
            Label: 'Dist. Channel'
        },
        {
            Value: CustPriceList,
            Label: 'Cust. Price List'
        },
        {
            Value: CustGroup1,
            Label: 'Cust. Group 1'
        },
        {
            Value: ErpCustomer,
            Label: 'Customer Code'
        },
        {
            Value: DeliveringPlant,
            Label: 'Delivering Plant'
        }
    ]}
);

//Annotations for Value Help
annotate service.PricelistData with {
    // Making fields mandatory for this application only
    PricelistTitle     @mandatory;
    TradeScenario      @mandatory;
    MarketScopeRegion  @mandatory;
    MarketScopeCountry @mandatory;

    TradeScenario @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'TradeScenarioVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeRegion', ValueListProperty: 'MarketScopeRegion' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeCountry', ValueListProperty: 'MarketScopeCountry' }
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
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeRegion', ValueListProperty: 'MarketScopeRegion' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeCountry', ValueListProperty: 'MarketScopeCountry' }
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
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' }
            ]
        }
    );

    SalesOrg @(
        Common.ValueList: {
            CollectionPath: 'SalesOrgVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' }
            ]
        }
    );

    DistChannel @(
        Common.ValueList: {
            CollectionPath: 'DistChannelVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' }
            ]
        }
    );

    DeliveringPlant @(
        Common.ValueList: {
            CollectionPath: 'PlantVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DeliveringPlant', ValueListProperty: 'DELIVERING_PLANT' }
            ]
        }
    );

    CustPriceList @(
        Common.ValueList: {
            CollectionPath: 'CustPricelistVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DeliveringPlant', ValueListProperty: 'DELIVERING_PLANT' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustPricelist', ValueListProperty: 'PRICE_LIST_TYPE' }
            ]
        }
    );
};

annotate service.PricelistItemData with {
    PricelistPartNumber @(Common.ValueList: {
        CollectionPath: 'ResolvedPricelistItem',
        Parameters    : [
            // Input parameters (filters passed to ResolvedPricelistItem READ handler)
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: SalesOrg,
                ValueListProperty: 'SalesOrg'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: DistChannel,
                ValueListProperty: 'DistChannel'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: DeliveringPlant,
                ValueListProperty: 'DeliveringPlant'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: CustPriceList,
                ValueListProperty: 'CustPriceList'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: CustGroup1,
                ValueListProperty: 'CustomerGroup1'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: ErpCustomer,
                ValueListProperty: 'ErpCustomer'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: TradeScenario,
                ValueListProperty: 'TradeScenario'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: MarketScopeRegion,
                ValueListProperty: 'MarketScopeRegion'
            },
            {
                $Type            : 'Common.ValueListParameterIn',
                LocalDataProperty: MarketScopeCountry,
                ValueListProperty: 'MarketScopeCountry'
            },

            // Output parameters (fields filled automatically when user selects a material)
            {
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: PartNumberDescr,
                ValueListProperty: 'MaterialDescription'
            },
            {
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: MaterialPricingGroup,
                ValueListProperty: 'MaterialPricingGroup'
            },
            {
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: CustomerClassification,
                ValueListProperty: 'CustomerClassification'
            },
            {
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: PriceCondition,
                ValueListProperty: 'PriceCondition'
            },
            {
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: Price,
                ValueListProperty: 'Price'
            },
            {
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: PriceUnit,
                ValueListProperty: 'PriceUnit'
            }
        ]
    })
};
