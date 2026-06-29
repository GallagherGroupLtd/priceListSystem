sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    const ExtController = pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt.prototype;

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: function(oEvent) {
            MessageToast.show("Custom handler invoked.");
        },
        onToggleTermsText: function(oEvent) {
            ExtController.getInstance().onToggleTermsText();
        }
    };
});
