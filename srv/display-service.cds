using { PriceListService as base } from './service';

service PriceListDisplayService {

    @readonly
    @odata.draft.enabled: false
    @Capabilities.InsertRestrictions.Insertable: false
    @Capabilities.UpdateRestrictions.Updatable: false
    @Capabilities.DeleteRestrictions.Deletable: false
    entity PricelistData as projection on base.PricelistData;
    
    @readonly
    @Capabilities.InsertRestrictions.Insertable: false
    @Capabilities.UpdateRestrictions.Updatable: false
    @Capabilities.DeleteRestrictions.Deletable: false
    entity PricelistItemData as projection on base.PricelistItemData;
    
    @readonly
    @Capabilities.InsertRestrictions.Insertable: false
    @Capabilities.UpdateRestrictions.Updatable: false
    @Capabilities.DeleteRestrictions.Deletable: false
    entity PricelistItemTree as projection on base.PricelistItemTree;

    @readonly
    @Capabilities.InsertRestrictions.Insertable: false
    @Capabilities.UpdateRestrictions.Updatable: false
    @Capabilities.DeleteRestrictions.Deletable: false
    entity ProductPriceList as projection on base.ProductPriceList;

    @readonly
    entity PricelistChangeLog as projection on base.PricelistChangeLog;

    type VersionComparisonSummary {
        totalChanges          : Integer;
        currentPricelistCount : Integer;
        updatesCount          : Integer;
        upcomingPriceCount    : Integer;
        addedRemovedCount     : Integer;
        termsNotesCount       : Integer;
    }

    type VersionComparisonRow {
        rowKey                       : String(1000);
        parentKey                    : String(1000);

        kind                         : String(50);
        categoryLevel                : Integer;
        title                        : String(255);
        description                  : String(255);
        previousDescription          : String(255);
        updatedDescription           : String(255);
        materialKey                  : String(100);
        orderIndex                   : Integer;

        previousPrice                : String(100);
        updatedPrice                 : String(100);
        priceUnit                    : String(10);

        previousPriceValidFrom       : Date;
        updatedPriceValidFrom        : Date;
        previousPriceValidTo         : Date;
        updatedPriceValidTo          : Date;

        percentageChange             : String(30);
        priceDirection               : String(30);

        previousDiscountRate         : String(100);
        updatedDiscountRate          : String(100);
        previousDiscountValidFrom    : Date;
        updatedDiscountValidFrom     : Date;
        previousDiscountValidTo      : Date;
        updatedDiscountValidTo       : Date;

        previousFuturePrice          : String(100);
        updatedFuturePrice           : String(100);
        previousFuturePriceValidFrom : Date;
        updatedFuturePriceValidFrom  : Date;
        previousFuturePriceValidTo   : Date;
        updatedFuturePriceValidTo    : Date;

        previousTermsAndConditions   : LargeString;
        updatedTermsAndConditions    : LargeString;
        previousNotes                : LargeString;
        updatedNotes                 : LargeString;

        changeType                   : String(30);
        isChanged                    : Boolean;
        isAdded                      : Boolean;
        isRemoved                    : Boolean;
        isStructuralOnly             : Boolean;

        hasPriceChange               : Boolean;
        hasDiscountChange            : Boolean;
        hasFuturePriceChange         : Boolean;
        hasTermsChange               : Boolean;
        hasNotesChange               : Boolean;
        hasDescriptionChange         : Boolean;
    }

    type PricelistVersionComparisonResult {
        currentVersion       : String(20);
        previousVersion      : String(20);
        hasPreviousVersion   : Boolean;

        summary              : VersionComparisonSummary;

        currentPricelist     : array of VersionComparisonRow;
        pricelistUpdates     : array of VersionComparisonRow;
        upcomingPrices       : array of VersionComparisonRow;
        addedRemovedProducts : array of VersionComparisonRow;
        termsNotesUpdates    : array of VersionComparisonRow;
    }
    type DiscountResult {
        Material              : String;
        DiscountRate          : String;
        DiscountValidFrom     : Date;
        DiscountValidTo       : Date;
        DiscountConditionType : String;
        DiscountAccessSequence: String;
    }

    type DiscountUserContext {
        IsInternalUser : Boolean;
        IsExternalUser : Boolean;
        CustomerNumber : String;
    }

    type PricelistDisplayColumnConfiguration {
        id             : String(100);
        label          : String(255);
        mandatory      : Boolean;
        defaultVisible : Boolean;
        order          : Integer;
    }

    action getPricelistDisplayColumnConfiguration()
        returns array of PricelistDisplayColumnConfiguration;
        
    type PricelistDisplayLayoutResult {
        config             : LargeString;
        hasSavedLayout     : Boolean;
        canManageLayout    : Boolean;
        maintainedBy       : String(255);
        maintainedAt       : DateTime;
    }

    action getPricelistDisplayLayout(
        pricelistId : UUID
    ) returns PricelistDisplayLayoutResult;

    action getDiscountUserContext()
        returns DiscountUserContext;
    
    action getAuthorizedProductTree(
        pricelistId    : UUID,
        customerNumber : String
    ) returns array of ProductPriceList;

    action resolveDiscounts(
        pricelistId     : UUID,
        customerNumber  : String
    ) returns array of DiscountResult;

    action getPricelistUpdates(
        pricelistId : UUID
    ) returns PricelistVersionComparisonResult;

    action logUserEngagement(
        eventType         : String(30),
        accessedTile      : String(255),
        accessedPricelist : String(255)
    ) returns Boolean;

    entity StatusVH as projection on base.StatusVH;
    entity PricelistTypeVH as projection on base.PricelistTypeVH;
    entity MarketRegionVH as projection on base.MarketRegionVH;
    entity MarketCountryVH as projection on base.MarketCountryVH;
    entity CustomerVH as projection on base.CustomerVH;
    entity SalesOrgVH as projection on base.SalesOrgVH;
    entity DistributionChannelVH as projection on base.DistributionChannelVH;
    entity PlantVH as projection on base.PlantVH;
    entity PricelistVH as projection on base.PricelistVH;
    entity CustomerGroup1VH as projection on base.CustomerGroup1VH;
}