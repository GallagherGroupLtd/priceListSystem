using PriceListService as service from '../../srv/service';

annotate service.PricingParameters with @(
    UI.HeaderInfo                : {
        TypeName      : 'Pricing Parameter',
        TypeNamePlural: 'Pricing Parameters'
    },

    // Selection Fields for Filtering
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

    // Header Section at the top
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
                Value: modifiedAt,
                Label: 'Updated On'
            }
        ]
    },
 
    UI.FieldGroup #UsersGroup     : {
        Data: [
            {
                Value: createdBy,
                Label: 'Created By'
            },
            {
                Value: modifiedBy,
                Label: 'Updated By'
            }
        ]
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
        {Value: ErpPricingAccessSequence},
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.uploadData',
            Label : 'Upload Files',
            InvocationGrouping : #ChangeSet
        },   
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.duplicateRecord',
            Label : 'Duplicate Record',
            InvocationGrouping : #ChangeSet
        },         
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.copy',
            Label : 'Copy',
            InvocationGrouping : #ChangeSet
        },       
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'MyService.exportExcel',
            Label : 'Export as Excel',
            InvocationGrouping : #ChangeSet,
            criticality: #CRITICAL
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
        ],
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
        ],
    }    
   
    // UI.FieldGroup #GeneratedGroup: {
    //     $Type: 'UI.FieldGroupType',
    //     Data : [
    //         {
    //             $Type: 'UI.DataField',
    //             Value: TradeScenario,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: MarketScopeRegion,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: MarketScopeCountry,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: SalesOrg,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: DistChannel,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: CustPriceList,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: CustGroup1,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: ErpCustomer,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: DeliveringPlant,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: ErpPriceCondition,
    //         },
    //         {
    //             @Type: 'UI.DataField',
    //             Value: ErpSequence,
    //         },
    //         {
    //             $Type: 'UI.DataField',
    //             Value: ErpPricingAccessSequence,
    //         }
    //     ],
    // },
    // UI.Facets                    : [{
    //     $Type : 'UI.ReferenceFacet',
    //     ID    : 'GeneratedFacet1',
    //     Label : 'General Information',
    //     Target: '@UI.FieldGroup#GeneratedGroup',
    // }, ]
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
                // { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' },
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
                // { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'TradeScenario', ValueListProperty: 'TradeScenario' },
                // { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeRegion', ValueListProperty: 'MarketScopeRegion' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeCountry', ValueListProperty: 'MarketScopeCountry' }
            ]
        }
    );

    SalesOrg @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );

    DistChannel @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );

    CustPriceList @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );

    CustGroup1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );
        
    ErpCustomer @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
        }        
    );

    // ErpCustomer @(
    //     Common.ValueList: {
    //         $Type         : 'Common.ValueListType',
    //         CollectionPath: 'CustomerVH',
    //         Parameters: [
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' }
    //         ]
    //     }
    // );
    // SalesOrg @(
    //     Common.ValueList: {
    //         Common.ValueListWithFixedValues : true,
    //         $Type         : 'Common.ValueListType',
    //         CollectionPath: 'SalesOrgVH',
    //         Parameters: [
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' },
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' }
    //         ]
    //     }
    // );
    // DistChannel @(
    //     Common.ValueList: {
    //         Common.ValueListWithFixedValues : true,
    //         $Type         : 'Common.ValueListType',
    //         CollectionPath: 'DistChannelVH',
    //         Parameters: [
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'ErpCustomer', ValueListProperty: 'CUSTOMER' },
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
    //             { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' }
    //         ]
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

    DeliveringPlant @(
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PlantVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'CustomerNumber', ValueListProperty: 'CUSTOMER' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'SalesOrg', ValueListProperty: 'SALES_ORGANIZATION' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DistChannel', ValueListProperty: 'DISTRIBUTION_CHANNEL' },
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'DeliveringPlant', ValueListProperty: 'DELIVERING_PLANT' }
            ]
        }
    );

    // ErpPricingAccessSequence @(Common.ValueList: {
    //     $Type         : 'Common.ValueListType',
    //     CollectionPath : 'PricingCondType',
    //     SearchSupported: true,
    //     Parameters     : [
    //         {
    //             $Type            : 'Common.ValueListParameterInOut',
    //             LocalDataProperty: 'ErpPricingAccessSequence',
    //             ValueListProperty: 'ErpPricingAccessSequence'
    //         },
    //         {
    //             $Type            : 'Common.ValueListParameterDisplayOnly',
    //             ValueListProperty: 'SequenceDescription'
    //         }
    //     ]
    // });
}
