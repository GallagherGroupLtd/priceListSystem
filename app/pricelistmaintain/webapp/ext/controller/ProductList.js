sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
    'use strict';

    const ExtController = pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt.prototype;
    const idPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

    function removeNodeFromTree(aNodes, sMaterialKey) {
        for (let i = 0; i < aNodes.length; i++) {
            const oNode = aNodes[i];
            if (oNode.children && oNode.children.length) {
                const idx = oNode.children.findIndex(
                    c => c.kind === "Product" && c.MaterialKey === sMaterialKey
                );
                if (idx !== -1) {
                    oNode.children.splice(idx, 1);
                    return true;
                }
                if (removeNodeFromTree(oNode.children, sMaterialKey)) {
                    return true;
                }
            }
        }
        return false;
    }

    function findParentCategory(aNodes, sMaterialKey) {
        for (const oNode of aNodes) {
            if (oNode.kind === "Category" && oNode.children) {
                const found = oNode.children.find(
                    c => c.kind === "Product" && c.MaterialKey === sMaterialKey
                );
                if (found) return oNode;

                const deeper = findParentCategory(oNode.children, sMaterialKey);
                if (deeper) return deeper;
            }
        }
        return null;
    }

    function insertNodeIntoCategory(oTargetCategory, oDragData, oDropData, sDropPosition) {
        const aChildren = oTargetCategory.children;

        if (oDropData.kind === "Category" || sDropPosition === "On") {
            aChildren.push(oDragData);
            return;
        }

        const iTargetIdx = aChildren.findIndex(
            c => c.kind === "Product" && c.MaterialKey === oDropData.MaterialKey
        );

        if (iTargetIdx === -1) {
            aChildren.push(oDragData);
            return;
        }

        const iInsertAt = sDropPosition === "Before" ? iTargetIdx : iTargetIdx + 1;
        aChildren.splice(iInsertAt, 0, oDragData);
    }

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
            const oDraggedControl = oEvent.getParameter("draggedControl");
            const oDroppedControl = oEvent.getParameter("droppedControl");
            const sDropPosition = oEvent.getParameter("dropPosition");

            const oDragCtx = oDraggedControl.getBindingContext("jsonModel");
            const oDropCtx = oDroppedControl.getBindingContext("jsonModel");

            const oDroppedData = oDropCtx.getModel().getProperty(oDropCtx.getPath());
            const oDraggedData = oDragCtx.getModel().getProperty(oDragCtx.getPath());

            if (!oDraggedData || oDraggedData.kind !== "Product" || !oDraggedData.MaterialKey) {
                // MessageBox.error("Only product rows can be moved. Category rows are not allowed.");
                return;
            }

            if (!oDroppedData) return;

            let oTargetCategory;
            if (oDroppedData.kind === "Category") {
                oTargetCategory = oDroppedData;
            } else if (oDroppedData.kind === "Product") {
                // Find the parent category of the dropped-on product
                oTargetCategory = findParentCategory(
                    ExtController.getInstance().base.getView().getModel("jsonModel").getProperty("/productPriceList"),
                    oDroppedData.MaterialKey
                );
            }

            if (!oTargetCategory) {
                sap.m.MessageToast.show("Cannot determine target category.");
                return;
            }

            const aCatParts = oTargetCategory.key.split(" / ");
            const oNewCategoryFields = {
                MainCategory: aCatParts[0] || null,
                SubCategory1: aCatParts[1] || null,
                SubCategory2: aCatParts[2] || null,
                SubCategory3: aCatParts[3] || null,
                SubCategory4: aCatParts[4] || null,
                SubCategory5: aCatParts[5] || null
            };

            const oJsonModel = ExtController.getInstance().base.getView().getModel("jsonModel");
            const aTree = oJsonModel.getProperty("/productPriceList");

            removeNodeFromTree(aTree, oDraggedData.MaterialKey);

            // Apply new category fields to the dragged node
            Object.assign(oDraggedData, oNewCategoryFields);

            // oTargetCategory.children.push(oDraggedData);
            insertNodeIntoCategory(oTargetCategory, oDraggedData, oDroppedData, sDropPosition);

            // No save. just update the model and let user decide when to save by pressing Save button. If want to save immediately, can call submitChanges here.
            // const oODataModel = ExtController.getInstance().base.getView().getModel();
            // const oContext = oODataModel.bindContext("/PricelistItemData(" + oDraggedData.ID + ")");
            // oODataModel.setProperty("MainCategory", oNewCategoryFields.MainCategory, oContext);
            // // ... repeat for SubCategory1-5
            // oODataModel.submitBatch("myGroup");

            oJsonModel.setProperty("/productPriceList", [...aTree]);
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