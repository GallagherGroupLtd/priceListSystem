using PriceListService as service from '../../srv/service';
annotate service.TileContent with @(
    UI.HeaderInfo: {
        TypeName      : 'Tile Content',
        TypeNamePlural: 'Tile Contents'
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
    UI.SelectionFields: [ PricelistType,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,CustPriceList,CustGroup1,ErpCustomer ],

    UI.LineItem  : [
        { Value: PricelistType },
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
            Label : 'Tile Content - Heading',
            Target: '@UI.FieldGroup#TileContentHeading',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section4',
            Label : 'Tile Content - Sub Title',
            Target: '@UI.FieldGroup#TileContentSubTitle',
        }, 
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'Section5',
            Label : 'Tile Content - Image Link',
            Target: '@UI.FieldGroup#TileContentImageLink',
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
    },     
    UI.FieldGroup #TileContentHeading: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: InformationHeading,
            }
        ]
    },     
    UI.FieldGroup #TileContentSubTitle: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: InformationDetails,
            }
        ]
    },     
    UI.FieldGroup #TileContentImageLink: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: ImageLink,
            }
        ]
    }
);

annotate service.TileContent with {
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

    InformationHeading @UI.MultiLineText;
    InformationDetails @UI.MultiLineText;
    ImageLink          @UI.MultiLineText;    
};