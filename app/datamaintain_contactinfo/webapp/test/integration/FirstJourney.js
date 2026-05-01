sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheContactInfoList.iSeeThisPage();
            Then.onTheContactInfoList.onTable().iCheckColumns(5, {"TradeScenario":{"header":"Trade Scenario"},"MarketScopeRegion":{"header":"Region"},"MarketScopeCountry":{"header":"Country"},"ContactEmail":{"header":"E-mail Address"},"ContactNumber":{"header":"Phone Number"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheContactInfoList.onFilterBar().iExecuteSearch();
            
            Then.onTheContactInfoList.onTable().iCheckRows();

            When.onTheContactInfoList.onTable().iPressRow(0);
            Then.onTheContactInfoObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});