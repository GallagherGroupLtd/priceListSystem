sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintaintermsandcond/test/integration/pages/TermsAndConditionsList",
	"pricelistapp/datamaintaintermsandcond/test/integration/pages/TermsAndConditionsObjectPage"
], function (JourneyRunner, TermsAndConditionsList, TermsAndConditionsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintaintermsandcond') + '/test/flp.html#app-preview',
        pages: {
			onTheTermsAndConditionsList: TermsAndConditionsList,
			onTheTermsAndConditionsObjectPage: TermsAndConditionsObjectPage
        },
        async: true
    });

    return runner;
});

