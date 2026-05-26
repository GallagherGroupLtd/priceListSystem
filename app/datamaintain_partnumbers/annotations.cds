using PriceListService as service from '../../srv/service';
annotate service.PartNumbers with @(

    // Selection Fields for Filtering
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry,SalesOrg,DistChannel,MaterialClassification1 ],

    UI.HeaderInfo: {
        TypeName      : 'Part Number',
        TypeNamePlural: 'Part Numbers'
    },
    UI.LineItem  : [
        { Value: ProductID },
        { Value: ProductDescription1 },
        { Value: SalesOrg },
        { Value: DistChannel },
        { Value: MaterialClassification1 },
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
                Value : ProductDescription2,
            }
        ],
    }    
);

annotate service.PartNumbers with {
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

    MaterialClassification1 @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueList',
            CollectionPath: 'MaterialGroup2VH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: 'MaterialClassification1', 
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