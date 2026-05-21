sap.ui.define(
    [
        'sap/fe/core/PageController',
        'sap/m/MessageBox',
        'sap/m/library'
    ],
    function (Controller, MessageBox, mobileLibrary) {
        'use strict';
        var URLHelper = mobileLibrary.URLHelper;

        return Controller.extend('pricelistapp.datamaintain.ext.controller.Main', {
            onRowPress: function (oEvent) {
                // Get the context from the macro event parameters
                const oBindingContext = oEvent.getParameter("bindingContext");
                if (!oBindingContext) { return; }

                // // Access the data using getObject()
                const oContextData = oBindingContext.getObject();
                const sTableName = oContextData.tableName;
                // const sID = oContextData.ID;

                // Exact match for your HANA DB strings
                // let sRouteName = "";

                // switch (sTableName) {
                //     case "Trade and Market Scenarios":
                //         sRouteName = "AppURL_DMTradeScenario";
                //         break;
                //     case "Item Structure":
                //         sRouteName = "AppURL_DMItemStructure";
                //         break;
                //     case "Part Numbers":
                //         sRouteName = "AppURL_DMPartNumbers";
                //         break;
                //     case "Terms and Conditions":
                //         sRouteName = "AppURL_DMTermsandCond";
                //         break;
                //     case "Pricing Parameters":
                //         sRouteName = "AppURL_DMPricingParam";
                //         break;
                //     case "Tile Content":
                //         sRouteName = "AppURL_DMTileContent";
                //         break;
                //     case "Contact Information":
                //         sRouteName = "AppURL_DMContactInfo";
                //         break;
                //     case "Account Assignment":
                //         sRouteName = "AppURL_DMAcctAssign";
                //         break;
                // }

                // //Navigate to Link
                // debugger;
                // let oModel = this.getView().getModel();
                // let sUrl = oModel.sServiceUrl;
                // sUrl = sUrl + "User";

                // $.ajax({
                //     url: sUrl,
                //     type: 'GET',
                //     contentType: 'application/json',
                //     success: function (data) {
                //         let response1 = data.value;
                //         let targetUrl = response1[0][sRouteName];

                //         if (targetUrl) {
                //             URLHelper.redirect(targetUrl, true);
                //         } else {
                //             MessageBox.error('No redirect URL found. Please contact technical support.');
                //         }

                //     }.bind(this),
                //     error: function (dataError) {
                //         this.getView().setBusy(false);
                //         MessageBox.error('No redirect URL found. Please contact technical support.');
                //     }.bind(this)
                // });

                let sSemanticObject = "";
                let sAction = "";

                switch (sTableName) {
                    case "Trade and Market Scenarios":
                        sSemanticObject = "DataMaintainTS";
                        sAction = "maintain";
                        break;
                    case "Item Structure":
                        sSemanticObject = "DataMaintainIS";
                        sAction = "maintain";
                        break;
                    case "Part Numbers":
                        sSemanticObject = "DataMaintainPN";
                        sAction = "maintain";                        
                        break;
                    case "Terms and Conditions":
                        sSemanticObject = "DataMaintainTC";
                        sAction = "maintain";                          
                        break;
                    case "Pricing Parameters":
                        sSemanticObject = "DataMaintainPP";
                        sAction = "maintain";                            
                        break;
                    case "Tile Content":
                        sSemanticObject = "DataMaintainTile";
                        sAction = "maintain";                            
                        break;
                    case "Contact Information":
                        sSemanticObject = "DataMaintainCI";
                        sAction = "maintain";                             
                        break;
                    case "Account Assignment":
                        sSemanticObject = "DataMaintainAS";
                        sAction = "maintain";                         
                        break;
                }      

                if (!sSemanticObject || !sAction) { return; }

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
                });

            }
        });
    }
);
