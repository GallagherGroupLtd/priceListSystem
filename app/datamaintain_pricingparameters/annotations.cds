using PriceListService as service from '../../srv/service';

annotate service.PricingParameters with @(
    UI.HeaderInfo                : {
        TypeName      : 'Pricing Parameter',
        TypeNamePlural: 'Pricing Parameters'
    },

    // Header Section at the top
    UI.HeaderInfo                 : {
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
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

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
    UI.Facets                    : 
    [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section1',
            Label : 'Trade Parameters',
            Target: '@UI.FieldGroup#TradeParameters',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section2',
            Label : 'ERP Data',
            Target: '@UI.FieldGroup#ERPData',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section3',
            Label : 'Pricing Parameters',
            Target: '@UI.FieldGroup#PricingParameter',
        }   

    ],     
    UI.FieldGroup #TradeParameters: {
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
    },
   
    UI.FieldGroup #PricingParameter: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence,
            }
        ]
    }
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

    ConditionType @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    DiscountConditionType @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );           
}
