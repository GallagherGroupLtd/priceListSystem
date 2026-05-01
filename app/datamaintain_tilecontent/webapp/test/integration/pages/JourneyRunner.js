sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintaintilecontent/test/integration/pages/TileContentList",
	"pricelistapp/datamaintaintilecontent/test/integration/pages/TileContentObjectPage"
], function (JourneyRunner, TileContentList, TileContentObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintaintilecontent') + '/test/flp.html#app-preview',
        pages: {
			onTheTileContentList: TileContentList,
			onTheTileContentObjectPage: TileContentObjectPage
        },
        async: true
    });

    return runner;
});

