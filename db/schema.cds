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
    TradeScenario      : String(255) @title: 'Trade Scenario';
    MarketScopeRegion  : String(255) @title: 'Market Scope Region';
    MarketScopeCountry : String(255) @title: 'Market Scope Country';
}

/** Pricelist Item Structure Components **/
entity PricelistItemStructureComponents : managed, cuid {
    TradeScenario      : String(255) @title: 'Trade Scenario';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    SalesOrg           : String(4)   @title: 'Sales Organization';
    DistChannel        : String(2)   @title: 'Distribution Channel';
    CustPriceList      : String(20)  @title: 'Customer Pricelist';
    CustGroup1         : String(255) @title: 'Customer Group 1';
    ErpCustomer        : String(255) @title: 'ERP Customer';
    DeliveringPlant    : String(255) @title: 'Plant';    
    MainCategory       : String(255) @title: 'Main Category';
    Subcategory1       : String(255) @title: 'Subcategory 1';
    Subcategory2       : String(255) @title: 'Subcategory 2';
    Subcategory3       : String(255) @title: 'Subcategory 3';
    Subcategory4       : String(255) @title: 'Subcategory 4';
    Subcategory5       : String(255) @title: 'Subcategory 5';
    MainCategoryLocal  : String(255) @title: 'Main Category Local Description';
    Subcategory1Local  : String(255) @title: 'Subcategory 1 Local Description';
    Subcategory2Local  : String(255) @title: 'Subcategory 2 Local Description';
    Subcategory3Local  : String(255) @title: 'Subcategory 3 Local Description';
    Subcategory4Local  : String(255) @title: 'Subcategory 4 Local Description';
    Subcategory5Local  : String(255) @title: 'Subcategory 5 Local Description';
}

/** Pricelist Part Number Determination **/
entity PricelistPartNumberDetermination : managed, cuid {
    MainCategory        : String(255) @title: 'Main Category';
    Subcategory1        : String(255) @title: 'Subcategory 1';
    Subcategory2        : String(255) @title: 'Subcategory 2';
    Subcategory3        : String(255) @title: 'Subcategory 3';
    Subcategory4        : String(255) @title: 'Subcategory 4';
    Subcategory5        : String(255) @title: 'Subcategory 5';
    PricelistPartNumber : String(30)  @title: 'Part Number';
}

/** Terms and Condition Determination **/
entity TermsAndConditionDetermination : managed, cuid {
    TradeScenario             : String(255) @title: 'Trade Scenario';
    MarketScopeRegion         : String(255) @title: 'Region';
    MarketScopeCountry        : String(255) @title: 'Country';
    SalesOrg                  : String(4)   @title: 'Sales Organization';
    DistChannel               : String(2)   @title: 'Distribution Channel';
    CustPriceList             : String(20)  @title: 'Customer Pricelist';
    CustGroup1                : String(255) @title: 'Customer Group 1';
    ErpCustomer               : String(255) @title: 'ERP Customer';
    DeliveringPlant           : String(255) @title: 'Plant';
    TermsAndCondition         : String(255) @title: 'GeneralTerms and Conditions';
    MainCategory              : String(255) @title: 'Main Category';
    Subcategory1              : String(255) @title: 'Subcategory 1';
    Subcategory2              : String(255) @title: 'Subcategory 2';
    Subcategory3              : String(255) @title: 'Subcategory 3';
    Subcategory4              : String(255) @title: 'Subcategory 4';
    Subcategory5              : String(255) @title: 'Subcategory 5';
    MainCategoryLocal         : String(255) @title: 'Main Category Local Description';
    Subcategory1Local         : String(255) @title: 'Subcategory 1 Local Description';
    Subcategory2Local         : String(255) @title: 'Subcategory 2 Local Description';
    Subcategory3Local         : String(255) @title: 'Subcategory 3 Local Description';
    Subcategory4Local         : String(255) @title: 'Subcategory 4 Local Description';
    Subcategory5Local         : String(255) @title: 'Subcategory 5 Local Description';    
    TermsAndConditionCategory : String(255) @title: 'Terms and Conditions Category';
    PricelistFieldName        : String(255) @title: 'Pricelist Fieldname';
    PricelistDataLevel        : String(255) @title: 'Pricelist Data Level';
    TermsAndConditionContent  : String      @title: 'Terms and Conditions Content';
}

/** Pricing Parameter Determination **/
entity PricingParameterDetermination : managed, cuid {
    TradeScenario            : String(255) @title : 'Trade Scenario';
    MarketScopeRegion        : String(255) @title : 'Region';
    MarketScopeCountry       : String(255) @title : 'Country';
    SalesOrg                 : String(4)   @title : 'Sales Organization';
    DistChannel              : String(2)   @title : 'Distribution Channel';
    CustPriceList            : String(20)  @title : 'Customer Pricelist';
    CustGroup1               : String(255) @title : 'Customer Group 1';
    ErpCustomer              : String(255) @title : 'ERP Customer Code';
    DeliveringPlant          : String(255) @title : 'Plant';
    ConditionType            : String(4)   @title : 'Product Price Condition Type';
    AccessSequence           : String(255) @title : 'Product Pricing Access Sequence';
    DiscountConditionType    : String(4)   @title : 'Product Discount Condition Type';
    DiscountAccessSequence   : String(255) @title : 'Product Discount Access Sequence';
}

/** Information Tile Content **/
entity InformationTileContent : managed, cuid {
    TradeScenario      : String(255) @title: 'Trade Scenario';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    SalesOrg           : String(4)   @title : 'Sales Organization';
    DistChannel        : String(2)   @title : 'Distribution Channel';
    CustPriceList      : String(20)  @title : 'Customer Pricelist';
    CustGroup1         : String(255) @title : 'Customer Group 1';
    ErpCustomer        : String(255) @title : 'ERP Customer Code';   
    DeliveringPlant    : String(255) @title : 'Plant'; 
    InformationHeading : String(30)  @title : 'Information Heading';
    InformationDetails : String(100) @title : 'Information Details';
    ImageLink          : String(255) @title : 'Image Link' default 'https://gallagher.com/-/media/Project/Security-Business/Security-Public-Site/Images/gallagherlogocorp.png';
}

/** Contact Information **/
entity ContactInformation : managed, cuid {
    TradeScenario      : String(255) @title: 'Trade Scenario';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    InternalAccount    : Boolean     @title: 'Internal Account';
    ExternalAccount    : Boolean     @title: 'External Account';
    ContactEmail       : String(255) @title: 'Contact E-Mail';
    ContactNumber      : String(30)  @title: 'Contact Number';
}

/** Account Information **/
entity AccountAssignment : managed, cuid {
    FirstName            :               String(255) @title: 'First Name';
    LastName             :               String(255) @title: 'Last Name';
    Email                :               String(255) @title: 'E-Mail';
    AccountType          :               String(255) @title: 'Account Type';    
    AccountScope         :               String(255) @title: 'Account Scope';
    CommercialScope      :               String(255) @title: 'Commercial Scope';
    CustomerNumber       :               String(255) @title: 'Customer Code';
    TradeScenario        :               String(255) @title: 'Trade Scenario';
    MarketScopeRegion    :               String(255) @title: 'Region';
    MarketScopeCountry   :               String(255) @title: 'Country';    
    SalesOrg             :               String(4)   @title: 'Sales Organization';
    DistChannel          :               String(2)   @title: 'Distribution Channel';
    CustPriceList        :               String(20)  @title : 'Customer Pricelist';
    CustGroup1           :               String(255) @title : 'Customer Group 1';    
    DeliveringPlant      :               String(255) @title: 'Plant';
    ControlPriceListView :               Boolean     @title: 'Pricelist View';
    ControlPriceView     :               Boolean     @title: 'Price View';
    ControlDiscountIndicator :           Boolean     @title: 'Discount Indicator';
    ControlDiscountRate :                Boolean     @title: 'Discount Rate';
    ControlWorkflowTile       :          Boolean     @title: 'Workflow Tile';
    ContorlPriceListReviewScheduleTile : Boolean     @title: 'Pricelist Review Schedule Tile';
    ControlPricelistMaintenance :        Boolean     @title: 'Pricelist Maintenance';
    ControlDataMaintenance :             Boolean     @title: 'Data Maintenance';
    ControlMyRequestTile :               Boolean     @title: 'My Requests Tile';
    ControlApplicationLogTile :          Boolean     @title: 'Application Log Tile';
}

/** Product Maintenance **/
entity ProductMaintenance : managed, cuid {
    ProductID                       : String(30)  @title: 'Product ID';
    ProductDescription              : String(255) @title: 'Product Description';
    SalesOrg                        : String(255) @title: 'Sales Organization';
    DistChannel                     : String(2)   @title: 'Distribution Channel';
    MaterialClassification1         : String(255) @title: 'Material Classification';
    DetailsTranslation              : String(255) @title: 'Product Details Translation';
    MaterialClassification2         : String(255) @title: 'Material Classification';
    PricelistMaterialClassification : String(255) @title: 'Pricelist Material Classification';
    ProductStatus                   : String(255) @title: 'Product Status';
    StatusValidity                  : Date        @title: 'Status Validity';
}

/** Pricing Condition Description **/
entity PricingCondType : managed, cuid {
    ErpPricingAccessSequence : String(100) @title : 'ERP Pricing Access Sequence';
    SequenceDescription      : String(255) @tittle: 'ERP Pricing Access Description';
    TechnicalFilter          : String(255) @title : 'ERP Pricing Sequence Filter';
}

/** Pricing Condition Description **/
entity PricingParameter : managed, cuid {
    ErpPricingAccessSequence : String(100) @title : 'ERP Pricing Access Sequence';
    SequenceDescription      : String(255) @title : 'ERP Pricing Access Description';
    ConditionType            : String(255) @title : 'ERP Condition Type';
    TechnicalFilter          : String(255) @title : 'ERP Pricing Sequence Filter';
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
    key code : String(12);
    name : String;
}

/** Pricelist Table */
entity PricelistData : managed, cuid {
    PricelistTitle     : String(255) @title: 'Pricelist Name';
    TradeScenario      : String(255) @title: 'Trade Scenario';
    MarketScopeRegion  : String(255) @title: 'Region';
    MarketScopeCountry : String(255) @title: 'Country';
    SalesOrg           : String(4)   @title: 'Sales Organization';
    DistChannel        : String(2)   @title: 'Distribution Channel';
    CustPriceList      : String(255) @title: 'Customer Pricelist';
    ErpCustomer        : String(255) @title: 'ERP Customer Code';
    CustGroup1         : String(255) @title: 'Customer Group 1';
    DeliveringPlant    : String(255) @title: 'Plant';
    Status             : String(12)  @title: 'Status';
    PublishedBy        : String(255) @title: 'Published By';
    PublishedDate      : Date        @title: 'Published Date';
    EffectiveDate      : Date        @title: 'Effectivity Date';
    ExpiryDate         : Date        @title: 'Expiry Date';
    Currency           : String(100) @title: 'Currency';
    Version            : String(20)  @title: 'Version';

    MarketDisplay      : String      @title: 'Market Region'  @cds.persistence.skip; //Virtual Field

    TermsAndConditions : String      @title: 'Header Terms and Conditions';
    
    Notes              : String      @title: 'Notes';
    ExtUserDisable     : Boolean     @title: 'External User Disable Flag';
    IntUserDisable     : Boolean     @title: 'Internal User Disable Flag';

    // Composition: Pricelist owns its items
    items              : Composition of many PricelistItemData
                             on items.pricelist = $self;
}

entity PricelistItemData : managed, cuid {
    pricelist                 : Association to PricelistData;
    parent                    : Association to PricelistItemData;
    children                  : Composition of many PricelistItemData
                                    on children.parent = $self;

    PricelistPartNumber       : String(30)  @title: 'Pricelist Part Number';
    PartNumberDescr           : String(100) @title: 'Material Description';
    PartNumberDescrLong       : String(255) @title: 'Description';
    MainCategory              : String(255) @title: 'Main Category';
    Subcategory1              : String(255) @title: 'Subcategory 1';
    Subcategory2              : String(255) @title: 'Subcategory 2';
    Subcategory3              : String(255) @title: 'Subcategory 3';
    Subcategory4              : String(255) @title: 'Subcategory 4';
    Subcategory5              : String(255) @title: 'Subcategory 5';

    MaterialStatus            : String(100) @title: 'Material Status';
    MaterialStatusEffecDate   : String(100) @title: 'Material Status Effectivity Date';
    Price                     : String(100) @title: 'Trade Price';
    PriceUnit                 : String(100) @title: 'Currency';
    PriceValidFrom            : String(100);
    PriceValidTo              : String(100);

    DiscountRate              : String(100) @title: 'Discount Rate';
    DiscountEffectiveDate     : String(100) @title: 'Discount Effectivity Date';

    PartNumberTermsandCond    : String @title: 'Part Number Terms and Conditions';

    MainCategoryTermsandCond  : String @title : 'Main Category Terms and Conditions';
    SubCategory1TermsandCond  : String @title : 'Sucategory 1 Terms and Conditions';
    SubCategory2TermsandCond  : String @title : 'Sucategory 2 Terms and Conditions';
    SubCategory3TermsandCond  : String @title : 'Sucategory 3 Terms and Conditions';
    SubCategory4TermsandCond  : String @title : 'Sucategory 4 Terms and Conditions';
    SubCategory5TermsandCond  : String @title : 'Sucategory 5 Terms and Conditions';
}

/** Product Maintenance **/
entity PricelistProduct : managed, cuid {
    ProductID                       : String(30)  @title: 'Product ID';
    ProductDescription              : String(255) @title: 'Product Description';
    SalesOrg                        : String(255) @title: 'Sales Organization';
    DistChannel                     : String(2)   @title: 'Distribution Channel';
    MaterialClassification1         : String(255) @title: 'Material Classification';
    ProductDescription2             : String(255) @title: 'Pricelist Product Description';
    MaterialClassification2         : String(255) @title: 'Translation Material Classification';
    PricelistMaterialClassification : String(255) @title: 'Pricelist Material Classification';
    ProductStatus                   : String(255) @title: 'Product Status';
    StatusValidity                  : Date        @title: 'Status Validity';
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

entity MyRequest {
  key ID            : UUID;

  AccountName       : String(100);   // UI label = Bucket
  ReqDate           : Date;          // UI label = Start Date
  ReqTime           : Time;
  ReqStatus         : String(20);    // UI label = Progress

  ReqSubject        : String(200);
  RequestDetails    : String(1000);  // UI label = Notes / Request Details

  ReqPriority       : String(20);
  ReqDueDate        : Date;
  ReqRepeat         : String(50);

  ReqInfoProvided       : Boolean default false;
  ReqCatalogUpdated     : Boolean default false;
  ReqMasterPLUpdated    : Boolean default false;
  ReqSecCommerceChecked : Boolean default false;
}
