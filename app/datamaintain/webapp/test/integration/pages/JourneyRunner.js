sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintain/test/integration/pages/TableDirectoryList",
	"pricelistapp/datamaintain/test/integration/pages/TableDirectoryObjectPage"
], function (JourneyRunner, TableDirectoryList, TableDirectoryObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintain') + '/test/flp.html#app-preview',
        pages: {
			onTheTableDirectoryList: TableDirectoryList,
			onTheTableDirectoryObjectPage: TableDirectoryObjectPage
        },
        async: true
    });

    return runner;
});

