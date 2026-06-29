using PriceListService as service from '../../srv/service';
annotate service.PriceProductMaintenance with @(

    // Selection Fields for Filtering
    UI.SelectionFields: [ PricelistType,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel ],

    UI.HeaderInfo: {
        TypeName      : 'Price Product Maintenance',
        TypeNamePlural: 'Price Product Maintenance'
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

    UI.LineItem  : [
        { Value: ProductID },
        { Value: ProductDescription1 },
        { Value: SalesOrg },
        { Value: DistChannel },
        { Value: ProductDescription2 }
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

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneralInformation',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet2',
            Label : 'Product Detail Translation',
            Target : '@UI.FieldGroup#DetailTranslation',
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'POAFOCFacet',
            Label  : 'POA/FOC',
            Target : 'poaFocValues/@UI.LineItem'
        }
    ],

    UI.FieldGroup #GeneralInformation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ProductID,
            },
            {
                $Type : 'UI.DataField',
                Value : ProductDescription1,
            },
            {
                $Type : 'UI.DataField',
                Value : SalesOrg,
            },
            {
                $Type : 'UI.DataField',
                Value : DistChannel,
            },
            {
                $Type : 'UI.DataField',
                Value : MaterialClassification1,
            },
            {
                $Type : 'UI.DataField',
                Value : ErpStatus,
            }
        ],
    },

    UI.FieldGroup #DetailTranslation : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ProductDescription2,
            },
            {
                $Type : 'UI.DataField',
                Value : MaterialClassification2,
            },
            {
                $Type : 'UI.DataField',
                Value : ProductStatus,
            },
            {
                $Type : 'UI.DataField',
                Value : StatusValidity,
            },
            {
                $Type : 'UI.DataField',
                Value : StatusExpiry,
            },
            {
                $Type : 'UI.DataField',
                Value : ThirdPartySupplier,
            },
            {
                $Type : 'UI.DataField',
                Value : ThirdPartySupplierSKU,
            }
        ],
    }    
);

annotate service.PriceProductPOAFOC with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : PricelistType,
            Label : 'Pricelist Type'
        },
        {
            $Type : 'UI.DataField',
            Value : POAFOCValue,
            Label : 'POA/FOC'
        }
    ]
);

annotate service.PriceProductPOAFOC with {
    PricelistType @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'PricelistTypeVH',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : PricelistType,
                    ValueListProperty : 'PricelistType'
                }
            ]
        }
    );

    POAFOCValue @(
        title : 'POA/FOC',
        Common.FieldControl : #Mandatory
    );
};

annotate service.PriceProductMaintenance with {
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

    ProductID @(
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MatMasVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'ProductID', 
                    ValueListProperty: 'Code' 
                },
                { 
                    $Type: 'Common.ValueListParameterOut', 
                    LocalDataProperty: 'ProductDescription1', 
                    ValueListProperty: 'Description' 
                }
            ]
        }
    );
    
    ProductDescription1     @Common.FieldControl : #ReadOnly;
    MaterialClassification1 @Common.FieldControl : #ReadOnly;
    ErpStatus               @Common.FieldControl : #ReadOnly;
}