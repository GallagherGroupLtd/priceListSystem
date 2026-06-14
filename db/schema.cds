namespace com.sap.pricelistsystem;

using {
    managed,
    cuid
} from '@sap/cds/common';

/** Directory for the List of tables for Data Maintenance Application */
entity MaintenanceTableDirectory : managed, cuid {
    tableName   : String(100) @title: 'Table Name';
    description : String(255) @title: 'Description';
}

/** Trade and Market Scenario Determination **/
entity TradeAndMarketScenarioDetermination : managed, cuid {
    PricelistType      : String(255) @title: 'Pricelist Type';
    MarketScopeRegion  : String(255) @title: 'Market Scope Region';
    MarketScopeCountry : String(255) @title: 'Market Scope Country';
    EmailSubject       : String(255) @title: 'Email Subject';
    EmailBody          : String(1000) @title: 'Email Body';
}

/** Pricelist Item Structure Components **/
entity PricelistItemStructureComponents : managed, cuid {
    PricelistType      : String(255) @title: 'Pricelist Type';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    SalesOrg           : String(4)   @title: 'Sales Organization';
    DistChannel        : String(2)   @title: 'Distribution Channel';
    Sequence           : String(255) @title: 'Sequence';
    CustPriceList      : String(20)  @title: 'Customer Pricelist';
    CustGroup1         : String(255) @title: 'Customer Group 1';
    ErpCustomer        : String(255) @title: 'ERP Customer';
    DeliveringPlant    : String(255) @title: 'Plant';
    MainCategory       : String(255) @title: 'Main Category';
    SubCategory1       : String(255) @title: 'Subcategory 1';
    SubCategory2       : String(255) @title: 'Subcategory 2';
    SubCategory3       : String(255) @title: 'Subcategory 3';
    SubCategory4       : String(255) @title: 'Subcategory 4';
    SubCategory5       : String(255) @title: 'Subcategory 5';
    MainCategoryLocal  : String(255) @title: 'Main Category Local Description';
    SubCategory1Local  : String(255) @title: 'Subcategory 1 Local Description';
    SubCategory2Local  : String(255) @title: 'Subcategory 2 Local Description';
    SubCategory3Local  : String(255) @title: 'Subcategory 3 Local Description';
    SubCategory4Local  : String(255) @title: 'Subcategory 4 Local Description';
    SubCategory5Local  : String(255) @title: 'Subcategory 5 Local Description';
}

/** Pricelist Product Maintenance **/
entity PricelistPartNumberDetermination : managed, cuid {
    PricelistType                   : String(255) @title: 'Pricelist Type';
    MarketScopeRegion               : String(255) @title: 'Region';
    MarketScopeCountry              : String(255) @title: 'Country';
    SalesOrg                        : String(255) @title: 'Sales Organization';
    DistChannel                     : String(2)   @title: 'Distribution Channel';
    ProductID                       : String(30)  @title: 'Product ID';
    ProductDescription1             : String(255) @title: 'Product Description';
    MaterialClassification1         : String(255) @title: 'Material Classification';
    ProductDescription2             : String(255) @title: 'Pricelist Product Description';
    MaterialClassification2         : String(255) @title: 'Translation Material Classification';
    PricelistMaterialClassification : String(255) @title: 'Pricelist Material Classification';
    ProductStatus                   : String(255) @title: 'Product Status';
    StatusValidity                  : Date        @title: 'Status Validity';
}

/** Terms and Condition Determination **/
entity TermsAndConditionDetermination : managed, cuid {
    PricelistType                 : String(255) @title: 'Pricelist Type';
    MarketScopeRegion             : String(255) @title: 'Region';
    MarketScopeCountry            : String(255) @title: 'Country';
    SalesOrg                      : String(4)   @title: 'Sales Organization';
    DistChannel                   : String(2)   @title: 'Distribution Channel';
    CustPriceList                 : String(20)  @title: 'Customer Pricelist';
    CustGroup1                    : String(255) @title: 'Customer Group 1';
    ErpCustomer                   : String(255) @title: 'ERP Customer';
    DeliveringPlant               : String(255) @title: 'Plant';
    TermsAndCondition             : String(255) @title: 'GeneralTerms and Conditions';
    MainCategory                  : String(255) @title: 'Main Category';
    SubCategory1                  : String(255) @title: 'Subcategory 1';
    SubCategory2                  : String(255) @title: 'Subcategory 2';
    SubCategory3                  : String(255) @title: 'Subcategory 3';
    SubCategory4                  : String(255) @title: 'Subcategory 4';
    SubCategory5                  : String(255) @title: 'Subcategory 5';
    MainCategoryLocal : String(255) @title: 'Main Category Terms and Condition';
    SubCategory1Local : String(255) @title: 'Subcategory 1 Terms and Condition';
    SubCategory2Local : String(255) @title: 'Subcategory 2 Terms and Condition';
    SubCategory3Local : String(255) @title: 'Subcategory 3 Terms and Condition';
    SubCategory4Local : String(255) @title: 'Subcategory 4 Terms and Condition';
    SubCategory5Local : String(255) @title: 'Subcategory 5 Terms and Condition';
    TermsAndConditionCategory : String(255) @title: 'Terms and Conditions Category';
    PricelistFieldName        : String(255) @title: 'Pricelist Fieldname';
    PricelistDataLevel        : String(255) @title: 'Pricelist Data Level';
    TermsAndConditionContent  : String      @title: 'Terms and Conditions Content';
}

/** Pricing Parameter Determination **/
entity PricingParameterDetermination : managed, cuid {
    PricelistType            : String(255) @title : 'Pricelist Type';
    MarketScopeRegion        : String(255) @title : 'Region';
    MarketScopeCountry       : String(255) @title : 'Country';
    SalesOrg                 : String(4)   @title : 'Sales Organization';
    DistChannel              : String(2)   @title : 'Distribution Channel';
    CustPriceList            : String(20)  @title : 'Customer Pricelist';
    CustGroup1               : String(255) @title : 'Customer Group 1';
    ErpCustomer              : String(255) @title : 'ERP Customer Code';
    DeliveringPlant          : String(255) @title : 'Plant';
    ConditionType1           : String(4)   @title : 'Product Price Condition Type (PP1)';
    AccessSequence1          : String(255) @title : 'Product Pricing Access Sequence (PP1)';
    Priority1                : String(255) @title : 'Priority (PP1)';
    ConditionType2           : String(4)   @title : 'Product Price Condition Type (PP2)';
    AccessSequence2          : String(255) @title : 'Product Pricing Access Sequence (PP2)';
    Priority2                : String(255) @title : 'Priority (PP2)';
    ConditionType3           : String(4)   @title : 'Product Price Condition Type (PP3)';
    AccessSequence3          : String(255) @title : 'Product Pricing Access Sequence (PP3)';
    Priority3                : String(255) @title : 'Priority (PP3)';
    ConditionType4           : String(4)   @title : 'Product Price Condition Type (PP4)';
    AccessSequence4          : String(255) @title : 'Product Pricing Access Sequence (PP4)';
    Priority4                : String(255) @title : 'Priority (PP4)';
    ConditionType5           : String(4)   @title : 'Product Price Condition Type (PP5)';
    AccessSequence5          : String(255) @title : 'Product Pricing Access Sequence (PP5)';
    Priority5                : String(255) @title : 'Priority (PP5)';
    ConditionType6           : String(4)   @title : 'Product Price Condition Type (PP6)';
    AccessSequence6          : String(255) @title : 'Product Pricing Access Sequence (PP6)';
    Priority6                : String(255) @title : 'Priority (PP6)';
    ConditionType7           : String(4)   @title : 'Product Price Condition Type (PP7)';
    AccessSequence7          : String(255) @title : 'Product Pricing Access Sequence (PP7)';
    Priority7                : String(255) @title : 'Priority (PP7)';
    ConditionType8           : String(4)   @title : 'Product Price Condition Type (PP8)';
    AccessSequence8          : String(255) @title : 'Product Pricing Access Sequence (PP8)';
    Priority8                : String(255) @title : 'Priority (PP8)';
    ConditionType9           : String(4)   @title : 'Product Price Condition Type (PP9)';
    AccessSequence9          : String(255) @title : 'Product Pricing Access Sequence (PP9)';
    Priority9                : String(255) @title : 'Priority (PP9)';
    DiscountConditionType1   : String(4)   @title : 'Discount/Surcharge Condition Type (DS1)';
    DiscountAccessSequence1  : String(255) @title : 'Product Discount Access Sequence (DS1)';
    DiscountPriority1        : String(255) @title : 'Priority (DS1)';
    DiscountConditionType2   : String(4)   @title : 'Discount/Surcharge Condition Type (DS2)';
    DiscountAccessSequence2  : String(255) @title : 'Product Discount Access Sequence (DS2)';
    DiscountPriority2        : String(255) @title : 'Priority (DS2)';
    DiscountConditionType3   : String(4)   @title : 'Discount/Surcharge Condition Type (DS3)';
    DiscountAccessSequence3  : String(255) @title : 'Product Discount Access Sequence (DS3)';
    DiscountPriority3        : String(255) @title : 'Priority (DS3)';
    DiscountConditionType4   : String(4)   @title : 'Discount/Surcharge Condition Type (DS4)';
    DiscountAccessSequence4  : String(255) @title : 'Product Discount Access Sequence (DS4)';
    DiscountPriority4        : String(255) @title : 'Priority (DS4)';
    DiscountConditionType5   : String(4)   @title : 'Discount/Surcharge Condition Type (DS5)';
    DiscountAccessSequence5  : String(255) @title : 'Product Discount Access Sequence (DS5)';
    DiscountPriority5        : String(255) @title : 'Priority (DS5)';
    DiscountConditionType6   : String(4)   @title : 'Discount/Surcharge Condition Type (DS6)';
    DiscountAccessSequence6  : String(255) @title : 'Product Discount Access Sequence (DS6)';
    DiscountPriority6        : String(255) @title : 'Priority (DS6)';
    DiscountConditionType7   : String(4)   @title : 'Discount/Surcharge Condition Type (DS7)';
    DiscountAccessSequence7  : String(255) @title : 'Product Discount Access Sequence (DS7)';
    DiscountPriority7        : String(255) @title : 'Priority (DS7)';
    DiscountConditionType8   : String(4)   @title : 'Discount/Surcharge Condition Type (DS8)';
    DiscountAccessSequence8  : String(255) @title : 'Product Discount Access Sequence (DS8)';
    DiscountPriority8        : String(255) @title : 'Priority (DS8)';  
    DiscountConditionType9   : String(4)   @title : 'Discount/Surcharge Condition Type (DS9)';
    DiscountAccessSequence9  : String(255) @title : 'Product Discount Access Sequence (DS9)';
    DiscountPriority9        : String(255) @title : 'Priority (DS9)';         
    DiscountConditionType10  : String(4)   @title : 'Discount/Surcharge Condition Type (DS10)';
    DiscountAccessSequence10 : String(255) @title : 'Product Discount Access Sequence (DS10)';
    DiscountPriority10       : String(255) @title : 'Priority (DS10)';                                                          
}

/** Information Tile Content **/
entity InformationTileContent : managed, cuid {
    PricelistType      : String(255) @title: 'Pricelist Type';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    SalesOrg           : String(4)   @title: 'Sales Organization';
    DistChannel        : String(2)   @title: 'Distribution Channel';
    CustPriceList      : String(20)  @title: 'Customer Pricelist';
    CustGroup1         : String(255) @title: 'Customer Group 1';
    ErpCustomer        : String(255) @title: 'ERP Customer Code';
    DeliveringPlant    : String(255) @title: 'Plant';
    InformationHeading : String(30)  @title: 'Information Heading';
    InformationDetails : String(100) @title: 'Information Details';
    ImageLink          : String(255) @title: 'Image Link' default 'https://gallagher.com/-/media/Project/Security-Business/Security-Public-Site/Images/gallagherlogocorp.png';
}

/** Contact Information **/
entity ContactInformation : managed, cuid {
    PricelistType      : String(255) @title: 'Pricelist Type';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    InternalAccount    : Boolean     @title: 'Internal Account';
    ExternalAccount    : Boolean     @title: 'External Account';
    ContactEmail       : String(255) @title: 'Contact E-Mail';
    ContactNumber      : String(30)  @title: 'Contact Number';
}

/** Account Information **/
entity AccountAssignment : managed, cuid {
    FirstName                          : String(255) @title: 'First Name';
    LastName                           : String(255) @title: 'Last Name';
    Email                              : String(255) @title: 'E-Mail';
    AccountType                        : String(255) @title: 'Account Type';
    AccountScope                       : String(255) @title: 'Account Scope';
    CommercialScope                    : String(255) @title: 'Commercial Scope';
    CustomerNumber                     : String(255) @title: 'Customer Code';
    PricelistType                      : String(255) @title: 'Pricelist Type';
    MarketScopeRegion                  : String(255) @title: 'Region';
    MarketScopeCountry                 : String(255) @title: 'Country';
    SalesOrg                           : String(4)   @title: 'Sales Organization';
    DistChannel                        : String(2)   @title: 'Distribution Channel';
    CustPriceList                      : String(20)  @title: 'Customer Pricelist';
    CustGroup1                         : String(255) @title: 'Customer Group 1';
    DeliveringPlant                    : String(255) @title: 'Plant';
    ControlPriceListView               : Boolean     @title: 'Pricelist View';
    ControlPriceView                   : Boolean     @title: 'Price View';
    ControlDiscountIndicator           : Boolean     @title: 'Discount Indicator';
    ControlDiscountRate                : Boolean     @title: 'Discount Rate';
    ControlWorkflowTile                : Boolean     @title: 'Workflow Tile';
    ContorlPriceListReviewScheduleTile : Boolean     @title: 'Pricelist Review Schedule Tile';
    ControlPricelistMaintenance        : Boolean     @title: 'Pricelist Maintenance';
    ControlDataMaintenance             : Boolean     @title: 'Data Maintenance';
    ControlMyRequestTile               : Boolean     @title: 'My Requests Tile';
    ControlApplicationLogTile          : Boolean     @title: 'Application Log Tile';
}

/** Pricing Condition Description **/
entity PricingCondType : managed, cuid {
    ErpPricingAccessSequence : String(100) @title : 'ERP Pricing Access Sequence';
    SequenceDescription      : String(255) @tittle: 'ERP Pricing Access Description';
    TechnicalFilter          : String(255) @title : 'ERP Pricing Sequence Filter';
}

/** Pricing Condition Description **/
entity PricingParameter : managed, cuid {
    ErpPricingAccessSequence : String(100) @title: 'ERP Pricing Access Sequence';
    SequenceDescription      : String(255) @title: 'ERP Pricing Access Description';
    ConditionType            : String(255) @title: 'ERP Condition Type';
    TechnicalFilter          : String(255) @title: 'ERP Pricing Sequence Filter';
}

/** User Type **/
entity UserTypeValues {
    key Type : String(20);
}

/** Terms Data Level Value **/
entity TermsDataLevelValues {
    key Level : String(20);
}

entity StatusValues {
    key code : String(20);
        name : String;
}

/** Pricelist Table */
entity PricelistData : managed, cuid {
    PricelistTitle      : String(255)  @title: 'Pricelist Name';
    PricelistType       : String(255)  @title: 'Pricelist Type';
    MarketScopeRegion   : String(255)  @title: 'Region';
    MarketScopeCountry  : String(255)  @title: 'Country';
    SalesOrg            : String(4)    @title: 'Sales Organization';
    DistChannel         : String(2)    @title: 'Distribution Channel';
    CustPriceList       : String(255)  @title: 'Customer Pricelist';
    ErpCustomer         : String(255)  @title: 'ERP Customer Code';
    CustGroup1          : String(255)  @title: 'Customer Group 1';
    DeliveringPlant     : String(255)  @title: 'Plant';
    Status              : String(20)   @title: 'Status';
    PublishedBy         : String(255)  @title: 'Published By';
    PublishedDate       : Date         @title: 'Published Date';
    EffectiveDate       : Date         @title: 'Effectivity Date';
    ExpiryDate          : Date         @title: 'Expiry Date';
    Currency            : String(100)  @title: 'Currency';
    Version             : String(20)   @title: 'Version' default '0.1';

    MarketDisplay      : String       @title: 'Market Region'  @cds.persistence.skip; //Virtual Field

    TermsAndConditions : String(1000) @title: 'Header Terms and Conditions';
    // TACDisableExtUser   : Boolean     @title: 'Terms and Conditions Disable Flag for External User';
    // TACDisableIntUser   : Boolean     @title: 'Terms and Conditions Disable Flag for Internal User';

    Notes              : String(5000) @title: 'Notes';
    // NotesDisableExtUser : Boolean     @title: 'Notes Disable Flag for External User';
    // NotesDisableIntUser : Boolean     @title: 'Notes Disable Flag for Internal User';

    // Composition: Pricelist owns its items
    items              : Composition of many PricelistItemData
                             on items.pricelist = $self;
}

entity PricelistItemData : managed, cuid {
    pricelist                : Association to PricelistData;
    parent                   : Association to PricelistItemData;
    // children                  : Composition of many PricelistItemData
    children                 : Association to PricelistItemData
                                   on children.parent = $self;

    PricelistPartNumber      : String(30)  @title: 'Pricelist Part Number';
    PartNumberDescr          : String(100) @title: 'Material Description';
    PartNumberDescrLong      : String(255) @title: 'Description';
    MainCategory             : String(255) @title: 'Main Category';
    Subcategory1             : String(255) @title: 'Subcategory 1';
    Subcategory2             : String(255) @title: 'Subcategory 2';
    Subcategory3             : String(255) @title: 'Subcategory 3';
    Subcategory4             : String(255) @title: 'Subcategory 4';
    Subcategory5             : String(255) @title: 'Subcategory 5';

    MaterialStatus           : String(100) @title: 'Material Status';
    MaterialStatusEffecDate  : String(100) @title: 'Material Status Effectivity Date';
    Price                    : String(100) @title: 'Trade Price';
    PriceUnit                : String(100) @title: 'Currency';
    PriceValidFrom           : String(100);
    PriceValidTo             : String(100);

    DiscountRate             : String(100) @title: 'Discount Rate';
    DiscountEffectiveDate    : String(100) @title: 'Discount Effectivity Date';

    PartNumberTermsandCond   : String      @title: 'Part Number Terms and Conditions';

    MainCategoryTermsandCond : String      @title: 'Main Category Terms and Conditions';
    SubCategory1TermsandCond : String      @title: 'Sucategory 1 Terms and Conditions';
    SubCategory2TermsandCond : String      @title: 'Sucategory 2 Terms and Conditions';
    SubCategory3TermsandCond : String      @title: 'Sucategory 3 Terms and Conditions';
    SubCategory4TermsandCond : String      @title: 'Sucategory 4 Terms and Conditions';
    SubCategory5TermsandCond : String      @title: 'Sucategory 5 Terms and Conditions';
}

entity ProductPriceList : managed, cuid {

    // mapping fields
    PricelistType             : String(255) @title: 'Pricelist Type';
    MarketScopeRegion         : String(255) @title: 'Region';
    MarketScopeCountry        : String(255) @title: 'Country';
    SalesOrg                  : String(4)   @title: 'Sales Organization';
    DistChannel               : String(2)   @title: 'Distribution Channel';
    CustPriceList             : String(20)  @title: 'Customer Pricelist';
    CustGroup1                : String(255) @title: 'Customer Group 1';
    ErpCustomer               : String(255) @title: 'ERP Customer';
    DeliveringPlant           : String(255) @title: 'Plant';
    MaterialKey               : String(100) @title: 'Material Key';

    // detail
    OrderIndex                : Integer;
    Kind                      : String(50); // 'Category' | 'Product'
    CategoryLevel             : Integer;    // 0 for main category, 1-5 for subcategories, 6 for product
    Title                     : String(255);
    Description               : String(100);
    Price                     : String(100);
    PriceUnit                 : String(3);
    PriceValidFrom            : Date;
    PriceValidTo              : Date;
    DiscountRate              : String(100);
    DiscountEffectiveFromDate : Date;
    DiscountEffectiveToDate   : Date;
    PriceChangeIndicator      : Boolean;
    FuturePrice               : String(100);
    FuturePriceValidFrom      : Date;
    FuturePriceValidTo        : Date;
    Status                    : String(20);
    StatusValidFromDate       : Date;
    StatusValidToDate         : Date;
    Supplier                  : String(255);
    SupplierSKU               : String(255);

    // heirachy
    parent                    : Association to one ProductPriceList;
    children                  : Composition of many ProductPriceList
                                    on children.parent = $self;
}

entity ProductPriceListTreeLayout : managed {
    key userId  : String(255);
    key tableId : String(50);
        config  : LargeString; 
}

/* -------------------------------------- Value Help -------------------------------------- */

/* Sales Org Table */
entity ErpSalesOrg : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Distribution Channel Table */
entity ErpDistributionChannel : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Division Table */
entity ErpDivision : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Plant Table */
entity ErpPlant : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Material Group 1 Table */
entity ErpMaterialGroup1 : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Material Group 2 Table */
entity ErpMaterialGroup2 : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Material Group 5 Table */
entity ErpMaterialGroup5 : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Price list Table */
entity ErpPricelist : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Customer Group 1 Table */
entity ErpCustomerGroup1 : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

/* Price Status Table */
entity ErpPriceStatus : managed, cuid {
    Code        : String(4);
    Description : String(255);
}

entity MyRequest : managed, cuid {
    PricelistType         : String(255) @title: 'Pricelist Type';
    MarketScopeRegion     : String(255) @title: 'Region';
    MarketScopeCountry    : String(255) @title: 'Country';    
    ReqStatus             : String(20)   @title: 'Status';
    ReqSubject            : String(200)  @title: 'Subject';
    RequestDetails        : String(1000) @title: 'Request Details';
    ReqPriority           : String(20)   @title: 'Priority';
    ReqStartDate          : Date         @title: 'Start Date';
    ReqDueDate            : Date         @title: 'Due Date';
    ReqInfoProvided       : Boolean      @title: 'Requestor to Provide Information';
    ReqCatalogUpdated     : Boolean      @title: 'PPR Team Adds Part/s to Relevant Catalogs';
    ReqMasterPLUpdated    : Boolean      @title: 'PPR Team Updates Master PL';
    ReqSecCommerceChecked : Boolean      @title: 'Check or Request Tech Admin to add Sec Commerce Flag (Scale Price as Required)';
}