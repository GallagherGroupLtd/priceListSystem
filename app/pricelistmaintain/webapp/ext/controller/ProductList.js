sap.ui.define([
    "sap/m/MessageToast"
], function(MessageToast) {
    'use strict';

    const ExtController = pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt.prototype;
    const idPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: function(oEvent) {
            MessageToast.show("Custom handler invoked.");
        },

        onExpand: function(oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            oTreeTable.expandToLevel(5);
            oButton.setVisible(false);
            sap.ui.getCore().byId(idPrefix + "ProductListECollapseBtn").setVisible(true);
        },
        
        onCollapse: function(oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            oTreeTable.collapseAll();
            oButton.setVisible(false);
            sap.ui.getCore().byId(idPrefix + "ProductListExpandBtn").setVisible(true);
        },

        onRefresh: function(oEvent) {
            MessageToast.show("Refresh triggered.");
            // ExtController._getProductPriceList.apply(this);
        },

    };
});