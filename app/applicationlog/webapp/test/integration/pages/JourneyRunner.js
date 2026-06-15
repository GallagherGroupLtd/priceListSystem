sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/applicationlog/test/integration/pages/ApplicationLogList",
	"pricelistapp/applicationlog/test/integration/pages/ApplicationLogObjectPage"
], function (JourneyRunner, ApplicationLogList, ApplicationLogObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/applicationlog') + '/test/flp.html#app-preview',
        pages: {
			onTheApplicationLogList: ApplicationLogList,
			onTheApplicationLogObjectPage: ApplicationLogObjectPage
        },
        async: true
    });

    return runner;
});

