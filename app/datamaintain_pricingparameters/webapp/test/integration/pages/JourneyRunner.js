sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintainpricingparameters/test/integration/pages/PricingParametersList",
	"pricelistapp/datamaintainpricingparameters/test/integration/pages/PricingParametersObjectPage"
], function (JourneyRunner, PricingParametersList, PricingParametersObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintainpricingparameters') + '/test/flp.html#app-preview',
        pages: {
			onThePricingParametersList: PricingParametersList,
			onThePricingParametersObjectPage: PricingParametersObjectPage
        },
        async: true
    });

    return runner;
});

