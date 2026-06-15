// using PriceListService as service from '../../srv/service';
// using PriceListDisplayService as display from '../../srv/display-service';
// using PriceListMaintainService as maintain from '../../srv/maintain-service';

// // ====================================================================
// // 1. PROPERTY LEVEL ANNOTATIONS (Labels, Mandatory, Value Helps)
// // ====================================================================
// annotate service.PricelistData with {
    
//     // Labels & Mandatory
//     PricelistTitle      @Common.Label   : 'Pricelist'       @mandatory;    
//     Status              @Common.Label   : 'Status';
//     EffectiveDate       @Common.Label   : 'Valid From';
//     ExpiryDate          @Common.Label   : 'Valid To';
//     PricelistType       @Common.Label   : 'Pricelist Type'  @mandatory;
//     MarketScopeRegion   @Common.Label   : 'Region'          @mandatory;
//     MarketScopeCountry  @Common.Label   : 'Country'         @mandatory;
//     Currency            @Common.Label   : 'Currency';
//     SalesOrg            @Common.Label   : 'Sales Organization';
//     DistChannel         @Common.Label   : 'Distribution Channel';
//     CustGroup1          @Common.Label   : 'Customer Group 1';
//     CustPriceList       @Common.Label   : 'Customer Pricelist';
//     ErpCustomer         @Common.Label   : 'Customer Account';
//     DeliveringPlant     @Common.Label   : 'Delivering Plant';
//     createdBy           @Common.Label   : 'Created By';
//     createdAt           @Common.Label   : 'Created On';
//     PublishedDate       @Common.Label   : 'Published On';
//     PublishedBy         @Common.Label   : 'Published By';
//     Version             @Common.Label   : 'Version';
//     MarketDisplay       @Common.Label   : 'Market Display';
//     TermsAndConditions  @Common.Label   : 'Terms and Conditions';

//     // Value Help: Pricelist    
//     // PricelistTitle @(
//     //     Common.ValueList : {
//     //         $Type          : 'Common.ValueListType',
//     //         CollectionPath : 'PricelistData',
//     //         Parameters     : [
//     //             { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : PricelistTitle, ValueListProperty : 'PricelistTitle' }
//     //         ]
//     //     }
//     // );

//     // Value Help: Status
//     Status              @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'StatusVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterOut',
//                 LocalDataProperty: Status,
//                 ValueListProperty: 'code'
//             }]
//         }
//     );

//     // Value Help: PricelistType
//     PricelistType       @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'PricelistTypeVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: PricelistType,
//                 ValueListProperty: 'PricelistType'
//             }]
//         }
//     );

//     // Value Help: MarketScopeRegion
//     MarketScopeRegion   @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'MarketRegionVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: MarketScopeRegion,
//                 ValueListProperty: 'MarketScopeRegion'
//             }]
//         }
//     );

//     // Value Help: MarketScopeCountry
//     MarketScopeCountry  @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'MarketCountryVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: MarketScopeCountry,
//                 ValueListProperty: 'MarketScopeCountry'
//             }]
//         }
//     );

//     // Value Help: Others
//     // Value Help: Customer
//     ErpCustomer         @(
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'CustomerVH',
//             Parameters    : [
//                 {
//                     $Type            : 'Common.ValueListParameterInOut',
//                     LocalDataProperty: ErpCustomer,
//                     ValueListProperty: 'CUSTOMER'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'SALES_ORGANIZATION'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'DISTRIBUTION_CHANNEL'
//                 }
//             ],
//         },
//         Common.ValueListWithFixedValues: false,
//     );

//     // Value Help: Sales Org.
//     SalesOrg            @(
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'SalesOrgVH',
//             Parameters    : [
//                 {
//                     $Type            : 'Common.ValueListParameterInOut',
//                     LocalDataProperty: 'SalesOrg',
//                     ValueListProperty: 'Code'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'Description'
//                 }
//             ]
//         },
//         Common.ValueListWithFixedValues: false,
//     );

//     DistChannel         @Common.ValueList: {
//         CollectionPath: 'DistributionChannelVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'DistChannel',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };

//     DeliveringPlant     @Common.ValueList: {
//         CollectionPath: 'PlantVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'DeliveringPlant',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };

//     CustPriceList       @Common.ValueList: {
//         CollectionPath: 'PricelistVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'CustPriceList',
//                 ValueListProperty: 'Code'
//             }
//         ]
//     };

//     CustGroup1          @Common.ValueList: {
//         CollectionPath: 'CustomerGroup1VH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'CustGroup1',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };
// };

// annotate display.PricelistData with {
    
//     // Labels & Mandatory
//     PricelistTitle      @Common.Label   : 'Pricelist'       @mandatory;    
//     Status              @Common.Label   : 'Status';
//     EffectiveDate       @Common.Label   : 'Effective Date';
//     ExpiryDate          @Common.Label   : 'Valid To';
//     PricelistType       @Common.Label   : 'Pricelist Type'  @mandatory;
//     MarketScopeRegion   @Common.Label   : 'Region'          @mandatory;
//     MarketScopeCountry  @Common.Label   : 'Country'         @mandatory;
//     Currency            @Common.Label   : 'Currency';
//     SalesOrg            @Common.Label   : 'Sales Organization';
//     DistChannel         @Common.Label   : 'Distribution Channel';
//     CustGroup1          @Common.Label   : 'Customer Group 1';
//     CustPriceList       @Common.Label   : 'Customer Pricelist';
//     ErpCustomer         @Common.Label   : 'Customer Account';
//     DeliveringPlant     @Common.Label   : 'Delivering Plant';
//     createdBy           @Common.Label   : 'Created By';
//     createdAt           @Common.Label   : 'Created On';
//     PublishedDate       @Common.Label   : 'Issue Date';
//     PublishedBy         @Common.Label   : 'Published By';
//     Version             @Common.Label   : 'Version';
//     MarketDisplay       @Common.Label   : 'Market Display';
//     TermsAndConditions  @Common.Label   : 'Terms and Conditions';

//     // Value Help: Pricelist    
//     // PricelistTitle @(
//     //     Common.ValueList : {
//     //         $Type          : 'Common.ValueListType',
//     //         CollectionPath : 'PricelistData',
//     //         Parameters     : [
//     //             { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : PricelistTitle, ValueListProperty : 'PricelistTitle' }
//     //         ]
//     //     }
//     // );

//     // Value Help: Status
//     Status              @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'StatusVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterOut',
//                 LocalDataProperty: Status,
//                 ValueListProperty: 'code'
//             }]
//         }
//     );

//     // Value Help: PricelistType
//     PricelistType       @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'PricelistTypeVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: PricelistType,
//                 ValueListProperty: 'PricelistType'
//             }]
//         }
//     );

//     // Value Help: MarketScopeRegion
//     MarketScopeRegion   @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'MarketRegionVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: MarketScopeRegion,
//                 ValueListProperty: 'MarketScopeRegion'
//             }]
//         }
//     );

//     // Value Help: MarketScopeCountry
//     MarketScopeCountry  @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'MarketCountryVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: MarketScopeCountry,
//                 ValueListProperty: 'MarketScopeCountry'
//             }]
//         }
//     );

//     // Value Help: Others
//     // Value Help: Customer
//     ErpCustomer         @(
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'CustomerVH',
//             Parameters    : [
//                 {
//                     $Type            : 'Common.ValueListParameterInOut',
//                     LocalDataProperty: ErpCustomer,
//                     ValueListProperty: 'CUSTOMER'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'SALES_ORGANIZATION'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'DISTRIBUTION_CHANNEL'
//                 }
//             ],
//         },
//         Common.ValueListWithFixedValues: false,
//     );

//     // Value Help: Sales Org.
//     SalesOrg            @(
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'SalesOrgVH',
//             Parameters    : [
//                 {
//                     $Type            : 'Common.ValueListParameterInOut',
//                     LocalDataProperty: 'SalesOrg',
//                     ValueListProperty: 'Code'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'Description'
//                 }
//             ]
//         },
//         Common.ValueListWithFixedValues: false,
//     );

//     DistChannel         @Common.ValueList: {
//         CollectionPath: 'DistributionChannelVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'DistChannel',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };

//     DeliveringPlant     @Common.ValueList: {
//         CollectionPath: 'PlantVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'DeliveringPlant',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };

//     CustPriceList       @Common.ValueList: {
//         CollectionPath: 'PricelistVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'CustPriceList',
//                 ValueListProperty: 'Code'
//             }
//         ]
//     };

//     CustGroup1          @Common.ValueList: {
//         CollectionPath: 'CustomerGroup1VH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'CustGroup1',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };
// };

// annotate maintain.PricelistData with {
    
//     // Labels & Mandatory
//     PricelistTitle      @Common.Label   : 'Pricelist'       @mandatory;    
//     Status              @Common.Label   : 'Status';
//     EffectiveDate       @Common.Label   : 'Valid From';
//     ExpiryDate          @Common.Label   : 'Valid To';
//     PricelistType       @Common.Label   : 'Pricelist Type'  @mandatory;
//     MarketScopeRegion   @Common.Label   : 'Region'          @mandatory;
//     MarketScopeCountry  @Common.Label   : 'Country'         @mandatory;
//     Currency            @Common.Label   : 'Currency';
//     SalesOrg            @Common.Label   : 'Sales Organization';
//     DistChannel         @Common.Label   : 'Distribution Channel';
//     CustGroup1          @Common.Label   : 'Customer Group 1';
//     CustPriceList       @Common.Label   : 'Customer Pricelist';
//     ErpCustomer         @Common.Label   : 'Customer Account';
//     DeliveringPlant     @Common.Label   : 'Delivering Plant';
//     createdBy           @Common.Label   : 'Created By';
//     createdAt           @Common.Label   : 'Created On';
//     PublishedDate       @Common.Label   : 'Published On';
//     PublishedBy         @Common.Label   : 'Published By';
//     Version             @Common.Label   : 'Version';
//     MarketDisplay       @Common.Label   : 'Market Display';
//     TermsAndConditions  @Common.Label   : 'Terms and Conditions';

//     // Value Help: Pricelist    
//     // PricelistTitle @(
//     //     Common.ValueList : {
//     //         $Type          : 'Common.ValueListType',
//     //         CollectionPath : 'PricelistData',
//     //         Parameters     : [
//     //             { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : PricelistTitle, ValueListProperty : 'PricelistTitle' }
//     //         ]
//     //     }
//     // );

//     // Value Help: Status
//     Status              @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'StatusVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterOut',
//                 LocalDataProperty: Status,
//                 ValueListProperty: 'code'
//             }]
//         }
//     );

//     // Value Help: PricelistType
//     PricelistType       @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'PricelistTypeVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: PricelistType,
//                 ValueListProperty: 'PricelistType'
//             }]
//         }
//     );

//     // Value Help: MarketScopeRegion
//     MarketScopeRegion   @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'MarketRegionVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: MarketScopeRegion,
//                 ValueListProperty: 'MarketScopeRegion'
//             }]
//         }
//     );

//     // Value Help: MarketScopeCountry
//     MarketScopeCountry  @(
//         Common.ValueListWithFixedValues: true,
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'MarketCountryVH',
//             Parameters    : [{
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: MarketScopeCountry,
//                 ValueListProperty: 'MarketScopeCountry'
//             }]
//         }
//     );

//     // Value Help: Others
//     // Value Help: Customer
//     ErpCustomer         @(
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'CustomerVH',
//             Parameters    : [
//                 {
//                     $Type            : 'Common.ValueListParameterInOut',
//                     LocalDataProperty: ErpCustomer,
//                     ValueListProperty: 'CUSTOMER'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'SALES_ORGANIZATION'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'DISTRIBUTION_CHANNEL'
//                 }
//             ],
//         },
//         Common.ValueListWithFixedValues: false,
//     );

//     // Value Help: Sales Org.
//     SalesOrg            @(
//         Common.ValueList               : {
//             $Type         : 'Common.ValueListType',
//             CollectionPath: 'SalesOrgVH',
//             Parameters    : [
//                 {
//                     $Type            : 'Common.ValueListParameterInOut',
//                     LocalDataProperty: 'SalesOrg',
//                     ValueListProperty: 'Code'
//                 },
//                 {
//                     $Type            : 'Common.ValueListParameterDisplayOnly',
//                     ValueListProperty: 'Description'
//                 }
//             ]
//         },
//         Common.ValueListWithFixedValues: false,
//     );

//     DistChannel         @Common.ValueList: {
//         CollectionPath: 'DistributionChannelVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'DistChannel',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };

//     DeliveringPlant     @Common.ValueList: {
//         CollectionPath: 'PlantVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'DeliveringPlant',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };

//     CustPriceList       @Common.ValueList: {
//         CollectionPath: 'PricelistVH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'CustPriceList',
//                 ValueListProperty: 'Code'
//             }
//         ]
//     };

//     CustGroup1          @Common.ValueList: {
//         CollectionPath: 'CustomerGroup1VH',
//         Parameters    : [
//             {
//                 $Type            : 'Common.ValueListParameterInOut',
//                 LocalDataProperty: 'CustGroup1',
//                 ValueListProperty: 'Code'
//             },
//             {
//                 $Type            : 'Common.ValueListParameterDisplayOnly',
//                 ValueListProperty: 'Description'
//             }
//         ]
//     };
// };