sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    'sap/m/MessageBox',
    'sap/m/library',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/core/Icon',
    'sap/m/Link'
], function (Controller, MessageToast, JSONModel, DateFormat, MessageBox, mobileLibrary, Filter, FilterOperator, Icon, Link) {
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
        _setDataModelsForView: async function () {
            try{
                //Fetching email from json model home
                const userEmail = this.getView().getModel("home").getProperty("/userEmail");
                //Fetching the reference of the oData model defined in manifest.json file with the name mainService
                // const mainModel = this.getView().getModel();
                const oModel = this.getOwnerComponent().getModel(); //v4 model
                
                //Added select query to fetch specific details required for further use.
                // const srcPath = "/AccountAssignment?$filter=Email eq '" + userEmail + "'&$select=CustomerNumber,Email,FirstName,HasActiveEntity,HasDraftEntity,ID,IsActiveEntity,LastName,MarketScopeCountry,MarketScopeRegion,PricelistType,SalesOrg";
                const oAccountBinding = oModel.bindList("/AccountAssignment", undefined, undefined, undefined, {
                    $filter: `Email eq '${userEmail}'`,
                    $select: "CustomerNumber,Email,FirstName,HasActiveEntity,HasDraftEntity,ID,IsActiveEntity,LastName,MarketScopeCountry,MarketScopeRegion,PricelistType,SalesOrg"
                });

                //Reading data from models
                const aAccountCtx = await oAccountBinding.requestContexts();

                if (!aAccountCtx.length) {
                    MessageToast.show("No account assignment found for the user."); //Will change to console log if required after testing, to avoid showing technical messages to end users.
                    return;
                }

                //Reading the retreived record (1st record as email is unique)
                const oAccount = aAccountCtx[0].getObject();

                const {
                    ID: userGUID,
                    MarketScopeCountry,
                    MarketScopeRegion,
                    PricelistType,
                    SalesOrg
                } = oAccount;

                // storing in JSON model
                const oUserModel = new JSONModel({
                    userGUID,
                    MarketScopeCountry,
                    MarketScopeRegion,
                    PricelistType,
                    SalesOrg
                });

                this.getView().setModel(oUserModel, "userModel");

                //Fetching data from Tile Content to populate the tile on the landing page based on user's market scope and trade scenario.
                const oTileBinding = oModel.bindList("/TileContent", undefined, undefined, undefined, {
                    $filter:
                        `MarketScopeCountry eq '${MarketScopeCountry}' and ` +
                        `MarketScopeRegion eq '${MarketScopeRegion}' and ` +
                        `PricelistType eq '${PricelistType}'`,
                    $select: "HasActiveEntity,HasDraftEntity,ID,ImageLink,InformationDetails,InformationHeading,IsActiveEntity,MarketScopeCountry,MarketScopeRegion,PricelistType"
                });

                const aTileCtx = await oTileBinding.requestContexts();

                if (aTileCtx.length) {
                    const oTile = aTileCtx[0].getObject();

                    const oTileModel = new JSONModel({
                        heading: oTile.InformationHeading,
                        subHeading: oTile.InformationDetails,
                        image: oTile.ImageLink
                    });

                    this.getView().setModel(oTileModel, "tileModel");

                    this.getView().getModel("imgModel").setProperty("/banner", oTile.ImageLink);
                } else {
                    MessageToast.show("No tile content found for the user's market scope."); //Will change to console log if required after testing, to avoid showing technical messages to end users.
                }

                //Fetching data from Contact Info to populate the contact details on the landing page based on user's market scope and trade scenario.
                const oContactBinding = oModel.bindList("/ContactInfo", undefined, undefined, undefined, {
                    $filter:
                        `MarketScopeCountry eq '${MarketScopeCountry}' and ` +
                        `MarketScopeRegion eq '${MarketScopeRegion}' and ` +
                        `PricelistType eq '${PricelistType}'`,
                    $select: "ContactEmail,ContactNumber,ExternalAccount,HasActiveEntity,HasDraftEntity,ID,InternalAccount,IsActiveEntity"
                });

                const aContactCtx = await oContactBinding.requestContexts();

                if (aContactCtx.length) {
                    //If multiple contact records are found, all of them have to be displayed vertically.
                    const oVBox = this.getView().byId("contactBox");
                    for(let i=0; i<aContactCtx.length; i++){
                        const oContact = aContactCtx[i].getObject();
                        const oPhoneIcon = new Icon({src: "sap-icon://headset", size: "1rem", class: "sapUiTinyMarginEnd", color: "#333333"});
                        const oEmailIcon = new Icon({src: "sap-icon://email", size: "1rem", class: "sapUiTinyMarginEnd", color: "#333333"});
                        const oPhoneLink = new Link({text: oContact.ContactNumber, href: "tel:" + oContact.ContactNumber, width: "100%", style: "padding-right: 15rem !important; padding-left: 0.5rem !important;"});
                        const oEmailLink = new Link({text: oContact.ContactEmail, href: "mailto:" + oContact.ContactEmail, width: "100%", style: "padding-right: 15rem !important; padding-left: 0.5rem !important;"});
                        
                        const oHBox = new sap.m.HBox({
                           wrap: "Wrap",
                           width: "100%",
                           class: "sapUiSmallMarginTop sapUiSmallMarginBottom sapUiTinyMarginBeginEnd sapUiSmallPadding contactBox",
                           items: [oPhoneIcon, oPhoneLink, oEmailIcon, oEmailLink]});

                        oVBox.addItem(oHBox);
                    }
                    // const oContact = aContactCtx[0].getObject();

                    // const oContactModel = new JSONModel({
                    //     contactEmail: oContact.ContactEmail,
                    //     contactNumber: oContact.ContactNumber
                    // });

                    // this.getView().setModel(oContactModel, "contactModel");
                } else {
                    MessageToast.show("No contact information found for the user's market scope.");  //Will change to console log if required after testing, to avoid showing technical messages to end users.
                }
            }catch(ex){
                console.log("Error in _setDataModelsForView: " + ex.message);
            }
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