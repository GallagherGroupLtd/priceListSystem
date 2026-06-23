using PriceListService as service from '../../srv/service';

// ====================================================================
// 1. PROPERTY LEVEL ANNOTATIONS (Labels, Mandatory, Value Helps)
// ====================================================================
annotate service.PricelistData with {    
// Labels & Mandatory
    PricelistTitle     @Common.Label : 'Pricelist'          @mandatory;
    Status             @Common.Label : 'Status';
    EffectiveDate      @Common.Label : 'Valid From';
    ExpiryDate         @Common.Label : 'Valid To';
    TradeScenario      @Common.Label : 'Trade Scenario'     @mandatory;
    MarketScopeRegion  @Common.Label : 'Region'             @mandatory;
    MarketScopeCountry @Common.Label : 'Country'            @mandatory;
    Currency           @Common.Label : 'Currency';
    SalesOrg           @Common.Label : 'Sales Organization';
    DistChannel        @Common.Label : 'Distribution Channel';
    CustGroup1         @Common.Label : 'Customer Group 1';
    CustPriceList      @Common.Label : 'Customer Pricelist';
    ErpCustomer        @Common.Label : 'Customer Account';
    DeliveringPlant    @Common.Label : 'Delivering Plant';
    createdBy          @Common.Label : 'Created By';
    createdAt          @Common.Label : 'Created On';
    PublishedDate      @Common.Label : 'Published On';
    PublishedBy        @Common.Label : 'Published By';
    Version            @Common.Label : 'Version';
    MarketDisplay      @Common.Label : 'Market Display';
    TermsAndConditions @Common.Label : 'Terms and Conditions';

// Value Help: Pricelist
    PricelistTitle @(
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'PricelistData',
            Parameters     : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : PricelistTitle, ValueListProperty : 'PricelistTitle' }
            ]
        }
    );

// Value Help: Status
    Status @(
        Common.ValueListWithFixedValues : true,
        Common.Text : Status,
        Common.TextArrangement : #TextOnly,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'StatusVH', 
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : Status, ValueListProperty : 'code' },
                { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'name' } 
            ]
        }
    );

// Value Help: TradeScenario
    TradeScenario @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'TradeScenarioVH',
            Parameters     : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : TradeScenario,      ValueListProperty : 'TradeScenario' }
            ]
        }
    );

    // Value Help: MarketScopeRegion
    MarketScopeRegion @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'MarketRegionVH',
            Parameters     : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : MarketScopeRegion,  ValueListProperty : 'MarketScopeRegion' }
            ]
        }
    );

    // Value Help: MarketScopeCountry
    MarketScopeCountry @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'MarketCountryVH',
            Parameters     : [
                { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : MarketScopeCountry, ValueListProperty : 'MarketScopeCountry' }
            ]
        }
    );

    // Value Help: Others
    ErpCustomer     @Common.ValueList : { CollectionPath : 'CustomerVH', Parameters : [
        { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : ErpCustomer, ValueListProperty : 'CUSTOMER' },
        { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : SalesOrg,    ValueListProperty : 'SALES_ORGANIZATION' },
        { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : DistChannel, ValueListProperty : 'DISTRIBUTION_CHANNEL' }
    ]};
    
    SalesOrg        @Common.ValueList : { CollectionPath : 'SalesOrgVH', Parameters : [{ $Type : 'Common.ValueListParameterInOut', LocalDataProperty : SalesOrg, ValueListProperty : 'SALES_ORGANIZATION' }]};
    DistChannel     @Common.ValueList : { CollectionPath : 'DistChannelVH', Parameters : [{ $Type : 'Common.ValueListParameterInOut', LocalDataProperty : DistChannel, ValueListProperty : 'DISTRIBUTION_CHANNEL' }]};
    DeliveringPlant @Common.ValueList : { CollectionPath : 'PlantVH', Parameters : [{ $Type : 'Common.ValueListParameterInOut', LocalDataProperty : DeliveringPlant, ValueListProperty : 'DELIVERING_PLANT' }]};
    CustPriceList   @Common.ValueList : { CollectionPath : 'CustPricelistVH', Parameters : [{ $Type : 'Common.ValueListParameterInOut', LocalDataProperty : CustPriceList, ValueListProperty : 'PRICE_LIST_TYPE' }]};

};


// ====================================================================
// 2. UI ANNOTATIONS (Layout, List Page, Object Page)
// ====================================================================
annotate service.PricelistData with @(
    // --- LIST PAGE ---
    UI.SelectionFields : [
        PricelistTitle,
        Status,
        EffectiveDate,
        ExpiryDate,
        TradeScenario,
        MarketScopeRegion,
        MarketScopeCountry,
        createdBy,
        createdAt,
        PublishedDate
    ],

    UI.LineItem : [
        { $Type : 'UI.DataField', Value : PricelistTitle,       @HTML5.CssDefaults : {width : '12rem'} },
        { $Type : 'UI.DataField', Value : TradeScenario,        @HTML5.CssDefaults : {width : '12rem'} },
        { $Type : 'UI.DataField', Value : MarketScopeRegion,    @HTML5.CssDefaults : {width : '12rem'} },
        { $Type : 'UI.DataField', Value : MarketScopeCountry,   @HTML5.CssDefaults : {width : '12rem'} },
        { $Type : 'UI.DataField', Value : Currency,             @HTML5.CssDefaults : {width : '8rem'} },
        { $Type : 'UI.DataField', Value : Status,               @HTML5.CssDefaults : {width : '8rem'} },
        { $Type : 'UI.DataField', Value : EffectiveDate,        @HTML5.CssDefaults : {width : '8rem'} },
        { $Type : 'UI.DataField', Value : ExpiryDate,           @HTML5.CssDefaults : {width : '8rem'} },

        { $Type : 'UI.DataField', Value : SalesOrg,             @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : DistChannel,          @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : CustGroup1,           @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : CustPriceList,        @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : ErpCustomer,          @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : DeliveringPlant,      @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : createdAt,            @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : createdBy,            @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : PublishedDate,        @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : Version,              @UI.Importance: #Low },
        { $Type : 'UI.DataField', Value : PublishedBy,          @UI.Hidden: true },
        { $Type : 'UI.DataField', Value : MarketDisplay,        @UI.Hidden: true },
        { $Type : 'UI.DataField', Value : TermsAndConditions,   @UI.Hidden: true }        
    ],


    // --- OBJECT PAGE HEADER ---
    UI.HeaderInfo : {
        TypeName       : 'Pricelist',
        TypeNamePlural : 'Pricelists',
        Title          : { Value : PricelistTitle },
        Description    : { Value : Version },
        ImageUrl       : 'sap-icon://sales-order-item'
    },

    UI.HeaderFacets : [
        { $Type : 'UI.ReferenceFacet', ID : 'DatesFacet', Target : '@UI.FieldGroup#DatesGroup' },
        { $Type : 'UI.ReferenceFacet', ID : 'UsersFacet', Target : '@UI.FieldGroup#UsersGroup' },
        { $Type : 'UI.ReferenceFacet', ID : 'AdminFacet', Target : '@UI.FieldGroup#AdminGroup' }
    ],

    // --- OBJECT PAGE TABS ---
    UI.Facets : [
        {
            $Type  : 'UI.CollectionFacet',
            Label  : 'Pricelist Information',
            ID     : 'PricelistInfoFacet',
            Facets : [
                { $Type : 'UI.ReferenceFacet', Label : 'General',      Target : '@UI.FieldGroup#GeneralInfo' },
                {
                    $Type  : 'UI.CollectionFacet',
                    ID     : 'ScopeContainer',
                    Label  : 'Scope',
                    Facets : [
                        { $Type : 'UI.ReferenceFacet', Label : 'Market Scope',     Target : '@UI.FieldGroup#MarketScope' },
                        { $Type : 'UI.ReferenceFacet', Label : 'Commercial Scope', Target : '@UI.FieldGroup#CommercialScope' }
                    ]
                }
            ]
        }
    ],

    // --- FIELD GROUPS ---
    UI.FieldGroup #DatesGroup      : { Data : [
        { Value : createdAt,     Label : 'Created on' },
        { Value : modifiedAt,    Label : 'Last Revised On' },
        { Value : PublishedDate, Label : 'Published On' }
    ]},

    UI.FieldGroup #UsersGroup      : { Data : [
        { Value : createdBy,   Label : 'Created By' },
        { Value : modifiedBy,  Label : 'Revised By' },
        { Value : PublishedBy, Label : 'Published By' }
    ]},

    UI.FieldGroup #AdminGroup      : { Data : [
        { Value : Version, Label : 'Version' },
        { Value : Status,  Label : 'Status' }
    ]},

    UI.FieldGroup #GeneralInfo     : { Data : [
        { Value : PricelistTitle },
        { Value : Currency },
        { Value : EffectiveDate },
        { Value : ExpiryDate }
    ]},

    UI.FieldGroup #MarketScope     : { Data : [
        { Value : TradeScenario,      Label : 'Trade Scenario' },
        { Value : MarketScopeRegion,  Label : 'Region' },
        { Value : MarketScopeCountry, Label : 'Country' }
    ]},

    UI.FieldGroup #CommercialScope : { Data : [
        { Value : SalesOrg,        Label : 'Sales Org' },
        { Value : DistChannel,     Label : 'Dist. Channel' },
        { Value : CustPriceList,   Label : 'Cust. Price List' },
        { Value : CustGroup1,      Label : 'Cust. Group 1' },
        { Value : ErpCustomer,     Label : 'Customer Code' },
        { Value : DeliveringPlant, Label : 'Delivering Plant' }
    ]}
);

// ====================================================================
// 3. ITEMS LEVEL ANNOTATIONS (Value Help with Parameters)
// ====================================================================
annotate service.PricelistItemData with {
    PricelistPartNumber @(Common.ValueList : {
        CollectionPath : 'ResolvedPricelistItem',
        Parameters     : [
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : SalesOrg,               ValueListProperty : 'SalesOrg' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : DistChannel,            ValueListProperty : 'DistChannel' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : DeliveringPlant,        ValueListProperty : 'DeliveringPlant' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : CustPriceList,          ValueListProperty : 'CustPriceList' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : CustGroup1,             ValueListProperty : 'CustomerGroup1' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : ErpCustomer,            ValueListProperty : 'ErpCustomer' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : TradeScenario,          ValueListProperty : 'TradeScenario' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : MarketScopeRegion,      ValueListProperty : 'MarketScopeRegion' },
            { $Type : 'Common.ValueListParameterIn',  LocalDataProperty : MarketScopeCountry,     ValueListProperty : 'MarketScopeCountry' },
            { $Type : 'Common.ValueListParameterOut', LocalDataProperty : PartNumberDescr,        ValueListProperty : 'MaterialDescription' },
            { $Type : 'Common.ValueListParameterOut', LocalDataProperty : MaterialPricingGroup,   ValueListProperty : 'MaterialPricingGroup' },
            { $Type : 'Common.ValueListParameterOut', LocalDataProperty : CustomerClassification, ValueListProperty : 'CustomerClassification' },
            { $Type : 'Common.ValueListParameterOut', LocalDataProperty : PriceCondition,         ValueListProperty : 'PriceCondition' },
            { $Type : 'Common.ValueListParameterOut', LocalDataProperty : Price,                  ValueListProperty : 'Price' },
            { $Type : 'Common.ValueListParameterOut', LocalDataProperty : PriceUnit,              ValueListProperty : 'PriceUnit' }
        ]
    });
};

// ====================================================================
// 4. Header LEVEL ANNOTATIONS (Set Field to single value)
// ====================================================================
annotate PriceListService.PricelistData with @(
    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            {
                Property : EffectiveDate,
                AllowedExpressions : 'SingleValue'
            },
            {
                Property : ExpiryDate,
                AllowedExpressions : 'SingleValue'
            },
            {
                Property : PublishedDate,
                AllowedExpressions : 'SingleValue'
            }
        ]
    }
);