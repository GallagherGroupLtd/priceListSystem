using PriceListService as service from '../../srv/service';

annotate PriceListService.TradeScenarios with @(
    UI.SelectionFields: [
        PricelistType,
        MarketScopeRegion,
        MarketScopeCountry
    ],
    
UI.HeaderInfo                 : {
        ImageUrl      : 'sap-icon://sales-order-item'
    },     

    UI.HeaderFacets               : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'CreateFacet',
            Target: '@UI.FieldGroup#CreateGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'UpdateFacet',
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
                Label: 'Created By'
            },            
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
            },
        ]
    },

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

    UI.LineItem: [
        {
            $Type : 'UI.DataField',
            Value: PricelistType,
            Label: 'Pricelist Type'
        },
        {
            $Type : 'UI.DataField',
            Value: MarketScopeRegion,
            Label: 'Region'
        },
        {
            $Type : 'UI.DataField',
            Value: MarketScopeCountry,
            Label: 'Country'
        }
    ], 

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'Facet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'Facet2',
            Label : 'Email Content',
            Target : '@UI.FieldGroup#EmailSubject'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'Facet3',
            Target : '@UI.FieldGroup#EmailBody'
        }
    ],

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value: PricelistType,
                Label: 'Pricelist Type'
            },
            {
                $Type : 'UI.DataField',
                Value: MarketScopeRegion,
                Label: 'Region'
            },
            {
                $Type : 'UI.DataField',
                Value: MarketScopeCountry,
                Label: 'Country'
            }
        ],
    },

    UI.FieldGroup #EmailSubject : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value: EmailSubject,
                Label: 'Email Subject'
            }
        ]
    },    

    UI.FieldGroup #EmailBody : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value: EmailBody,
                Label: 'Email Body'
            }
        ]
    }    
);

annotate PriceListService.TradeScenarios with {

    EmailSubject @UI.MultiLineText;
    EmailBody @UI.MultiLineText;

};