sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintaincontactinfo/test/integration/pages/ContactInfoList",
	"pricelistapp/datamaintaincontactinfo/test/integration/pages/ContactInfoObjectPage"
], function (JourneyRunner, ContactInfoList, ContactInfoObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintaincontactinfo') + '/test/flp.html#app-preview',
        pages: {
			onTheContactInfoList: ContactInfoList,
			onTheContactInfoObjectPage: ContactInfoObjectPage
        },
        async: true
    });

    return runner;
});

