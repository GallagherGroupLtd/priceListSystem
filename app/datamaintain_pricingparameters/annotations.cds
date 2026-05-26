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
        {Value: ConditionType1},
        {Value: AccessSequence1},
        {Value: Priority1},
        {Value: DiscountConditionType1},
        {Value: DiscountAccessSequence1},
        {Value: Priority1}
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
            ID    : 'Section_Price1',
            Label : 'Pricing Parameters #1',
            Target: '@UI.FieldGroup#PricingParameter1',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price2',
            Label : 'Pricing Parameters #2',
            Target: '@UI.FieldGroup#PricingParameter2',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price3',
            Label : 'Pricing Parameters #3',
            Target: '@UI.FieldGroup#PricingParameter3',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price4',
            Label : 'Pricing Parameters #4',
            Target: '@UI.FieldGroup#PricingParameter4',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price5',
            Label : 'Pricing Parameters #5',
            Target: '@UI.FieldGroup#PricingParameter5',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price6',
            Label : 'Pricing Parameters #6',
            Target: '@UI.FieldGroup#PricingParameter6',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price7',
            Label : 'Pricing Parameters #7',
            Target: '@UI.FieldGroup#PricingParameter7',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price8',
            Label : 'Pricing Parameters #8',
            Target: '@UI.FieldGroup#PricingParameter8',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Price9',
            Label : 'Pricing Parameters #9',
            Target: '@UI.FieldGroup#PricingParameter9',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount1',
            Label : 'Discount/Surcharge Parameters #1',
            Target: '@UI.FieldGroup#DiscountParameter1',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount2',
            Label : 'Discount/Surcharge Parameters #2',
            Target: '@UI.FieldGroup#DiscountParameter2',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount3',
            Label : 'Discount/Surcharge Parameters #3',
            Target: '@UI.FieldGroup#DiscountParameter3',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount4',
            Label : 'Discount/Surcharge Parameters #4',
            Target: '@UI.FieldGroup#DiscountParameter4',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount5',
            Label : 'Discount/Surcharge Parameters #5',
            Target: '@UI.FieldGroup#DiscountParameter5',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount6',
            Label : 'Discount/Surcharge Parameters #6',
            Target: '@UI.FieldGroup#DiscountParameter6',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount7',
            Label : 'Discount/Surcharge Parameters #7',
            Target: '@UI.FieldGroup#DiscountParameter7',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount8',
            Label : 'Discount/Surcharge Parameters #8',
            Target: '@UI.FieldGroup#DiscountParameter8',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount9',
            Label : 'Discount/Surcharge Parameters #9',
            Target: '@UI.FieldGroup#DiscountParameter9',
        },  
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section_Discount10',
            Label : 'Discount/Surcharge Parameters #10',
            Target: '@UI.FieldGroup#DiscountParameter10',
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
   
    UI.FieldGroup #PricingParameter1: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType1,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence1,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority1,
            },
        ]
    },

    UI.FieldGroup #PricingParameter2: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType2,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence2,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority2,
            },
        ]
    },

    UI.FieldGroup #PricingParameter3: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType3,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence3,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority3,
            },
        ]
    },

    UI.FieldGroup #PricingParameter4: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType4,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence4,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority4,
            },
        ]
    },

    UI.FieldGroup #PricingParameter5: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType5,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence5,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority5,
            },
        ]
    },

    UI.FieldGroup #PricingParameter6: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType6,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence6,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority6,
            },
        ]
    },

    UI.FieldGroup #PricingParameter7: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType7,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence7,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority7,
            },
        ]
    },

    UI.FieldGroup #PricingParameter8: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType8,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence8,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority8,
            },
        ]
    },

    UI.FieldGroup #PricingParameter9: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ConditionType9,
            },
            {
                $Type: 'UI.DataField',
                Value: AccessSequence9,
            },
            {
                $Type: 'UI.DataField',
                Value: Priority9,
            },
        ]
    },

    UI.FieldGroup #DiscountParameter1: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType1,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence1,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority1,
            }
        ]
    },
    UI.FieldGroup #DiscountParameter2: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType2,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence2,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority2,
            }
        ]
    },
    UI.FieldGroup #DiscountParameter3: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType3,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence3,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority3,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter4: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType4,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence4,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority4,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter5: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType5,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence5,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority5,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter6: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType6,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence6,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority6,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter7: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType7,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence7,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority7,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter8: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType8,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence8,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority8,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter9: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType9,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence9,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority9,
            }
        ]
    }, 
    UI.FieldGroup #DiscountParameter10: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: DiscountConditionType10,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountAccessSequence10,
            },
            {
                $Type: 'UI.DataField',
                Value: DiscountPriority10,
            }
        ]
    },     
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

    //Price Value Help
    ConditionType1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType1', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence1', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType2 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType2', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence2 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence2', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType3 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType3', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence3 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence3', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType4 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType4', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence4 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence4', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType5 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType5', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence5 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence5', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType6 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType6', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence6 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence6', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType7 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType7', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence7 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence7', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType8 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType8', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence8 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence8', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    ConditionType9 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ConditionType9', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    AccessSequence9 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'PriceAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'AccessSequence9', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterDisplayOnly', 
                    ValueListProperty: 'Description' 
                }
            ]              
        }        
    );  

    //Discount/Surcharge Value Help
    DiscountConditionType1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType1', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence1', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    DiscountConditionType2 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType2', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence2 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence2', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );    

    DiscountConditionType3 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType3', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence3 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence3', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );          

    DiscountConditionType4 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType4', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence4 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence4', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    ); 

    DiscountConditionType5 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType5', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence5 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence5', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );               

    DiscountConditionType6 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType6', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence6 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence6', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );   

    DiscountConditionType7 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType7', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence7 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence7', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );   

    DiscountConditionType8 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType8', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence8 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence8', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );   

    DiscountConditionType9 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType9', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence9 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence9', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );   

    DiscountConditionType10 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountConditionTypeVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountConditionType10', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );

    DiscountAccessSequence10 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'DiscountAccessSequenceVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'DiscountAccessSequence10', 
                    ValueListProperty: 'Code' 
                }
            ]              
        }        
    );   
}
