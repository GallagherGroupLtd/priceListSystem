sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
    'use strict';

    const ExtController = pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt.prototype;
    const idPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

    return {
        /**
         * Generated event handler.
         *
         * @param oEvent the event object provided by the event provider.
         */
        onPress: function (oEvent) {
            MessageToast.show("Custom handler invoked.");
        },

        onExpand: function (oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            oTreeTable.expandToLevel(5);
            oButton.setVisible(false);
            sap.ui.getCore().byId(idPrefix + "ProductListCollapseBtn").setVisible(true);
        },

        onCollapse: function (oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            oTreeTable.collapseAll();
            oButton.setVisible(false);
            sap.ui.getCore().byId(idPrefix + "ProductListExpandBtn").setVisible(true);
        },

        onRefresh: function (oEvent) {
            MessageToast.show("Refresh triggered.");
            // ExtController._getProductPriceList.apply(this);
        },

        onRefreshPrice: function (oEvent) {
            MessageToast.show("Refresh Pricelist by appending new node from item structure table.");
            ExtController.getInstance()._getProductPriceList()
                .then((newProductList) => {
                    const result = ExtController.getInstance()._addUpdateProductList(newProductList);
                    if (result && result.hasChanges) {
                        ExtController.getInstance()._setTreeTableData(result.productList);
                    }
                });
        },

        onResetPrice: function (oEvent) {

            MessageBox.confirm("Table will be refreshed, and any modification made previously will be overwritten, do you wish to continue?", {
                title: "Confirm Reset Pricelist",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {

                        ExtController.getInstance()._getProductPriceList()
                            .then(function (aRawData) {
                                ExtController.getInstance()._setTreeTableData(aRawData);
                                MessageToast.show("Reset the whole pricelist.");
                            });

                    }
                }.bind(this)
            });
        },

        onDrop: function (oEvent) {
            const oDraggedItem = oEvent.getParameter("draggedControl");
            const oBindingContext = oDraggedItem.getBindingContext("jsonModel");
            const oDraggedData = oBindingContext.getModel().getProperty(oBindingContext.getPath());

            if (!oDraggedData || oDraggedData.kind !== "Product" || !oDraggedData.MaterialKey) {
                // MessageBox.error("Only product rows can be moved. Category rows are not allowed.");
                return;
            }

            // Implement your logic to handle the dropped data and update the model accordingly
            MessageToast.show("Node dropped. Implement logic to update the model.");
        },

        onRowClick: function (oEvent) {
            // I want to use this but not work yet

            // const oClickedItem = oEvent.getParameter("rowContext");
            // const sPath = oClickedItem.getPath();
            // const oModel = oClickedItem.getModel();
            // const oData = oModel.getProperty(sPath);
            // MessageToast.show("Row clicked: " + JSON.stringify(oData));
        },

        onSelectionChange: function (oEvent) {
            //Demo code
            MessageToast.show("Row Selection Change:");
            const oTable = oEvent.getSource();
            const aSelectedIndices = oTable.getSelectedIndices();
            const oDeleteButton = sap.ui.getCore().byId(idPrefix + "ProductListDeleteBtn");
            const oResetButton = sap.ui.getCore().byId(idPrefix + "ProductListResetBtn");
            const oRefreshButton = sap.ui.getCore().byId(idPrefix + "ProductListRefreshBtn");

            const iSelectedIndex = aSelectedIndices[0];
            const oRowContext = oTable.getContextByIndex(iSelectedIndex);

            if (!oRowContext) {
                MessageToast.show("No row selected.");
                return;
            }

            const oSelectedData = oRowContext.getObject();

            if (oSelectedData) {

                let sSubSectionId = null;
                let oObjectPageLayout = null;
                let oControl = oTable;

                while (oControl) {
                    if (oControl.isA && oControl.isA("sap.uxap.ObjectPageLayout")) {
                        oObjectPageLayout = oControl;
                        break;
                    }
                    oControl = oControl.getParent && oControl.getParent();
                }

                switch (oSelectedData.kind) {
                    case "Product":
                        sSubSectionId = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductDetails";
                }

                if (oObjectPageLayout) {
                    oObjectPageLayout.scrollToSection(sSubSectionId);
                } else {
                    const oSubSection = sap.ui.getCore().byId(sSubSectionId);
                    if (oSubSection && oSubSection.getDomRef()) {
                        oSubSection.getDomRef().scrollIntoView({ behavior: "smooth" });
                    }
                }
            }

            if (aSelectedIndices.length > 0) {
                oDeleteButton.setEnabled(true);
                // oRefreshButton.setEnabled(true);
                // oResetButton.setEnabled(true);
            } else {
                oDeleteButton.setEnabled(false);
                // oRefreshButton.setEnabled(false);
                // oResetButton.setEnabled(false);
            }
            // oTable.clearSelection();
        }
    }
});