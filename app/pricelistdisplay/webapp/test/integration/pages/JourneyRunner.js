sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/pricelistdisplay/test/integration/pages/PricelistDataList",
	"pricelistapp/pricelistdisplay/test/integration/pages/PricelistDataObjectPage",
	"pricelistapp/pricelistdisplay/test/integration/pages/PricelistItemDataObjectPage"
], function (JourneyRunner, PricelistDataList, PricelistDataObjectPage, PricelistItemDataObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/pricelistdisplay') + '/test/flp.html#app-preview',
        pages: {
			onThePricelistDataList: PricelistDataList,
			onThePricelistDataObjectPage: PricelistDataObjectPage,
			onThePricelistItemDataObjectPage: PricelistItemDataObjectPage
        },
        async: true
    });

    return runner;
});

