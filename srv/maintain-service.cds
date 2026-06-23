using { PriceListService as base } from './service';

service PriceListMaintainService {

    entity PricelistData as projection on base.PricelistData;
    entity PricelistItemData as projection on base.PricelistItemData;
    entity PricelistItemTree as projection on base.PricelistItemTree;

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