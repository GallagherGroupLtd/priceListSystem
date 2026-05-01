sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onThePartNumbersList.iSeeThisPage();
            Then.onThePartNumbersList.onTable().iCheckColumns(10, {"MainCategory":{"header":"Main Category"},"Subcategory1":{"header":"Subcategory 1"},"Subcategory2":{"header":"Subcategory 2"},"Subcategory3":{"header":"Subcategory 3"},"Subcategory4":{"header":"Subcategory 4"},"Subcategory5":{"header":"Subcategory 5"},"PricelistPartNumber":{"header":"Pricelist Part Number"},"ProductHierarchy1":{"header":"Product Hierarchy 1"},"ProductHierarchy2":{"header":"Product Hierarchy 2"},"ProductHierarchy3":{"header":"Product Hierarchy 3"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onThePartNumbersList.onFilterBar().iExecuteSearch();
            
            Then.onThePartNumbersList.onTable().iCheckRows();

            When.onThePartNumbersList.onTable().iPressRow(0);
            Then.onThePartNumbersObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});