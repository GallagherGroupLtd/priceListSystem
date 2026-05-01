sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onThePricingParametersList.iSeeThisPage();
            Then.onThePricingParametersList.onTable().iCheckColumns(11, {"TradeScenario":{"header":"Trade Scenario"},"MarketScopeRegion":{"header":"Region"},"MarketScopeCountry":{"header":"Country"},"SalesOrg":{"header":"Sales Organization"},"DistChannel":{"header":"Distribution Channel"},"CustPriceList":{"header":"Customer Pricelist"},"CustGroup1":{"header":"Customer Group 1"},"ErpCustomer":{"header":"ERP Customer"},"DeliveringPlant":{"header":"Plant"},"ErpPriceCondition":{"header":"ERP Price Condition"},"ErpPricingAccessSequence":{"header":"ERP Pricing Access Sequence"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onThePricingParametersList.onFilterBar().iExecuteSearch();
            
            Then.onThePricingParametersList.onTable().iCheckRows();

            When.onThePricingParametersList.onTable().iPressRow(0);
            Then.onThePricingParametersObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});