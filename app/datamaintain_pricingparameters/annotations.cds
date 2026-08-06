using PriceListService as service from '../../srv/service';

annotate service.PricingParameters with @(
    UI.HeaderInfo                : {
        TypeName      : 'Pricing Parameter',
        TypeNamePlural: 'Pricing Parameters',
        ImageUrl      : 'sap-icon://sales-order-item'
    },

    UI.HeaderFacets               : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'DatesFacet',
            Target: '@UI.FieldGroup#CreateGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'UsersFacet',
            Target: '@UI.FieldGroup#UpdateGroup'
        }
    ],
    UI.FieldGroup #CreateGroup     : {
        Data: [
            {
                Value: createdAt,
                Label: 'Created On'
            },
            {
                Value: createdBy,
                Label: 'Created BY'
            }
        ]
    },
    UI.FieldGroup #UpdateGroup     : {
        Data: [
            {
                Value: modifiedAt,
                Label: 'Updated On'
            },
            {
                Value: modifiedBy,
                Label: 'Updated By'
            }
        ]
    },

    // Selection Fields for Filtering
    UI.SelectionFields: [ PricelistType,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: PricelistType
        },
        {
            $Type: 'UI.DataField',
            Value: MarketScopeRegion
        },
        {
            $Type: 'UI.DataField',
            Value: MarketScopeCountry
        },
        {
            $Type: 'UI.DataField',
            Value: SalesOrg
        },
        {
            $Type: 'UI.DataField',
            Value: DistChannel
        },
        {
            $Type: 'UI.DataField',
            Value: CustPriceList
        },
        {
            $Type: 'UI.DataField',
            Value: CustGroup1
        },
        {
            $Type: 'UI.DataField',
            Value: ErpCustomer
        },
        {
            $Type: 'UI.DataField',
            Value: DeliveringPlant
        }
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
    UI.Facets: [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section1',
            Label : 'Pricelist Parameters',
            Target: '@UI.FieldGroup#TradeParameters'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section2',
            Label : 'ERP Data',
            Target: '@UI.FieldGroup#ERPData'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'PricingParameterEntries',
            Label : 'Pricing and Discount Conditions',
            Target: 'entries/@UI.LineItem'
        }
    ],
    UI.FieldGroup #TradeParameters: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: PricelistType,
            },
            {
                $Type: 'UI.DataField',
                Value: MarketScopeRegion,
            },
            {
                $Type: 'UI.DataField',
                Value: MarketScopeCountry,
            }
        ]
    },
    UI.FieldGroup #ERPData: {
        $Type: 'UI.FieldGroupType',
        Data : [
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
            }
        ]
    }   
);

annotate service.PricingParameters with {
    PricelistType @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PricelistTypeVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'PricelistType', ValueListProperty: 'PricelistType' }
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

    SalesOrg @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'SalesOrgVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'SalesOrg', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'Description' 
                }
            ]            
        }        
    );

    DistChannel @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DistributionChannelVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DistChannel', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    CustPriceList @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PricelistVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'CustPriceList', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    CustGroup1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'CustomerGroup1VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'CustGroup1', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );

    DeliveringPlant @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PlantVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DeliveringPlant', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    ); 
}

annotate service.PricingParameterEntries with @(
    UI.HeaderInfo: {
        TypeName      : 'Pricing or Discount Condition',
        TypeNamePlural: 'Pricing and Discount Conditions'
    },

    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: ParameterType,
            Label: 'Condition Category'
        },
        {
            $Type: 'UI.DataField',
            Value: ConditionType,
            Label: 'Condition Type'
        },
        {
            $Type: 'UI.DataField',
            Value: AccessSequence,
            Label: 'Pricing Access Sequence'
        },
        {
            $Type: 'UI.DataField',
            Value: Priority,
            Label: 'Priority'
        }
    ],

    UI.FieldGroup #EntryDetails: {
        Data: [
            {
                $Type: 'UI.DataField',
                Value: ParameterType,
                Label: 'Condition Category'
            },
            {
                $Type: 'UI.DataField',
                Value: ConditionType,
                Label: 'Condition Type'
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence,
                Label: 'Pricing Access Sequence'
            },
            {
                $Type: 'UI.DataField',
                Value: Priority,
                Label: 'Priority'
            }
        ]
    }
) {
    ParameterType @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PricingParameterTypeVH',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: ParameterType,
                    ValueListProperty: 'Code'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'Text'
                }
            ]
        }
    );

    ConditionType @(
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PricingConditionTypeVH',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterIn',
                    LocalDataProperty: ParameterType,
                    ValueListProperty: 'ParameterType'
                },
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: ConditionType,
                    ValueListProperty: 'Code'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'Description'
                }
            ]
        }
    );

    AccessSequence @(
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PricingAccessSequenceVH',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterIn',
                    LocalDataProperty: ParameterType,
                    ValueListProperty: 'ParameterType'
                },
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: AccessSequence,
                    ValueListProperty: 'Code'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'Description'
                }
            ]
        }
    );
};