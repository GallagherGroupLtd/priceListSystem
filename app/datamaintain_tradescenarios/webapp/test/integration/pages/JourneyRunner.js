sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"pricelistapp/datamaintaintradescenarios/test/integration/pages/TradeScenariosList",
	"pricelistapp/datamaintaintradescenarios/test/integration/pages/TradeScenariosObjectPage"
], function (JourneyRunner, TradeScenariosList, TradeScenariosObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('pricelistapp/datamaintaintradescenarios') + '/test/flp.html#app-preview',
        pages: {
			onTheTradeScenariosList: TradeScenariosList,
			onTheTradeScenariosObjectPage: TradeScenariosObjectPage
        },
        async: true
    });

    return runner;
});

