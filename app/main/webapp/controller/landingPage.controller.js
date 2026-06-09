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
                userName: "", // Default placeholder
                userEmail: ""   //Default placeholder for email.
            });

            //Set the model to the view with the name "home".
            this.getView().setModel(oViewModel, "home");

            //Calculate the formatted date (e.g., "Wednesday, December 10, 2025").
            this._setFormattedDate(oViewModel);

            //Fetch real user name if running in Fiori Launchpad.
            this._setUserName(oViewModel);

            //Fetch logged in user email if running in Fiori Launchpad.
            this._setUserEmail(oViewModel);

            //Set Picture using UI module path to ensure it works in both local and Fiori environments.
            this._setImagePath();

            //Function to set models for view, to allow information on the Landing page to be user-specific and dynamic.
            this._setDataModelsForView();
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

        _setImagePath: function () {
            // Use UI5 module path to ensure it works in both local and Fiori environments.
            const sRootPath = sap.ui.require.toUrl("pricelistapp/main");
            const oImageModel = new sap.ui.model.json.JSONModel({ banner: sRootPath + "/images/TrendsBanenrBG.jpg" });
            this.getView().setModel(oImageModel, "imgModel");
        },

        // New method to set user email
        _setUserEmail: function (oModel) {
            if (sap.ushell && sap.ushell.Container) {
                var oUser = sap.ushell.Container.getUser();
                var sEmail = oUser.getEmail();
                oModel.setProperty("/userEmail", sEmail);
            }
        },

        //Function to set up any additional models needed for the view, such as user-specific data or dynamic content.
        _setDataModelsForView: function () {
            //Fetching email from json model home
            const userEmail = this.getView().getModel("home").getProperty("/userEmail");
            //Fetching the reference of the oData model defined in manifest.json file with the name mainService
            const mainModel = this.getView().getModel("mainService");

            //using email as a filter, reading entity: AccountAssignment, to fetch user commercial scope
            //Added select query to fetch specific details required for further use.
            const srcPath = "/AccountAssignment?$filter=Email eq '" + userEmail + "'&$select=CustomerNumber,Email,FirstName,HasActiveEntity,HasDraftEntity,ID,IsActiveEntity,LastName,MarketScopeCountry,MarketScopeRegion,TradeScenario,SalesOrg";

            mainModel.read(srcPath, {
                success: function (oData) {
                    if (oData && oData.value && oData.value.length > 0) {
                        //GUID of the user, stored in account assignment table.
                        const userGUID = oData.value[0].ID;
                        const MarketScopeCountry = oData.value[0].MarketScopeCountry;
                        const MarketScopeRegion = oData.value[0].MarketScopeRegion;
                        const TradeScenario = oData.value[0].TradeScenario;
                        const SalesOrg = oData.value[0].SalesOrg;

                        //Storing the user GUID in a new JSON model named userModel for use across the application.
                        const oUserModel = new JSONModel({
                            userGUID: userGUID,
                            MarketScopeCountry: MarketScopeCountry,
                            MarketScopeRegion: MarketScopeRegion,
                            TradeScenario: TradeScenario,
                            SalesOrg: SalesOrg
                        });
                        this.getView().setModel(oUserModel, "userModel");

                        //Path to fetch tile Content which will be used to show image, title and sub-title on the landing page.
                        const tileContentPath = "/TileContent?$filter=MarketScopeCountry eq '" + MarketScopeCountry + "' and MarketScopeRegion eq '" + MarketScopeRegion + "' and TradeScenario eq '" + TradeScenario + "'&$select=HasActiveEntity,HasDraftEntity,ID,ImageLink,InformationDetails,InformationHeading,IsActiveEntity,MarketScopeCountry,MarketScopeRegion,TradeScenario";
                        //Read call to fetch tile content based on user's market scope and trade scenario, and set it to a model named tileModel for binding in the view.
                        mainModel.read(tileContentPath, {
                            success: function (oTileData) {
                                if (oTileData && oTileData.value && oTileData.value.length > 0) {
                                    const oTileModel = new JSONModel({
                                        heading: oTileData.value[0].InformationHeading,
                                        subHeading: oTileData.value[0].InformationDetails,
                                        image: oTileData.value[0].ImageLink
                                    });
                                    this.getView().setModel(oTileModel, "tileModel");

                                    this.getView().getModel("imgModel").setProperty("/banner", oTileData.value[0].ImageLink);
                                } else {
                                    MessageToast.show("No tile content found for the user's market scope.");
                                }
                            }.bind(this),
                            error: function (oError) {
                                MessageToast.show("Error fetching tile content: " + oError.message);
                            }
                        });

                        //Path to fetch contact information of the user based on market scope and trade scenario, which will be displayed on the landing page.
                        const contactInfoPath = "/ContactInfo?$filter=MarketScopeCountry eq '" + MarketScopeCountry + "' and MarketScopeRegion eq '" + MarketScopeRegion + "' and TradeScenario eq '" + TradeScenario + "'&$select=ContactEmail,ContactNumber,ExternalAccount,HasActiveEntity,HasDraftEntity,ID,InternalAccount,IsActiveEntity";
                        //Read call to fetch contact information and set it to a model named contactModel for binding in the view.
                        mainModel.read(contactInfoPath, {
                            success: function (oContactData) {
                                if (oContactData && oContactData.value && oContactData.value.length > 0) {
                                    const oContactModel = new JSONModel({
                                        contactEmail: oContactData.value[0].ContactEmail,
                                        contactNumber: oContactData.value[0].ContactNumber
                                    });
                                    this.getView().setModel(oContactModel, "contactModel");
                                } else {
                                    MessageToast.show("No contact information found for the user's market scope.");
                                }
                            }.bind(this),
                            error: function (oError) {
                                MessageToast.show("Error fetching contact information: " + oError.message);
                            }
                        });
                    } else {
                        MessageToast.show("No account assignment found for the user.");
                    }
                }.bind(this),
                error: function (oError) {
                    MessageToast.show("Error fetching account assignment: " + oError.message);
                }
            });
            
        },

        onNavigationAppPress: function (oEvent) {
            // Get the clicked tile and its target intent.
            const oTile = oEvent.getSource();
            const sTargetIntent = oTile.data("target") || "";

            // Split semantic object and action safely
            const [sSemanticObject, sAction] = sTargetIntent.split("-");

            if (!sSemanticObject || !sAction) { return; }

            // if (!sap.ushell || !sap.ushell.Container) {
            //     // Base URL for local navigation
            //     const sBaseUrl = window.location.origin;
            //     switch (sTargetIntent) {
            //         case "Pricelist-display":
            //             window.location.href = "/pricelistapp.pricelistdisplay/index.html";
            //             break;
            //         case "PriceMaintain-manage":
            //         case "PricelistMaintain-manage":
            //             window.location.href = "/pricelistapp.pricelistmaintain/index.html";
            //             break;
            //         case "DataMaintain-manage":
            //             window.location.href = "/pricelistapp.datamaintain/index.html";
            //             break;
            //         case "AppLog-display":
            //             window.location.href = "/pricelistapp.applicationlog/index.html";
            //             break;
            //         default:
            //             MessageToast.show("No navigation defined for: " + sTargetIntent);
            //             break;
            //     }
            //     return;
            // }

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
            });

            // // Exact match for your HANA DB strings
            // // Get the clicked tile and its target intent.
            // const oTile = oEvent.getSource();
            // const sTargetIntent = oTile.data("target") || "";

            // let sRouteName = "";

            // switch (sTargetIntent) {
            //     case "PriceMaintain-display":
            //         sRouteName = "AppURL_PriceDisplay";
            //         break;
            //     case "PriceMaintain-manage":
            //         sRouteName = "AppURL_PriceMaintain";
            //         break;
            //     case "DataMaintain-manage":
            //         sRouteName = "AppURL_DataMaintain";
            //         break;
            //     case "MyRequest-manage":
            //         sRouteName = "AppURL_MyRequest";
            //         break;                    
            //     /* case "AppLog-display":
            //         window.location.href = "/pricelistappapplicationlog/index.html";
            //         break; */
            // }

            //Navigate to Link
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
        },

        getImageSrc: function () {
            return sap.ui.require.toUrl("pricelistapp/main/images/TrendsBanenrBG.jpg");
        }
    });
});