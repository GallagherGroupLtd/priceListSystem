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
            Label               : 'Valid From'
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
    ]
);