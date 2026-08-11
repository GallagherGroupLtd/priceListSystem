sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("pricelistapp.pricelistmaintain.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);
                this._logApplicationAccess("Pricelist Maintenance");
                this.getRouter().getRoute("PricelistDataObjectPage").attachPatternMatched(this._onObjectPageMatched, this);
            },

            _logApplicationAccess: async function (sApplicationName) {
                try {
                    const oModel = this.getModel();
                    const oAction = oModel.bindContext("/logUserEngagement(...)");

                    oAction.setParameter("eventType","APPLICATION_ACCESS");
                    oAction.setParameter("accessedTile",sApplicationName);
                    oAction.setParameter("accessedPricelist","");

                    await oAction.execute();
                } catch (oError) {
                    console.warn("Application access logging failed:",oError);
                }
            },

            _onObjectPageMatched: function () {
                // Clear tree model globally whenever Object Page navigation occurs
                const oTreeModel = this.getModel("tree");
                if (oTreeModel) {
                    oTreeModel.setProperty("/nodes", []);
                    oTreeModel.setProperty("/nodesAll", []);
                }
            }
        });
    }
);