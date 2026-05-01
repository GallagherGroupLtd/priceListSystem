sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintainpartnumbers/test/integration/pages/PartNumbersList",
	"pricelistapp/datamaintainpartnumbers/test/integration/pages/PartNumbersObjectPage"
], function (JourneyRunner, PartNumbersList, PartNumbersObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintainpartnumbers') + '/test/flp.html#app-preview',
        pages: {
			onThePartNumbersList: PartNumbersList,
			onThePartNumbersObjectPage: PartNumbersObjectPage
        },
        async: true
    });

    return runner;
});

