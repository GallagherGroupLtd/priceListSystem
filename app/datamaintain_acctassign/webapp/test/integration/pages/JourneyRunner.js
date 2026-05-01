sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintainacctassign/test/integration/pages/AccountAssignmentList",
	"pricelistapp/datamaintainacctassign/test/integration/pages/AccountAssignmentObjectPage"
], function (JourneyRunner, AccountAssignmentList, AccountAssignmentObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintainacctassign') + '/test/flp.html#app-preview',
        pages: {
			onTheAccountAssignmentList: AccountAssignmentList,
			onTheAccountAssignmentObjectPage: AccountAssignmentObjectPage
        },
        async: true
    });

    return runner;
});

