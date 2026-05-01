sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/pricelistmaintain/test/integration/pages/PricelistDataList",
	"pricelistapp/pricelistmaintain/test/integration/pages/PricelistDataObjectPage",
	"pricelistapp/pricelistmaintain/test/integration/pages/ItemStructureObjectPage"
], function (JourneyRunner, PricelistDataList, PricelistDataObjectPage, ItemStructureObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/pricelistmaintain') + '/test/flp.html#app-preview',
        pages: {
			onThePricelistDataList: PricelistDataList,
			onThePricelistDataObjectPage: PricelistDataObjectPage,
			onTheItemStructureObjectPage: ItemStructureObjectPage
        },
        async: true
    });

    return runner;
});

