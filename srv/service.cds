using {com.sap.pricelistsystem as my} from '../db/schema';

service PriceListService {
    //For URLs
    entity User {
        key email                  : String;
            AppURL_DMPricelistType : String;
            AppURL_DMItemStructure : String;
            AppURL_DMPartNumbers   : String;
            AppURL_DMTermsandCond  : String;
            AppURL_DMPricingParam  : String;
            AppURL_DMTileContent   : String;
            AppURL_DMContactInfo   : String;
            AppURL_DMAcctAssign    : String;
            AppURL_DataMaintain    : String;
            AppURL_PriceMaintain   : String;
            AppURL_PriceDisplay    : String;
            AppURL_MyRequest       : String;
    };

    //Data Maintenance Application
    entity TableDirectory          as projection on my.MaintenanceTableDirectory;
    annotate TableDirectory with @odata.draft.enabled;

    entity TradeScenarios          as projection on my.TradeAndMarketScenarioDetermination
        actions {
            action copyRow() returns TradeScenarios;
        };

    annotate TradeScenarios with @odata.draft.enabled;

    entity ItemStructure           as projection on my.PricelistItemStructureComponents
        actions {
            action copyRow() returns ItemStructure;
        };

    annotate ItemStructure with @odata.draft.enabled;

    entity PriceProductMaintenance as projection on my.PricelistPartNumberDetermination
        actions {
            action copyRow() returns PriceProductMaintenance;
        };

    annotate PriceProductMaintenance with @odata.draft.enabled;

    entity TermsAndConditions      as projection on my.TermsAndConditionDetermination
        actions {
            action copyRow() returns TermsAndConditions;
        };

    annotate TermsAndConditions with @odata.draft.enabled;

    entity PricingParameters       as projection on my.PricingParameterDetermination
        actions {
            action copyRow() returns PricingParameters;
        };

    annotate PricingParameters with @odata.draft.enabled;

    entity TileContent             as projection on my.InformationTileContent
        actions {
            action copyRow() returns TileContent;
        };

    annotate TileContent with @odata.draft.enabled;

    entity ContactInfo             as projection on my.ContactInformation
        actions {
            action copyRow() returns ContactInfo;
        };

    annotate ContactInfo with @odata.draft.enabled;

    entity AccountAssignment       as projection on my.AccountAssignment
        actions {
            action copyRow() returns AccountAssignment;
        };

    annotate AccountAssignment with @odata.draft.enabled;

    entity ErpSalesOrg             as projection on my.ErpSalesOrg
        actions {
            action copyRow() returns ErpDistributionChannel;
        };

    annotate ErpSalesOrg with @odata.draft.enabled;

    entity ErpDistributionChannel  as projection on my.ErpDistributionChannel
        actions {
            action copyRow() returns ErpDistributionChannel;
        };

    annotate ErpDistributionChannel with @odata.draft.enabled;

    entity ErpDivision             as projection on my.ErpDivision
        actions {
            action copyRow() returns ErpDivision;
        };

    annotate ErpDivision with @odata.draft.enabled;

    entity ErpPlant                as projection on my.ErpPlant
        actions {
            action copyRow() returns ErpPlant;
        };

    annotate ErpPlant with @odata.draft.enabled;

    entity ErpMaterialGroup1       as projection on my.ErpMaterialGroup1
        actions {
            action copyRow() returns ErpMaterialGroup1;
        };

    annotate ErpMaterialGroup1 with @odata.draft.enabled;

    entity ErpMaterialGroup2       as projection on my.ErpMaterialGroup2
        actions {
            action copyRow() returns ErpMaterialGroup2;
        };

    annotate ErpMaterialGroup2 with @odata.draft.enabled;

    entity ErpMaterialGroup5       as projection on my.ErpMaterialGroup5
        actions {
            action copyRow() returns ErpMaterialGroup5;
        };

    annotate ErpMaterialGroup5 with @odata.draft.enabled;

    entity ErpPricelist            as projection on my.ErpPricelist
        actions {
            action copyRow() returns ErpPricelist;
        };

    annotate ErpPricelist with @odata.draft.enabled;

    entity ErpCustomerGroup1       as projection on my.ErpCustomerGroup1
        actions {
            action copyRow() returns ErpPricelist;
        };

    annotate ErpCustomerGroup1 with @odata.draft.enabled;

    entity ErpPriceStatus          as projection on my.ErpPriceStatus
        actions {
            action copyRow() returns ErpPricelist;
        };

    annotate ErpPriceStatus with @odata.draft.enabled;

    //File Upload Functions
    action MassUploadTradeScenarios(file: String)                    returns String;
    action MassUploadItemStructure(file: String)                     returns String;
    action MassUploadPartNumbers(file: String)                       returns String;
    action MassUploadTermsandCond(file: String)                      returns String;
    action MassUploadPricingParam(file: String)                      returns String;
    action MassUploadTileContent(file: String)                       returns String;
    action MassUploadContactInfo(file: String)                       returns String;
    action MassUploadAcctAssign(file: String)                        returns String;

    entity PricingCondType         as projection on my.PricingCondType;

    entity UserTypeValues          as projection on my.UserTypeValues;
    entity TermsDataLevelValues    as projection on my.TermsDataLevelValues;
    entity StatusValues            as projection on my.StatusValues;

    //Pricelist Maintenance Application
    @odata.draft.enabled
    entity PricelistData           as
        projection on my.PricelistData {
            *,
            MarketScopeRegion || ' (' || MarketScopeCountry || ')' as MarketDisplay : String,
            Status @(Common.FieldControl: #Mandatory),

            items                                                                   : redirected to PricelistItemData
        };

    entity PricelistItemData       as
        projection on my.PricelistItemData {
            *
        };

    type UploadValidatedItem {
        PricelistPartNumber      : String;
        PartNumberDescr          : String;
        PartNumberDescrLong      : String;
        MainCategory             : String;
        Subcategory1             : String;
        Subcategory2             : String;
        Subcategory3             : String;
        Subcategory4             : String;
        Subcategory5             : String;
        Price                    : String;
        PriceUnit                : String;
        MaterialStatus           : String;
        MaterialStatusEffecDate  : String;
        DiscountRate             : String;
        DiscountEffectiveDate    : String;
        MainCategoryTermsandCond : String;
        SubCategory1TermsandCond : String;
        SubCategory2TermsandCond : String;
        SubCategory3TermsandCond : String;
        SubCategory4TermsandCond : String;
        SubCategory5TermsandCond : String;
        PartNumberTermsandCond   : String;
    }

    action MassUploadItemTermsandConditions(file: String,
                                            PricelistType: String,
                                            MarketScopeRegion: String,
                                            MarketScopeCountry: String,
                                            SalesOrg: String,
                                            DistChannel: String,
                                            CustPriceList: String,
                                            CustGroup1: String,
                                            ErpCustomer: String,
                                            DeliveringPlant: String) returns {
        message : String;
        items   : array of UploadValidatedItem;
    };

    //Pricelist App
    @cds.redirection.target
    entity PricelistItemTree       as
        projection on my.PricelistItemData {
            ID,
            pricelist,
            parent,
            MainCategory,
            Subcategory1,
            Subcategory2,
            Subcategory3,
            Subcategory4,
            Subcategory5,
            PricelistPartNumber,
            PartNumberDescr,
            PartNumberDescrLong,
            MaterialStatus,
            MaterialStatusEffecDate,
            Price,
            PriceUnit,
            DiscountRate,
            DiscountEffectiveDate,
            PartNumberTermsandCond,
            MainCategoryTermsandCond,
            SubCategory1TermsandCond,
            SubCategory2TermsandCond,
            SubCategory3TermsandCond,
            SubCategory4TermsandCond,
            SubCategory5TermsandCond
        };

    //HANA DB Tables
    @cds.persistence.skip
    entity ExternalMaterials {
        key MATERIAL_KEY                   : String(100) @title: 'Material Key';
            CLIENT                         : String(100) @title: 'Client';
            MATERIAL                       : String(100) @title: 'Material Number';
            LANGUAGE_KEY                   : String(100) @title: 'Language';
            MATERIAL_DESCRIPTION           : String(100) @title: 'Material Description';
            PLANT                          : String(100) @title: 'Plant';
            STORAGE_LOCATION               : String(100) @title: 'Storage Location';
            SALES_ORGANIZATION             : String(100) @title: 'Sales Organization';
            DISTRIBUTION_CHANNEL           : String(100) @title: 'Distribution Channel';
            MATERIAL_PRICING_GROUP         : String(100) @title: 'Material Pricing Group';
            MATERIAL_GROUP_1               : String(100) @title: 'Material Group 1';
            MATERIAL_GROUP_2               : String(100) @title: 'Material Group 2';
            MATERIAL_GROUP_3               : String(100) @title: 'Material Group 3';
            MATERIAL_GROUP_4               : String(100) @title: 'Material Group 4';
            MATERIAL_GROUP_5               : String(100) @title: 'Material Group 5';
            ID_FOR_PRODUCT_ATTRIBUTE_2     : String(100) @title: 'Product Attribute 2';
            MAIN_CATEGORY                  : String(100) @title: 'Main Category';
            SUBCATEGORY_1                  : String(100) @title: 'Subcategory 1';
            SUBCATEGORY_2                  : String(100) @title: 'Subcategory 2';
            SUBCATEGORY_3                  : String(100) @title: 'Subcategory 3';
            SUBCATEGORY_4                  : String(100) @title: 'Subcategory 4';
            SUBCATEGORY_5                  : String(100) @title: 'Subcategory 5';
            PRODUCT_ATTRIBUTE_5            : String(100) @title: 'Product Attribute 5';
            UPDATED_AT                     : String(100) @title: 'Updated At';
            CREATED_AT                     : String(100) @title: 'Created At';
            MATERIAL_STATUS                : String(100) @title: 'Material Status';
            DATE_DIST_CHAIN_MAT_STAT_VALID : String(100) @title: 'Status Validity Date';
    };

    @cds.persistence.skip
    entity ExternalCustomers {
        key CUSTOMER_KEY              : String(100);
            SYSTEM_CLIENT_GENERAL     : String(100);
            CUSTOMER                  : String(100) @title: 'Customer';
            GENERAL_CREATED_ON        : String(100);
            CUSTOMER_NAME_1           : String(100);
            CUSTOMER_NAME_2           : String(100);
            STREET_HOUSE_NO           : String(100);
            CITY                      : String(100);
            POSTAL_CODE               : String(100);
            REGION                    : String(100);
            COUNTRY                   : String(100);
            CUSTOMER_ACCT_GROUP       : String(100);
            CENTRAL_DELETION_FLAG     : String(100);
            CENTRAL_ORDER_BLOCK       : String(100);
            CENTRAL_BILLING_BLOCK     : String(100);
            CENTRAL_DELIVERY_BLOCK    : String(100);
            CENTRAL_POSTING_BLOCK     : String(100);
            CENTRAL_SALES_BLOCK       : String(100);
            SALES_ORGANIZATION        : String(100) @title: 'Sales Organization';
            DISTRIBUTION_CHANNEL      : String(100) @title: 'Distribution Channel';
            DIVISION                  : String(100);
            CREATED_ON_DATE           : String(100);
            SALES_AREA_DELETION_FLAG  : String(100);
            SALES_AREA_ORDER_BLOCK    : String(100);
            CUSTOMER_PRIC_PROCEDURE   : String(100);
            CUSTOMER_GROUP            : String(100);
            SALES_DISTRICT            : String(100);
            PRICE_GROUP               : String(100);
            PRICE_LIST_TYPE           : String(100);
            SALES_AREA_DELIVERY_BLOCK : String(100);
            SHIPPING_CONDITION        : String(100);
            SALES_AREA_BILLING_BLOCK  : String(100);
            CURRENCY                  : String(100);
            ACCOUNT_ASSIGNMENT_GROUP  : String(100);
            TERMS_OF_PAYMENT          : String(100);
            DELIVERING_PLANT          : String(100);
            SALES_GROUP               : String(100);
            SALES_OFFICE              : String(100);
            CUSTOMER_GROUP_1          : String(100);
            CUSTOMER_CLASSIFICATION   : String(100);
            UPDATED_AT                : String(100) @title: 'Updated At';
            CREATED_AT                : String(100) @title: 'Created At';
    };

    @cds.persistence.skip
    entity ExternalPricelist {
        key CONDITION_RECORD_NUMBER_KEY  : String(100);
            CLIENT                       : String(100);
            CONDITION_RECORD_NUMBER      : String(100);
            SEQ_NUM_OF_THE_COND          : String(100);
            RATE                         : String(100);
            RATE_UNIT                    : String(100);
            APPLICATION                  : String(100);
            ITEM_CONDITION_NUMBER        : String(100);
            A032_CONDITION_RECORD_NUMBER : String(100);
            A032_MATERIAL                : String(100);
            A032_SALES_ORGANIZATION      : String(100);
            A032_DISTRIBUTION_CHANNEL    : String(100);
            A032_CONDITION_TYPE          : String(100);
            A032_VALID_TO_DATE           : String(100);
            A032_VALID_FROM_DATE         : String(100);
            A032_APPLICATION             : String(100);
            A304_CONDITION_RECORD_NUMBER : String(100);
            A304_MATERIAL                : String(100);
            A304_SALES_ORGANIZATION      : String(100);
            A304_DISTRIBUTION_CHANNEL    : String(100);
            A304_CONDITION_TYPE          : String(100);
            A304_VALID_TO_DATE           : String(100);
            A304_VALID_FROM_DATE         : String(100);
            A304_APPLICATION             : String(100);
            A304_RELEASE_STATUS          : String(100);
            A304_PROCESSING_STATUS       : String(100);
            A305_CONDITION_RECORD_NUMBER : String(100);
            A305_MATERIAL                : String(100);
            A305_SALES_ORGANIZATION      : String(100);
            A305_DISTRIBUTION_CHANNEL    : String(100);
            A305_CONDITION_TYPE          : String(100);
            A305_VALID_TO_DATE           : String(100);
            A305_VALID_FROM_DATE         : String(100);
            A305_APPLICATION             : String(100);
            A305_RELEASE_STATUS          : String(100);
            A305_PROCESSING_STATUS       : String(100);
            A305_CUSTOMER                : String(100);
            A503_CONDITION_RECORD_NUMBER : String(100);
            A503_MATERIAL                : String(100);
            A503_SALES_ORGANIZATION      : String(100);
            A503_DISTRIBUTION_CHANNEL    : String(100);
            A503_CONDITION_TYPE          : String(100);
            A503_VALID_TO_DATE           : String(100);
            A503_VALID_FROM_DATE         : String(100);
            A503_APPLICATION             : String(100);
            A503_RELEASE_STATUS          : String(100);
            A503_PROCESSING_STATUS       : String(100);
            A503_PRICELIST_TYPE          : String(100);
            A506_CONDITION_RECORD_NUMBER : String(100);
            A506_MATERIAL                : String(100);
            A506_SALES_ORGANIZATION      : String(100);
            A506_DISTRIBUTION_CHANNEL    : String(100);
            A506_CONDITION_TYPE          : String(100);
            A506_VALID_TO_DATE           : String(100);
            A506_VALID_FROM_DATE         : String(100);
            A506_APPLICATION             : String(100);
            A506_RELEASE_STATUS          : String(100);
            A506_PROCESSING_STATUS       : String(100);
            A506_SALES_DOC_TYPE          : String(100);
            A916_CONDITION_RECORD_NUMBER : String(100);
            A916_MATERIAL                : String(100);
            A916_SALES_ORGANIZATION      : String(100);
            A916_DISTRIBUTION_CHANNEL    : String(100);
            A916_CONDITION_TYPE          : String(100);
            A916_VALID_TO_DATE           : String(100);
            A916_VALID_FROM_DATE         : String(100);
            A916_APPLICATION             : String(100);
            A916_RELEASE_STATUS          : String(100);
            A916_PROCESSING_STATUS       : String(100);
            A916_PRICELIST_TYPE          : String(100);
            A917_CONDITION_RECORD_NUMBER : String(100);
            A917_MATERIAL                : String(100);
            A917_SALES_ORGANIZATION      : String(100);
            A917_DISTRIBUTION_CHANNEL    : String(100);
            A917_CUSTOMER_GROUP_1        : String(100);
            A917_CONDITION_TYPE          : String(100);
            A917_VALID_TO_DATE           : String(100);
            A917_VALID_FROM_DATE         : String(100);
            A917_APPLICATION             : String(100);
            A917_RELEASE_STATUS          : String(100);
            A917_PROCESSING_STATUS       : String(100);
            A917_PRICELIST_TYPE          : String(100);
            A918_CONDITION_RECORD_NUMBER : String(100);
            A918_MATERIAL                : String(100);
            A918_SALES_ORGANIZATION      : String(100);
            A918_DISTRIBUTION_CHANNEL    : String(100);
            A918_CUSTOMER_GROUP_1        : String(100);
            A918_CONDITION_TYPE          : String(100);
            A918_VALID_TO_DATE           : String(100);
            A918_VALID_FROM_DATE         : String(100);
            A918_APPLICATION             : String(100);
            A918_RELEASE_STATUS          : String(100);
            A918_PROCESSING_STATUS       : String(100);
            A930_CONDITION_RECORD_NUMBER : String(100);
            A930_MATERIAL                : String(100);
            A930_SALES_ORGANIZATION      : String(100);
            A930_DISTRIBUTION_CHANNEL    : String(100);
            A930_CUSTOMER                : String(100);
            A930_CONDITION_TYPE          : String(100);
            A930_VALID_TO_DATE           : String(100);
            A930_VALID_FROM_DATE         : String(100);
            A930_APPLICATION             : String(100);
            A930_RELEASE_STATUS          : String(100);
            A930_PROCESSING_STATUS       : String(100);
            A930_SALES_DOC_TYPE          : String(100);
            UPDATED_AT                   : String(100) @title: 'Updated At';
            CREATED_AT                   : String(100) @title: 'Created At';
    };

    entity ResolvedPricelistItem {
        key ID                       : UUID;
            PricelistPartNumber      : String(30);
            PartNumberDescr          : String(100);
            MainCategory             : String(255);
            Subcategory1             : String(255);
            Subcategory2             : String(255);
            Subcategory3             : String(255);
            Subcategory4             : String(255);
            Subcategory5             : String(255);
            //Plant                    : String(100);
            //MaterialPricingGroup     : String(100);
            //CustomerClassification   : String(100);

            //PriceCondition           : String(20);
            Price                    : String(100);
            PriceUnit                : String(100);
            PriceValidFrom           : String(100);
            PriceValidTo             : String(100);
            DiscountRate             : String(100);
            DiscountEffectiveDate    : String(100);
            MaterialStatus           : String(100);
            MaterialStatusEffecDate  : String(100);

            PricelistType            : String(50);
            MarketScopeRegion        : String(50);
            MarketScopeCountry       : String(50);
            SalesOrg                 : String(50);
            DistChannel              : String(50);
            CustPriceList            : String(50);
            CustGroup1               : String(50);
            ErpCustomer              : String(50);
            DeliveringPlant          : String(50);

            PartNumberTermsandCond   : String;
            MainCategoryTermsandCond : String;
            SubCategory1TermsandCond : String;
            SubCategory2TermsandCond : String;
            SubCategory3TermsandCond : String;
            SubCategory4TermsandCond : String;
            SubCategory5TermsandCond : String;
    };

    annotate ResolvedPricelistItem with @cds.persistence.skip;

    // Pricelist Maintain -- Product Pricelist Tree Table
    @readonly
    entity ProductPricelistTree {
        key PricelistType            : String(255) @title: 'Pricelist Type';
        key MarketScopeRegion        : String(255) @title: 'Region';
        key MarketScopeCountry       : String(255) @title: 'Country';
        key SalesOrg                 : String(4)   @title: 'Sales Organization';
        key DistChannel              : String(2)   @title: 'Distribution Channel';
        key CustPriceList            : String(20)  @title: 'Customer Pricelist';
        key CustGroup1               : String(255) @title: 'Customer Group 1';
        key ErpCustomer              : String(255) @title: 'ERP Customer';
        key DeliveringPlant          : String(255) @title: 'Plant';
        key MaterialKey              : String(100) @title: 'Material Key';
            MainCategory             : String(255) @title: 'Main Category';
            SubCategory1             : String(255) @title: 'Subcategory 1';
            SubCategory2             : String(255) @title: 'Subcategory 2';
            SubCategory3             : String(255) @title: 'Subcategory 3';
            SubCategory4             : String(255) @title: 'Subcategory 4';
            SubCategory5             : String(255) @title: 'Subcategory 5';
            Material                 : String(100) @title: 'Material Number';
            MaterialDescription      : String(100) @title: 'Material Description';
            Price                    : String(100);
            PriceUnit                : String(100);
            DiscountRate             : String(100);
            DiscountEffectiveDate    : String(100);
            PartNumberTermsandCond   : String;
            MainCategoryTermsandCond : String;
            SubCategory1TermsandCond : String;
            SubCategory2TermsandCond : String;
            SubCategory3TermsandCond : String;
            SubCategory4TermsandCond : String;
            SubCategory5TermsandCond : String;
    };

    entity ProductPriceList as projection on my.ProductPriceList;

    // entity ProductPricelistTree    as
    //     select from my.PricelistItemStructureComponents {
    //         key PricelistType,
    //         key MarketScopeRegion,
    //         key MarketScopeCountry,
    //         key SalesOrg,
    //         key DistChannel,
    //         key CustPriceList,
    //         key CustGroup1,
    //         key ErpCustomer,
    //         key DeliveringPlant,
    //             MainCategory,
    //             SubCategory1,
    //             SubCategory2,
    //             SubCategory3,
    //             SubCategory4,
    //             SubCategory5,
    //             _Materials : Association to many ExternalMaterials
    //                              on  _Materials.MAIN_CATEGORY = $self.MainCategory
    //                              and _Materials.SUBCATEGORY_1 = $self.SubCategory1
    //                              and _Materials.SUBCATEGORY_2 = $self.SubCategory2
    //                              and _Materials.SUBCATEGORY_3 = $self.SubCategory3
    //                              and _Materials.SUBCATEGORY_4 = $self.SubCategory4
    //                              and _Materials.SUBCATEGORY_5 = $self.SubCategory5
    //     };

    //For PDF Creation
    action exportTermsPdf(ID: UUID,
                          PricelistType: String,
                          MarketScopeRegion: String,
                          MarketScopeCountry: String,
                          SalesOrg: String,
                          DistChannel: String,
                          CustPriceList: String,
                          CustGroup1: String,
                          ErpCustomer: String,
                          DeliveringPlant: String)                   returns Binary;

    //Value Help Views
    // @cds.persistence.skip
    // entity TradeScenarioVH      as projection on my.TradeAndMarketScenarioDetermination;

    // @cds.persistence.skip
    // entity MarketRegionVH       as projection on my.TradeAndMarketScenarioDetermination;

    // @cds.persistence.skip
    // entity MarketCountryVH      as projection on my.TradeAndMarketScenarioDetermination;

    @cds.persistence.skip
    entity PricelistTypeVH {
        key PricelistType : String(255);
    }

    @cds.persistence.skip
    entity MarketRegionVH {
        key MarketScopeRegion : String(255);
    }

    @cds.persistence.skip
    entity MarketCountryVH {
        key MarketScopeCountry : String(255);
    }

    @cds.persistence.skip
    entity CustomerVH              as projection on ExternalCustomers;

    @cds.persistence.skip
    entity SalesOrgVH              as projection on my.ErpSalesOrg;

    @cds.persistence.skip
    entity DistributionChannelVH   as projection on my.ErpDistributionChannel;

    @cds.persistence.skip
    entity DivisionVH              as projection on my.ErpDivision;

    @cds.persistence.skip
    entity PlantVH                 as projection on my.ErpPlant;

    @cds.persistence.skip
    entity MaterialGroup1VH        as projection on my.ErpMaterialGroup1;

    @cds.persistence.skip
    entity MaterialGroup2VH        as projection on my.ErpMaterialGroup2;

    @cds.persistence.skip
    entity MaterialGroup5VH        as projection on my.ErpMaterialGroup5;

    @cds.persistence.skip
    entity PricelistVH             as projection on my.ErpPricelist;

    @cds.persistence.skip
    entity CustomerGroup1VH        as projection on my.ErpCustomerGroup1;

    @cds.persistence.skip
    entity CustPricelistVH         as projection on ExternalCustomers;

    @cds.persistence.skip
    entity StatusVH                as projection on StatusValues;

    entity PriceStatusVH           as projection on my.ErpPriceStatus;

    @odata.draft.enabled
    entity MyRequest               as projection on my.MyRequest
        actions {
            action SubmitRequest();
        };

    @cds.persistence.skip
    entity MainCategoryVH {
        key MainCategory : String(255);
    }

    @cds.persistence.skip
    entity SubCategory1VH {
        key SubCategory1 : String(255);
    }

    @cds.persistence.skip
    entity SubCategory2VH {
        key SubCategory2 : String(255);
    }

    @cds.persistence.skip
    entity SubCategory3VH {
        key SubCategory3 : String(255);
    }

    @cds.persistence.skip
    entity SubCategory4VH {
        key SubCategory4 : String(255);
    }

    @cds.persistence.skip
    entity SubCategory5VH {
        key SubCategory5 : String(255);
    }

    @cds.persistence.skip
    entity PriceConditionTypeVH {
        key Code : String(4);
    }

    @cds.persistence.skip
    entity PriceAccessSequenceVH {
        key Code        : String(4);
            Description : String(255);
    }

    @cds.persistence.skip
    entity DiscountConditionTypeVH {
        key Code : String(4);
    }

    @cds.persistence.skip
    entity DiscountAccessSequenceVH {
        key Code        : String(4);
            Description : String(255);
    }

    @cds.persistence.skip
    entity RequestStatusVH {
        key Code : String(4);
    }

    @cds.persistence.skip
    entity AccountTypeVH {
        key Code : String(8);
    }

    @cds.persistence.skip
    entity AccountScopeVH {
        key Code : String(8);
    }

    @cds.persistence.skip
    entity MatGruop2VH {
        key Code        : String(8);
            Description : String(255);
    }

    @cds.persistence.skip
    entity MatMasVH {
        key Code        : String(100);
            Description : String(100);
    }
}

@cds.persistence.skip
entity Subcategory1VH {
    key Subategory1 : String(255);
}
