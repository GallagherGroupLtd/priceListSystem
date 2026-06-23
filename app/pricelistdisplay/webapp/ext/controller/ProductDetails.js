sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: function(oEvent) {
            MessageToast.show("Custom handler invoked.");
        },

        onExternalSwitchChange: function(oEvent) {
            var bState = oEvent.getParameter("state");
            MessageToast.show("Switch state changed: " + bState);
        },

        onInternalSwitchChange: function(oEvent) {
            var bState = oEvent.getParameter("state");
            MessageToast.show("Switch state changed: " + bState);
        },
    };
});
