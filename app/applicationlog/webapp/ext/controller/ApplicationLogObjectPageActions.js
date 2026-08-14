sap.ui.define(
    [],
    function () {
        "use strict";

        return {
            onBackToUserEngagement: function () {
                return this.routing.navigateToRoute("ApplicationLogList");
            },

            onBackToApplicationChanges: function () {
                return this.routing.navigateToRoute("ApplicationChangeLogList");
            },

            onBackToPricelistChanges: function () {
                return this.routing.navigateToRoute("PricelistNotificationEventList");
            }
        };
    }
);