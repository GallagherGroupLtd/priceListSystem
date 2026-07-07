sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    "use strict";

    const ExtController = pricelistapp.pricelistdisplay.ext.controller.PricelistDisplayObjectPageExt.prototype;

    return {
        onApplyVersionFilter: function () {
            const oExt = ExtController.getInstance();

            if (!oExt) {
                MessageToast.show("Pricelist Updates controller is not ready.");
                return;
            }

            oExt._loadPricelistUpdates();
        },

        onClearVersionFilter: function () {
            const oExt = ExtController.getInstance();

            if (!oExt) {
                MessageToast.show("Pricelist Updates controller is not ready.");
                return;
            }

            const oJson = oExt.base.getView().getModel("jsonModel");
            oJson.setProperty("/pricelistUpdatesFilter/fromVersion", "");
            oJson.setProperty("/pricelistUpdatesFilter/toVersion", "");

            oExt._loadPricelistUpdates();
        }
    };
});