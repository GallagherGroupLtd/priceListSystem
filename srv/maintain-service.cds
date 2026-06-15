using { PriceListService as base } from './service';

service PriceListMaintainService {

    entity PricelistData as projection on base.PricelistData;
    entity PricelistItemData as projection on base.PricelistItemData;
    entity PricelistItemTree as projection on base.PricelistItemTree;

}