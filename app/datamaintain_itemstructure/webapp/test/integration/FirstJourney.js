sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheItemStructureList.iSeeThisPage();
            Then.onTheItemStructureList.onTable().iCheckColumns(15, {"TradeScenario":{"header":"Trade Scenario"},"MarketScopeRegion":{"header":"Region"},"MarketScopeCountry":{"header":"Country"},"SalesOrg":{"header":"Sales Organization"},"DistChannel":{"header":"Distribution Channel"},"CustPriceList":{"header":"Customer Pricelist"},"CustGroup1":{"header":"Customer Group 1"},"ErpCustomer":{"header":"ERP Customer"},"DeliveringPlant":{"header":"Plant"},"MainCategory":{"header":"Main Category"},"Subcategory1":{"header":"Subcategory 1"},"Subcategory2":{"header":"Subcategory 2"},"Subcategory3":{"header":"Subcategory 3"},"Subcategory4":{"header":"Subcategory 4"},"Subcategory5":{"header":"Subcategory 5"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheItemStructureList.onFilterBar().iExecuteSearch();
            
            Then.onTheItemStructureList.onTable().iCheckRows();

            When.onTheItemStructureList.onTable().iPressRow(0);
            Then.onTheItemStructureObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});