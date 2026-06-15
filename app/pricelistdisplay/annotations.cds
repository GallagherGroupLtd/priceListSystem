using PriceListDisplayService as service from '../../srv/display-service';

// ====================================================================
// 2. UI ANNOTATIONS (Layout, List Page, Object Page)
// ====================================================================
annotate service.PricelistData with @(
    // --- LIST PAGE --- Filters
    UI.SelectionFields            : [
        PricelistTitle,
        PricelistType,
        MarketScopeCountry,
        Currency,
        EffectiveDate,
        PublishedDate,
        Version
    ],

    // --- LIST PAGE --- Table Columns
    UI.LineItem                   : [
        {
            $Type               : 'UI.DataField',
            Value               : PricelistTitle,
            @HTML5.CssDefaults  : {width: '12rem'},
            Label               : 'Pricelist Name'
        },
        {
            $Type               : 'UI.DataField',
            Value               : MarketScopeCountry,
            @HTML5.CssDefaults  : {width: '8rem'},
            Label               : 'Country'
        },
        {
            $Type               : 'UI.DataField',
            Value               : Currency,
            @HTML5.CssDefaults  : {width: '8rem'},
            Label               : 'Currency'
        },
        {
            $Type               : 'UI.DataField',
            Value               : EffectiveDate,
            @HTML5.CssDefaults  : {width: '8rem'},
            Label               : 'Effective Date'
        },
        {
            $Type               : 'UI.DataField',
            Value               : PublishedDate,
            @HTML5.CssDefaults  : {width: '8rem'},
            Label               : 'Issue Date'
        },
        {
            $Type               : 'UI.DataField',
            Value               : Version,
            @HTML5.CssDefaults  : {width: '8rem'},
            Label               : 'Version'
        }
    ],

    // --- OBJECT PAGE HEADER ---
    UI.HeaderInfo       : {
        TypeName        : 'Pricelist',
        TypeNamePlural  : 'Pricelists',
        Title           : {Value: PricelistTitle},
        Description     : {Value: Status},
        ImageUrl        : 'sap-icon://sales-order-item'
    },

    UI.HeaderFacets     : [
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
            ID    : 'AdminFacet',
            Target: '@UI.FieldGroup#AdminGroup'
        }
    ],

    // --- FIELD GROUPS --- OBJECT PAGE HEADER
    UI.FieldGroup #PriceListHeaderGroup: {Data: [
        {
            Value: PricelistType,
            Label: 'Pricelist Type'
        },
        {
            Value: Currency,
            Label: 'Currency'
        },
        {
            Value: MarketScopeCountry,
            Label: 'Country'
        }
    ]},    
    UI.FieldGroup #PublishedInfoGroup     : {Data: [
        {
            Value: EffectiveDate,
            Label: 'Valid From'
        },
        {
            Value: PublishedDate,
            Label: 'Issue Date'
        }
    ]},
    UI.FieldGroup #AdminGroup     : {Data: [
        {
            Value: Version,
            Label: 'Version'
        }
    ]},

    // --- OBJECT PAGE TABS ---
    UI.Facets                     : [{
        $Type : 'UI.CollectionFacet',
        Label : 'Pricelist Information',
        ID    : 'PricelistInfoFacet',
        Facets: [
        ]
    },
    {
        $Type : 'UI.CollectionFacet',
        Label : 'Category and Product Details',
        ID    : 'ProductPricelistFacet',
        Facets: [
            
        ]
    }]
);