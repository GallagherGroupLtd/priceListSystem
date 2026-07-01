using PriceListService as service from '../../srv/service';

// ====================================================================
// 1. PROPERTY LEVEL ANNOTATIONS (Labels, Mandatory, Value Helps)
// ====================================================================
annotate service.PricelistData with {

    // Labels & Mandatory
    PricelistTitle      @Common.Label: 'Pricelist'       @mandatory;
    Status              @Common.Label    : 'Status';
    EffectiveDate       @Common.Label    : 'Effective Date';
    ExpiryDate          @Common.Label    : 'Expiry Date';
    PricelistType       @Common.Label: 'Pricelist Type'  @mandatory;
    MarketScopeRegion   @Common.Label: 'Region'          @mandatory;
    MarketScopeCountry  @Common.Label: 'Country'         @mandatory;
    Currency            @Common.Label    : 'Currency';
    SalesOrg            @Common.Label    : 'Sales Organization';
    DistChannel         @Common.Label    : 'Distribution Channel';
    CustGroup1          @Common.Label    : 'Customer Group 1';
    CustPriceList       @Common.Label    : 'Customer Pricelist';
    ErpCustomer         @Common.Label    : 'Customer Account';
    DeliveringPlant     @Common.Label    : 'Delivering Plant';
    createdBy           @Common.Label    : 'Created By' @UI.HiddenFilter: false @Core.Computed;
    createdAt           @Common.Label    : 'Created On' @UI.HiddenFilter: false @Core.Computed;    
    PublishedDate       @Common.Label    : 'Issue Date';
    PublishedBy         @Common.Label    : 'Issued By';
    Version             @Common.Label    : 'Version' @Core.Computed;
    MarketDisplay       @Common.Label    : 'Market Display';
    TermsAndConditions  @Common.Label    : 'Terms and Conditions';
    IsVersionActive     @Common.Label    : 'Active Version';

    // Value Help: Pricelist
    // PricelistTitle @(
    //     Common.ValueList : {
    //         $Type          : 'Common.ValueListType',
    //         CollectionPath : 'PricelistData',
    //         Parameters     : [
    //             { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : PricelistTitle, ValueListProperty : 'PricelistTitle' }
    //         ]
    //     }
    // );

    // Value Help: Status
    Status              @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'StatusVH',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterOut',
                LocalDataProperty: Status,
                ValueListProperty: 'code'
            }]
        }
    );

    // Value Help: PricelistType
    PricelistType       @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PricelistTypeVH',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: PricelistType,
                ValueListProperty: 'PricelistType'
            }]
        }
    );

    // Value Help: MarketScopeRegion
    MarketScopeRegion   @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MarketRegionVH',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: MarketScopeRegion,
                ValueListProperty: 'MarketScopeRegion'
            }]
        }
    );

    // Value Help: MarketScopeCountry
    MarketScopeCountry  @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MarketCountryVH',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: MarketScopeCountry,
                ValueListProperty: 'MarketScopeCountry'
            }]
        }
    );

    // Value Help: Others
    // Value Help: Customer
    ErpCustomer         @(
        Common.ValueList               : {
            $Type         : 'Common.ValueList',
            CollectionPath: 'CustomerVH',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: ErpCustomer,
                    ValueListProperty: 'CUSTOMER'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'SALES_ORGANIZATION'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'DISTRIBUTION_CHANNEL'
                }
            ],
        },
        Common.ValueListWithFixedValues: false,
    );

    // Value Help: Sales Org.
    SalesOrg            @(
        Common.ValueList               : {
            $Type         : 'Common.ValueList',
            CollectionPath: 'SalesOrgVH',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: 'SalesOrg',
                    ValueListProperty: 'Code'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'Description'
                }
            ]
        },
        Common.ValueListWithFixedValues: false,
    );

    DistChannel         @Common.ValueList: {
        CollectionPath: 'DistributionChannelVH',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: 'DistChannel',
                ValueListProperty: 'Code'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'Description'
            }
        ]
    };

    DeliveringPlant     @Common.ValueList: {
        CollectionPath: 'PlantVH',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: 'DeliveringPlant',
                ValueListProperty: 'Code'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'Description'
            }
        ]
    };

    CustPriceList       @Common.ValueList: {
        CollectionPath: 'PricelistVH',
        Parameters    : [{
            $Type            : 'Common.ValueListParameterInOut',
            LocalDataProperty: 'CustPriceList',
            ValueListProperty: 'Code'
        }]
    };

    CustGroup1          @Common.ValueList: {
        CollectionPath: 'CustomerGroup1VH',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: 'CustGroup1',
                ValueListProperty: 'Code'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'Description'
            }
        ]
    };
};


// ====================================================================
// 2. UI ANNOTATIONS (Layout, List Page, Object Page)
// ====================================================================
annotate service.PricelistData with @(
    // --- LIST PAGE ---
    UI.SelectionFields                 : [
        PricelistTitle,
        PricelistType,
        Status,
        EffectiveDate,
        // ExpiryDate,
        MarketScopeRegion,
        MarketScopeCountry,
        Currency,
        Version,
        createdBy,
        createdAt,
        PublishedDate,
        PublishedBy,
        Version,
        IsVersionActive
    ],

    UI.LineItem                        : [
        {
            $Type             : 'UI.DataField',
            Value             : PricelistTitle,
            @HTML5.CssDefaults: {width: '12rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : Status,
            @HTML5.CssDefaults: {width: '8rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : PricelistType,
            @HTML5.CssDefaults: {width: '12rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : MarketScopeRegion,
            @HTML5.CssDefaults: {width: '12rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : MarketScopeCountry,
            @HTML5.CssDefaults: {width: '12rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : Currency,
            @HTML5.CssDefaults: {width: '8rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : EffectiveDate,
            @HTML5.CssDefaults: {width: '8rem'}
        },
        {
            $Type             : 'UI.DataField',
            Value             : ExpiryDate,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Hidden        : true
        },

        {
            $Type         : 'UI.DataField',
            Value         : SalesOrg,
            @UI.Importance: #Low
        },
        {
            $Type         : 'UI.DataField',
            Value         : DistChannel,
            @UI.Importance: #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : CustGroup1,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : CustPriceList,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : ErpCustomer,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : DeliveringPlant,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : PublishedDate,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : PublishedBy,
            @HTML5.CssDefaults: {width: '8rem'},
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : createdAt,
            @UI.Importance    : #Low
        },
        {
            $Type             : 'UI.DataField',
            Value             : createdBy,
            @UI.Importance    : #Low
        },        
        {
            $Type         : 'UI.DataField',
            Value         : Version,
            @UI.Importance: #Low
        },
        {
            $Type     : 'UI.DataField',
            Value     : MarketDisplay,
            @UI.Hidden: true
        },
        {
            $Type     : 'UI.DataField',
            Value     : TermsAndConditions,
            @UI.Hidden: true
        }
    ],


    // --- OBJECT PAGE HEADER ---
    UI.HeaderInfo                      : {
        TypeName      : 'Pricelist',
        TypeNamePlural: 'Pricelists',
        Title         : {Value: PricelistTitle},
        Description   : {Value: Status},
        ImageUrl      : 'sap-icon://sales-order-item'
    },

    UI.HeaderFacets                    : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'PriceListHeaderFacet',
            Target: '@UI.FieldGroup#PriceListHeaderGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'PublishedInfoFacet',
            Target: '@UI.FieldGroup#PublishedInfoGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'RevisedInfoFacet',
            Target: '@UI.FieldGroup#RevisedInfoGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'CreatedInfoFacet',
            Target: '@UI.FieldGroup#CreatedInfoGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'AdminFacet',
            Target: '@UI.FieldGroup#AdminGroup'
        }
    ],

    // --- OBJECT PAGE TABS ---
    UI.Facets                          : [
        {
            $Type : 'UI.CollectionFacet',
            Label : 'Pricelist Information',
            ID    : 'PricelistInfoFacet',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    Label : 'Pricelist General Data',
                    Target: '@UI.FieldGroup#GeneralInfo'
                },
                {
                    $Type : 'UI.CollectionFacet',
                    ID    : 'ScopeContainer',
                    Label : 'Pricelist Scope',
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
        },
        {
            $Type : 'UI.CollectionFacet',
            Label : 'Categories and Product Details',
            ID    : 'ProductPricelistFacet',
            Facets: [

            ]
        },
    ],

    // --- FIELD GROUPS --- OBJECT PAGE HEADER
    UI.FieldGroup #PriceListHeaderGroup: {Data: [
        {
            Value: PricelistType,
            Label: 'Pricelist Type'
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
    UI.FieldGroup #PublishedInfoGroup  : {Data: [
        {
            Value: PublishedDate,
            Label: 'Published On'
        },
        {
            Value: PublishedBy,
            Label: 'Published By'
        }
    ]},
    UI.FieldGroup #RevisedInfoGroup    : {Data: [
        {
            Value: modifiedAt,
            Label: 'Last Revised On'
        },
        {
            Value: modifiedBy,
            Label: 'Revised By'
        }
    ]},
    UI.FieldGroup #CreatedInfoGroup    : {Data: [
        {
            Value: createdAt,
            Label: 'Created on'
        },
        {
            Value: createdBy,
            Label: 'Created By'
        }
    ]},
    UI.FieldGroup #AdminGroup          : {Data: [{
        Value: Version,
        Label: 'Version'
    }]},


    UI.FieldGroup #GeneralInfo         : {Data: [
        {Value: PricelistTitle},
        {Value: Currency},
        {Value: EffectiveDate},
        // {Value: ExpiryDate},
        {Value: Status},
    ]},

    UI.FieldGroup #MarketScope         : {Data: [
        {
            Value: PricelistType,
            Label: 'Pricelist Type'
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

    UI.FieldGroup #CommercialScope     : {Data: [
        {
            Value: SalesOrg,
            Label: 'Sales Organization'
        },
        {
            Value: DistChannel,
            Label: 'Distribution Channel'
        },
        {
            Value: CustPriceList,
            Label: 'Customer Pricelist'
        },
        {
            Value: CustGroup1,
            Label: 'Customer Group 1'
        },
        {
            Value: ErpCustomer,
            Label: 'Customer Code'
        },
        {
            Value: DeliveringPlant,
            Label: 'Delivering Plant'
        }
    ]},
    UI.FieldGroup #NotesForm           : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: Notes,
            },
            {
                $Type: 'UI.DataField',
                Value: NotesDisableExtUser,
            },
            {
                $Type: 'UI.DataField',
                Value: NotesDisableIntUser,
            },
        ],
    },
);

// ====================================================================
// 3. ITEMS LEVEL ANNOTATIONS (Value Help with Parameters)
// ====================================================================
annotate service.PricelistItemData with {
    PricelistPartNumber @(Common.ValueList: {
        CollectionPath: 'ResolvedPricelistItem',
        Parameters    : [
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
                LocalDataProperty: PricelistType,
                ValueListProperty: 'PricelistType'
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
    });
};

// ====================================================================
// 4. Header LEVEL ANNOTATIONS (Set Field to single value)
// ====================================================================
annotate PriceListService.PricelistData with @(Capabilities.FilterRestrictions: {FilterExpressionRestrictions: [
    {
        Property          : EffectiveDate,
        AllowedExpressions: 'SingleValue'
    },
    {
        Property          : ExpiryDate,
        AllowedExpressions: 'SingleValue'
    },
    {
        Property          : PublishedDate,
        AllowedExpressions: 'SingleValue'
    }
]});

// annotate PriceListService.CustomerVH with {
//     CUSTOMER @Common.Label: 'Customer';
//     SALES_ORGANIZATION @Common.Label: 'Sales Organization';
//     DISTRIBUTION_CHANNEL @Common.Label: 'Distribution Channel';
// }
