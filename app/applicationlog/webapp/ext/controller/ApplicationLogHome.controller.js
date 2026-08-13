sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function (Controller) {
        "use strict";

        return Controller.extend("pricelistapp.applicationlog.ext.controller.ApplicationLogHome",
            {
                onUserEngagementPress: function () {
                    this.getOwnerComponent().getRouter().navTo("ApplicationLogList");
                },

                onApplicationChangesPress: function () {
                    this.getOwnerComponent().getRouter().navTo("ApplicationChangeLogList");
                },

                onPricelistChangesPress: function () {
                    this.getOwnerComponent().getRouter().navTo("PricelistNotificationEventList");
                }
            }
        );
    }
);