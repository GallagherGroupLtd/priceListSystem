sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("pricelistapp.datamaintaintradescenarios.Component",{
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this,arguments);
                this._logApplicationAccess("Trade and Market Scenarios");
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
            }
        });
    }
);