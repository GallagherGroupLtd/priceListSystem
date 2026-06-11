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

            const aSel = oTreeTable.getSelectedIndices && oTreeTable.getSelectedIndices() || [];
            if (!aSel.length) {
                MessageToast.show('Please select a node to expand.');
                return;
            }
            const iIndex = aSel[0];
            const oCtx = oTreeTable.getContextByIndex(iIndex);
            if (!oCtx) { MessageToast.show('Unable to determine selected row.'); return; }
            const oData = oCtx.getObject && oCtx.getObject();
            if (!oData || oData.kind !== 'Category') {
                MessageToast.show('Select a node to expand.');
                return;
            }

            // find node in model and collect all category nodes in its subtree
            const oExt = ExtController.getInstance();
            const oView = oExt.base.getView();
            const aTree = oView.getModel('jsonModel').getProperty('/productPriceList') || [];
            const rootNode = oExt._findNodeByKey(aTree, oData.key);
            if (!rootNode) return;

            const aCats = [];
            const collect = (n) => {
                if (!n) return;
                if (n.kind === 'Category') aCats.push({ key: n.key, level: n.level || 0 });
                if (n.children && n.children.length) n.children.forEach(collect);
            };
            collect(rootNode);

            // expand from top-level down (lower level first)
            aCats.sort((a, b) => a.level - b.level);
            for (const c of aCats) {
                const iRow = oExt._findRowIndexByKey(oTreeTable, c.key);
                if (iRow >= 0) {
                    try { oTreeTable.expand(iRow); } catch (e) { /* ignore */ }
                }
            }

            // oButton.setVisible(false);
            // sap.ui.getCore().byId(idPrefix + "ProductListCollapseBtn").setVisible(true);
        },

        onCollapse: function (oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");

            const aSel = oTreeTable.getSelectedIndices && oTreeTable.getSelectedIndices() || [];
            if (!aSel.length) {
                MessageToast.show('Please select a node to collapse.');
                return;
            }
            const iIndex = aSel[0];
            const oCtx = oTreeTable.getContextByIndex(iIndex);
            if (!oCtx) { MessageToast.show('Unable to determine selected row.'); return; }
            const oData = oCtx.getObject && oCtx.getObject();
            if (!oData || oData.kind !== 'Category') {
                MessageToast.show('Select a node to collapse.');
                return;
            }

            const oExt = ExtController.getInstance();
            const iRow = oExt._findRowIndexByKey(oTreeTable, oData.key);
            if (iRow >= 0) {
                try { oTreeTable.collapse(iRow); } catch (e) { /* ignore */ }
            }

            // oButton.setVisible(false);
            // sap.ui.getCore().byId(idPrefix + "ProductListExpandBtn").setVisible(true);
        },

        onSortProducts: function (oEvent) {
            const oExt = ExtController.getInstance();
            const oView = oExt.base.getView();
            const oJson = oView.getModel('jsonModel');
            const aTree = oJson.getProperty('/productPriceList') || [];

            const getProductDesc = (p) => (p && (p.MaterialDescription || p.text || '')) || '';
            const getCategoryText = (c) => (c && (c.text || '')) || '';

            const sortRec = (nodes) => {
                if (!Array.isArray(nodes) || !nodes.length) return nodes;
                // recurse first
                for (const n of nodes) {
                    if (n.children && n.children.length) n.children = sortRec(n.children);
                }
                // sort children: categories before products, categories by text, products by description
                nodes.sort((a, b) => {
                    if (a.kind === 'Category' && b.kind !== 'Category') return -1;
                    if (a.kind !== 'Category' && b.kind === 'Category') return 1;
                    if (a.kind === 'Category' && b.kind === 'Category') {
                        return getCategoryText(a).localeCompare(getCategoryText(b));
                    }
                    // both products
                    return getProductDesc(a).localeCompare(getProductDesc(b));
                });
                return nodes;
            };

            const aSorted = sortRec(JSON.parse(JSON.stringify(aTree)));
            oJson.setProperty('/productPriceList', aSorted);
            const oTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            if (oTable && typeof oTable.clearSelection === 'function') oTable.clearSelection();
            MessageToast.show('Product list sorted by description.');
        },

        onExpandAll: function (oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            oTreeTable.expandToLevel(5);
            oButton.setVisible(false);
            sap.ui.getCore().byId(idPrefix + "ProductListCollapseAllBtn").setVisible(true);
        },

        onCollapseAll: function (oEvent) {
            const oButton = oEvent.getSource();
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            oTreeTable.collapseAll();
            oButton.setVisible(false);
            sap.ui.getCore().byId(idPrefix + "ProductListExpandAllBtn").setVisible(true);
        },

        onRefresh: function (oEvent) {
            MessageToast.show("Refresh triggered.");
            ExtController._getProductPriceList.apply(this);
        },

        onRefreshPrice: function (oEvent) {
            MessageToast.show("Refresh Pricelist by appending new node from item structure table.");
            ExtController.getInstance()._getProductPriceList()
                .then((newProductList) => {
                    ExtController.getInstance()._updateModeToggleEnabled();
                    // const result = ExtController.getInstance()._addUpdateProductList(newProductList);
                    // if (result && result.hasChanges) {
                    //     debugger;
                    //     ExtController.getInstance()._setTreeTableData(result.productList);
                    //     // clear any selection after refresh
                    //     try {
                    //         const oTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
                    //         if (oTable && typeof oTable.clearSelection === 'function') oTable.clearSelection();
                    //         ExtController.getInstance()._setDeleteBtnState(false);
                    //         ExtController.getInstance()._updateModeToggleEnabled();
                    //     } catch (e) { /* ignore */ }
                    // }
                });
        },

        onResetPrice: function (oEvent) {

            MessageBox.confirm("Table will be reset to the original state (before deletes). Continue?", {
                title: "Confirm Reset Pricelist",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        // delegate reset to extension controller which restores original snapshot if available
                        ExtController.getInstance().onResetPrice();
                    }
                }.bind(this)
            });
        },

        onDelete: function (oEvent) {
            // delegate delete operation to extension controller
            ExtController.getInstance().onDelete(oEvent);
        },

        onUndoDelete: function (oEvent) {  
            // delegate undo delete operation to extension controller
            ExtController.getInstance().onUndoDelete(oEvent);
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

        onToggleDeleteMode: function (oEvent) {
            const oToggleButton = oEvent.getSource();
            const bDeleteMode = oToggleButton.getPressed();
            const oTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");
            const oDeleteButton = sap.ui.getCore().byId(idPrefix + "ProductListDeleteBtn");

            if (bDeleteMode) {
                this.bDeleteMode = true;
                oTable.setSelectionMode('Multi');
                ExtController.getInstance()._setDeleteBtnState(undefined, true);
                // change toggle appearance to 'Finish'
                try {
                    oToggleButton.setIcon('sap-icon://complete');
                    oToggleButton.setText('Finish');
                    oToggleButton.setTooltip('Finish delete mode');
                } catch (e) { /* ignore if control API differs */ }
                // reflect mode in jsonModel so UI updates and clear reorder mode
                try {
                    const oExt = ExtController.getInstance();
                    if (oExt && oExt.base && oExt.base.getView) {
                        const oJson = oExt.base.getView().getModel('jsonModel');
                        if (oJson) {
                            oJson.setProperty('/isDeleteMode', true);
                            oJson.setProperty('/isReorderMode', false);
                            oJson.setProperty('/showReset', false);
                        }
                    }
                } catch (e) { /* ignore */ }
            } else {
                this.bDeleteMode = false;
                oTable.setSelectionMode('Single');
                ExtController.getInstance()._setDeleteBtnState(undefined, false);
                oTable.clearSelection();
                // revert toggle appearance to default
                try {
                    oToggleButton.setIcon('sap-icon://delete');
                    oToggleButton.setText('Delete');
                    oToggleButton.setTooltip('Toggle delete mode');
                } catch (e) { /* ignore */ }
                // clear delete mode flag in model and update Reset visibility
                try {
                    const oExt = ExtController.getInstance();
                    if (oExt && oExt.base && oExt.base.getView) {
                        const oView = oExt.base.getView();
                        const oJson = oView.getModel('jsonModel');
                        if (oJson) {
                            oJson.setProperty('/isDeleteMode', false);
                            const isReorder = !!oJson.getProperty('/isReorderMode');
                            oJson.setProperty('/showReset', !isReorder);
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
        },

        onToggleReorderMode: function (oEvent) {
            const oToggleButton = oEvent.getSource();
            const bReorderMode = oToggleButton.getPressed();
            const oTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");

            if (bReorderMode) {
                this.bReorderMode = true;
                // oTable.setDragDropConfig(new sap.ui.table.TreeTableDragDropConfig({
                //     dragStart: this.onDragStart.bind(this),
                //     drop: this.onDrop.bind(this)
                // }));
                try {
                    const oExt = ExtController.getInstance();
                    if (oExt && oExt.base && oExt.base.getView) {
                        const oJson = oExt.base.getView().getModel('jsonModel');
                        if (oJson) {
                            oJson.setProperty('/isReorderMode', true);
                            oJson.setProperty('/isDeleteMode', false);
                            oJson.setProperty('/showReset', false);
                        }
                    }
                } catch (e) { /* ignore */ }
            } else {
                this.bReorderMode = false;
                // oTable.setDragDropConfig(null);
                try {
                    const oExt = ExtController.getInstance();
                    if (oExt && oExt.base && oExt.base.getView) {
                        const oJson = oExt.base.getView().getModel('jsonModel');
                        if (oJson) {
                            oJson.setProperty('/isReorderMode', false);
                            const isDelete = !!oJson.getProperty('/isDeleteMode');
                            oJson.setProperty('/showReset', !isDelete);
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        },

        onSelectionChange: function (oEvent) { 
            if (this.bDeleteMode) {
                ExtController._onSelectionChangeDeleteMode(oEvent);
            } else {
                ExtController._onSelectionChangeDisplayMode(oEvent);
            }
        },

        onSelectionChangeDisplayMode: function (oEvent) {
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
                ExtController.getInstance()._setDeleteBtnState(true);
                // oRefreshButton.setEnabled(true);
                // oResetButton.setEnabled(true);
            } else {
                ExtController.getInstance()._setDeleteBtnState(false);
                // oRefreshButton.setEnabled(false);
                // oResetButton.setEnabled(false);
            }
            // oTable.clearSelection();
        }

    }
});