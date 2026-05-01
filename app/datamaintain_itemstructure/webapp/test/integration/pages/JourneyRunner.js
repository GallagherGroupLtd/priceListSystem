sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintainitemstructure/test/integration/pages/ItemStructureList",
	"pricelistapp/datamaintainitemstructure/test/integration/pages/ItemStructureObjectPage"
], function (JourneyRunner, ItemStructureList, ItemStructureObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintainitemstructure') + '/test/flp.html#app-preview',
        pages: {
			onTheItemStructureList: ItemStructureList,
			onTheItemStructureObjectPage: ItemStructureObjectPage
        },
        async: true
    });

    return runner;
});

