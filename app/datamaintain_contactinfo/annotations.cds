using PriceListService as service from '../../srv/service';
annotate service.ContactInfo with @(
    UI.HeaderInfo: {
        TypeName      : 'Contact Information',
        TypeNamePlural: 'Contact Information'
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
    UI.SelectionFields: [ TradeScenario,MarketScopeRegion,MarketScopeCountry ],

    UI.LineItem  : [
        {
            Value: ContactEmail,
            Label: 'E-mail Address'
        },
        {
            Value: ContactNumber,
            Label: 'Phone Number'
        },
        { Value: InternalAccount },
        { Value: ExternalAccount },        
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
            ID : 'Facet1',
            Label : 'Contact Information',
            Target : '@UI.FieldGroup#ContactInfo',
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'Facet2',
            Label : 'Account Information',
            Target : '@UI.FieldGroup#AccountInfo',
        },
    ],
    UI.FieldGroup #ContactInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : TradeScenario,
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeRegion,
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeCountry,
            },
            {
                $Type : 'UI.DataField',
                Value : ContactEmail,
            },
            {
                $Type : 'UI.DataField',
                Value : ContactNumber,
            }
        ],
    },    
    UI.FieldGroup #AccountInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : InternalAccount,
            },
            {
                $Type : 'UI.DataField',
                Value : ExternalAccount,
            }
        ],
    },     
);

annotate service.ContactInfo with {
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

    InternalAccount @Common.FieldControl : #Editable;
    ExternalAccount @Common.FieldControl : #Editable;
}