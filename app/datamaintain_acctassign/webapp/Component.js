sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("pricelistapp.datamaintainacctassign.Component",{
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this,arguments);
                this._logApplicationAccess("Account Assignment");
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