sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/myrequest/myrequest/test/integration/pages/MyRequestList",
	"pricelistapp/myrequest/myrequest/test/integration/pages/MyRequestObjectPage"
], function (JourneyRunner, MyRequestList, MyRequestObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/myrequest/myrequest') + '/test/flp.html#app-preview',
        pages: {
			onTheMyRequestList: MyRequestList,
			onTheMyRequestObjectPage: MyRequestObjectPage
        },
        async: true
    });

    return runner;
});

