sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheTileContentList.iSeeThisPage();
            Then.onTheTileContentList.onTable().iCheckColumns(6, {"TradeScenario":{"header":"Trade Scenario"},"MarketScopeRegion":{"header":"Region"},"MarketScopeCountry":{"header":"Country"},"InformationHeading":{"header":"Heading"},"InformationDetails":{"header":"Details"},"ImageLink":{"header":"Image URL"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheTileContentList.onFilterBar().iExecuteSearch();
            
            Then.onTheTileContentList.onTable().iCheckRows();

            When.onTheTileContentList.onTable().iPressRow(0);
            Then.onTheTileContentObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});