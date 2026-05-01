sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    'sap/m/MessageBox',
    'sap/m/library'
], function (Controller, MessageToast, JSONModel, DateFormat, MessageBox, mobileLibrary) {
    "use strict";
    var URLHelper = mobileLibrary.URLHelper;
    
    return Controller.extend("pricelistapp.main.controller.landingPage", {
        onInit: function () {
            //Create a JSON Model to hold display data.
            var oViewModel = new JSONModel({
                currentDate: new Date(),
                userName: "" // Default placeholder
            });

            //Set the model to the view with the name "home".
            this.getView().setModel(oViewModel, "home");

            //Calculate the formatted date (e.g., "Wednesday, December 10, 2025").
            this._setFormattedDate(oViewModel);

            //Fetch real user name if running in Fiori Launchpad.
            this._setUserName(oViewModel);
        },

        _setFormattedDate: function (oModel) {
            var oDate = new Date();
            var oOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

            // Result: "Wednesday, December 10, 2025"
            var sFormattedDate = oDate.toLocaleDateString('en-US', oOptions);

            oModel.setProperty("/currentDate", sFormattedDate);
        },

        _setUserName: function (oModel) {
            if (sap.ushell && sap.ushell.Container) {
                var oUser = sap.ushell.Container.getUser();
                var sFullName = oUser.getFullName(); //oUser.getId()
                oModel.setProperty("/userName", sFullName);
            }
        },

        onNavigationAppPress: function (oEvent) {
            /* // Get the clicked tile and its target intent.
            const oTile = oEvent.getSource();
            const sTargetIntent = oTile.data("target") || "";

            // Split semantic object and action safely
            const [sSemanticObject, sAction] = sTargetIntent.split("-");

            if (!sSemanticObject || !sAction) { return; }

            if (!sap.ushell || !sap.ushell.Container) {
                // Base URL for local navigation
                const sBaseUrl = window.location.origin;
                switch (sTargetIntent) {
                    case "Pricelist-display":
                        window.location.href = "/pricelistapppricelistdisplay/index.html";
                        break;
                    case "PricelistMaintain-manage":
                        window.location.href = "/pricelistapppricelistmaintain/index.html";
                        break;
                    case "DataMaintain-manage":
                        window.location.href = "/pricelistappdatamaintain/index.html";
                        break;
                    case "AppLog-display":
                        window.location.href = "/pricelistappapplicationlog/index.html";
                        break;
                    default:
                        MessageToast.show("No navigation defined for: " + sTargetIntent);
                        break; 
                }
                return;
            }

            // Get the CrossApplicationNavigation service
            sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(function (oCrossAppNavigator) {
                // Define the navigation target
                var oTarget = {
                    target: {
                        semanticObject: sSemanticObject,
                        action: sAction
                    }
                };

                // Navigate to the target application
                oCrossAppNavigator.toExternal(oTarget);
            }).catch(function (oError) {
                MessageToast.show("Navigation failed: " + oError.message);
            }); */

            // Exact match for your HANA DB strings
            // Get the clicked tile and its target intent.
            const oTile = oEvent.getSource();
            const sTargetIntent = oTile.data("target") || "";

            let sRouteName = "";

            switch (sTargetIntent) {
                case "PriceMaintain-display":
                    sRouteName = "AppURL_PriceDisplay";
                    break;
                case "PriceMaintain-manage":
                    sRouteName = "AppURL_PriceMaintain";
                    break;
                case "DataMaintain-manage":
                    sRouteName = "AppURL_DataMaintain";
                    break;
                /* case "AppLog-display":
                    window.location.href = "/pricelistappapplicationlog/index.html";
                    break; */
            }

            //Navigate to Link
            debugger;
            let oModel = this.getView().getModel();
            let sUrl = oModel.sServiceUrl;
            sUrl = sUrl + "User";

            $.ajax({
                url: sUrl,
                type: 'GET',
                async: false,
                contentType: 'application/json',
                success: function (data) {
                    let response1 = data.value;
                    let targetUrl = response1[0][sRouteName];

                    if (targetUrl) {
                        URLHelper.redirect(targetUrl, false);
                    } else {
                        MessageBox.error('No redirect URL found. Please contact technical support.');
                    }

                }.bind(this),
                error: function (dataError) {
                    this.getView().setBusy(false);
                    MessageBox.error('No redirect URL found. Please contact technical support.');
                }.bind(this)
            });
        }
    });
});