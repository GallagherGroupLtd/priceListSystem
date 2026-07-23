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

    type VersionHistoryItem {
        version       : String;
        versionNumber : Decimal;
        publishedDate : Date;
        publishedBy   : String;
        status        : String;
        displayText    : String;
    }

    type PricelistUpdateItem {
        changedAt      : DateTime;
        changedBy      : String;
        source         : String;
        refId          : String;
        changeType     : String;
        field          : String;
        oldValue       : String;
        newValue       : String;
        version        : String;
        versionDisplay : String;
        item           : String;
    }

    type PricelistUpdatesSummary {
        totalChanges  : Integer;
        totalVersions : Integer;
    }

    type DiscountResult {
        Material              : String;
        DiscountRate          : String;
        DiscountValidFrom     : Date;
        DiscountValidTo       : Date;
        DiscountConditionType : String;
        DiscountAccessSequence: String;
    }

    type PricelistUpdatesResult {
        versions           : array of VersionHistoryItem;
        summary            : PricelistUpdatesSummary;
        priceUpdates       : array of PricelistUpdateItem;
        futurePriceUpdates : array of PricelistUpdateItem;
        categoryUpdates    : array of PricelistUpdateItem;
        notesUpdates       : array of PricelistUpdateItem;
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
        pricelistId : UUID,
        fromVersion : String,
        toVersion   : String
    ) returns PricelistUpdatesResult;
    
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