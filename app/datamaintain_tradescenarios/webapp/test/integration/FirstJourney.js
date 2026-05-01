sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheTradeScenariosList.iSeeThisPage();
            Then.onTheTradeScenariosList.onFilterBar().iCheckFilterField("Trade Scenario");
            Then.onTheTradeScenariosList.onFilterBar().iCheckFilterField("Market Scope Region");
            Then.onTheTradeScenariosList.onFilterBar().iCheckFilterField("Market Scope Country");
            Then.onTheTradeScenariosList.onTable().iCheckColumns(3, {"TradeScenario":{"header":"Trade Scenario"},"MarketScopeRegion":{"header":"Region"},"MarketScopeCountry":{"header":"Country"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheTradeScenariosList.onFilterBar().iExecuteSearch();
            
            Then.onTheTradeScenariosList.onTable().iCheckRows();

            When.onTheTradeScenariosList.onTable().iPressRow(0);
            Then.onTheTradeScenariosObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});