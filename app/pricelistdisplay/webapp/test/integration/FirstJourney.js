sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onThePricelistDataList.iSeeThisPage();
            Then.onThePricelistDataList.onFilterBar().iCheckFilterField("Customer Pricelist");
            Then.onThePricelistDataList.onFilterBar().iCheckFilterField("Status");
            Then.onThePricelistDataList.onFilterBar().iCheckFilterField("Published Date");
            Then.onThePricelistDataList.onTable().iCheckColumns(5, {"CustPriceList":{"header":"Customer Pricelist"},"Status":{"header":"Status"},"MarketDisplay":{"header":"Market Region"},"PublishedDate":{"header":"Published Date"},"Version":{"header":"Version"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onThePricelistDataList.onFilterBar().iExecuteSearch();
            
            Then.onThePricelistDataList.onTable().iCheckRows();

            When.onThePricelistDataList.onTable().iPressRow(0);
            Then.onThePricelistDataObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});