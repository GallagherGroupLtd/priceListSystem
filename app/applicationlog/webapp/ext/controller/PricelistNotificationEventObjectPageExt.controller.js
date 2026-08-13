sap.ui.define(
    [
        "sap/ui/core/mvc/ControllerExtension",
        "sap/ui/model/json/JSONModel"
    ],
    function (ControllerExtension,JSONModel) {
        "use strict";

        return ControllerExtension.extend("pricelistapp.applicationlog.ext.controller.PricelistNotificationEventObjectPageExt",
            {
                override: {
                    onInit: function () {
                        const comparisonModel = new JSONModel({
                            loading: false,
                            available: false,
                            notApplicable: false,
                            loadError: "",

                            currentVersion: "",
                            previousVersion: "",
                            hasPreviousVersion: false,

                            summary: {
                                totalChanges: 0,
                                currentPricelistCount: 0,
                                updatesCount: 0,
                                upcomingPriceCount: 0,
                                addedRemovedCount: 0,
                                termsNotesCount: 0
                            },
                            
                            pricelistUpdates: [],
                            upcomingPrices: [],
                            addedRemovedProducts: [],
                            termsNotesUpdates: []
                        });

                        this.base.getView().setModel(comparisonModel,"pricelistComparison");
                    },

                    routing: {
                        onAfterBinding: async function (bindingContext) {
                            if (!bindingContext) {
                                return;
                            }
                            const sPath = bindingContext.getPath ? bindingContext.getPath() : "";

                            if (!sPath.startsWith("/PricelistNotificationEvent")) {
                                return;
                            }
                            await this._loadPricelistComparison(bindingContext);
                        }
                    }
                },

                _loadPricelistComparison: async function (bindingContext) {
                    const oView = this.base.getView();
                    const oComparisonModel = oView.getModel("pricelistComparison");

                    if (!bindingContext || !oComparisonModel) {
                        return;
                    }

                    oComparisonModel.setProperty("/loading", true);
                    oComparisonModel.setProperty("/available", false);
                    oComparisonModel.setProperty("/notApplicable",false);
                    oComparisonModel.setProperty("/loadError", "");
                    oComparisonModel.setProperty("/currentVersion","");
                    oComparisonModel.setProperty("/previousVersion","");
                    oComparisonModel.setProperty("/hasPreviousVersion",false);
                    oComparisonModel.setProperty("/summary",{
                        totalChanges: 0,
                        currentPricelistCount: 0,
                        updatesCount: 0,
                        upcomingPriceCount: 0,
                        addedRemovedCount: 0,
                        termsNotesCount: 0
                    });
                    oComparisonModel.setProperty("/pricelistUpdates",[]);
                    oComparisonModel.setProperty("/upcomingPrices",[]);
                    oComparisonModel.setProperty("/addedRemovedProducts",[]);
                    oComparisonModel.setProperty("/termsNotesUpdates",[]);

                    try {
                        const oEvent = await bindingContext.requestObject();

                        if (!oEvent) {
                            oComparisonModel.setProperty("/loadError","Pricelist change event details are unavailable.");
                            return;
                        }

                        const sEventSourceValue = await bindingContext.requestProperty("EventSource");
                        const sPricelistId = await bindingContext.requestProperty("Pricelist_ID");

                        const sEventSource = String(sEventSourceValue || "");

                        const bIsPublicationEvent = sEventSource === "PUBLISH_COMPARISON" || sEventSource === "FIRST_PUBLISH";

                        if (!bIsPublicationEvent) {
                            oComparisonModel.setProperty("/available",false);
                            oComparisonModel.setProperty("/notApplicable",true);
                            return;
                        }

                        if (!sPricelistId) {
                            oComparisonModel.setProperty("/loadError","Associated pricelist ID is unavailable.");
                            return;
                        }

                        const oAction = oView.getModel().bindContext("/getPricelistChangeComparison(...)",null,{$$groupId: "$direct"});
                        oAction.setParameter("pricelistId",sPricelistId);

                        await oAction.execute();

                        const oResultContext = oAction.getBoundContext();
                        const oResult = oResultContext ? oResultContext.getObject() : null;

                        if (!oResult) {
                            oComparisonModel.setProperty("/loadError","Pricelist comparison returned no data.");
                            return;
                        }

                        oComparisonModel.setProperty("/currentVersion",oResult.currentVersion || "");
                        oComparisonModel.setProperty("/previousVersion",oResult.previousVersion || "");
                        oComparisonModel.setProperty("/hasPreviousVersion",!!oResult.hasPreviousVersion);
                        oComparisonModel.setProperty("/summary",oResult.summary || {});
                        oComparisonModel.setProperty("/pricelistUpdates",oResult.pricelistUpdates || []);
                        oComparisonModel.setProperty("/upcomingPrices",oResult.upcomingPrices || []);
                        oComparisonModel.setProperty("/addedRemovedProducts",oResult.addedRemovedProducts || []);
                        oComparisonModel.setProperty("/termsNotesUpdates",oResult.termsNotesUpdates || []);
                        oComparisonModel.setProperty("/notApplicable",false);
                        oComparisonModel.setProperty("/available",true);
                    } catch (error) {
                        console.error("[ApplicationLog] Unable to load pricelist comparison:",error);
                        oComparisonModel.setProperty("/available",false);
                        oComparisonModel.setProperty("/loadError",error?.message || "Unable to load pricelist comparison.");
                    } finally {
                        oComparisonModel.setProperty("/loading",false);
                    }
                }
            }
        );
    }
);