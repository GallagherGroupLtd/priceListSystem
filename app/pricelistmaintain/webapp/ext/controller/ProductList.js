sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
    'use strict';

    const ExtController = pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt.prototype;
    const idPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

    // Find parent node by child ID (works for both Category and Product)
    function findParentById(aNodes, sChildId, oParent) {
        for (const oNode of aNodes) {
            if (!oNode) continue;
            if (oNode.ID === sChildId) return oParent || null; // null = root level
            if (oNode.children && oNode.children.length) {
                const oFound = findParentById(oNode.children, sChildId, oNode);
                if (oFound !== undefined) return oFound;
            }
        }
        return undefined; // not found
    }

    // Single reorder function — works for both Product and Category
    function reorderInParent(aChildren, oDraggedNode, oDroppedNode, sDropPosition) {
        const iDragIdx = aChildren.findIndex(n => n === oDraggedNode);
        if (iDragIdx === -1) return;

        // Remove first
        aChildren.splice(iDragIdx, 1);

        // Find drop target AFTER removal
        const iNewDropIdx = aChildren.findIndex(n => n === oDroppedNode);
        if (iNewDropIdx === -1) {
            aChildren.splice(iDragIdx, 0, oDraggedNode); // fallback: put back
            return;
        }

        const iInsertIdx = sDropPosition === "Before" ? iNewDropIdx : iNewDropIdx + 1;
        aChildren.splice(iInsertIdx, 0, oDraggedNode);
    }

    return {

        onNavigate: function (oEvent) {
            ExtController.getInstance().onNavigate(oEvent);
        },

        onExpand: function (oEvent) {
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");

            const iSelectedIndex = oTreeTable.getSelectedIndex();

            if (iSelectedIndex < 0) {
                MessageToast.show("Please select a node to expand.");
                return;
            }

            const oSelectedContext = oTreeTable.getContextByIndex(iSelectedIndex);
            const oSelectedNode = oSelectedContext && oSelectedContext.getObject();

            if (!oSelectedNode || oSelectedNode.Kind !== "Category") {
                MessageToast.show("Please select a category node.");
                return;
            }

            const aCategoryPaths = [];

            const collectCategoryPaths = function (oNode, sPath) {
                if (!oNode || oNode.Kind !== "Category") {
                    return;
                }

                aCategoryPaths.push(sPath);

                if (Array.isArray(oNode.children)) {
                    oNode.children.forEach(function (oChild, iChildIndex) {
                        collectCategoryPaths(oChild, sPath + "/children/" + iChildIndex);
                    });
                }
            };

            const findRowIndexByPath = function (sPath) {
                const oBinding = oTreeTable.getBinding("rows");
                const iLength = oBinding ? oBinding.getLength() : 0;

                for (let i = 0; i < iLength; i++) {
                    const oCtx = oTreeTable.getContextByIndex(i);

                    if (oCtx && oCtx.getPath() === sPath) {
                        return i;
                    }
                }

                return -1;
            };

            collectCategoryPaths(oSelectedNode, oSelectedContext.getPath());

            aCategoryPaths.forEach(function (sPath) {
                const iRowIndex = findRowIndexByPath(sPath);

                if (iRowIndex >= 0) {
                    oTreeTable.expand(iRowIndex);
                }
            });
        },

        onCollapse: function (oEvent) {
            const oTreeTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");

            const iIndex = oTreeTable.getSelectedIndex();

            if (iIndex < 0) {
                MessageToast.show("Please select a node to collapse.");
                return;
            }

            const oCtx = oTreeTable.getContextByIndex(iIndex);
            const oData = oCtx && oCtx.getObject();

            if (!oData || oData.Kind !== "Category") {
                MessageToast.show("Please select a category node.");
                return;
            }

            oTreeTable.collapse(iIndex);
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

        onSortProducts: function (oEvent) {
            const oExt = ExtController.getInstance();
            const oView = oExt.base.getView();
            const oJson = oView.getModel("jsonModel");
            const aTree = oJson.getProperty("/productPriceList") || [];

            // Toggle asc / desc
            const sLastDirection = oJson.getProperty("/productSortDirection");
            const sDirection = sLastDirection === "asc" ? "desc" : "asc";
            const iDirection = sDirection === "asc" ? 1 : -1;

            const getTitle = function (oNode) {
                return String((oNode && oNode.Title) || "").trim();
            };

            const getTitleGroup = function (sTitle) {
                if (/^[0-9]/.test(sTitle)) {
                    return 0; // 0-9 first
                }

                if (/^[A-Za-z]/.test(sTitle)) {
                    return 1; // A-Z after numbers
                }

                return 2; // others last
            };

            const compareByTitle = function (a, b) {
                const sTitleA = getTitle(a);
                const sTitleB = getTitle(b);

                const iGroupA = getTitleGroup(sTitleA);
                const iGroupB = getTitleGroup(sTitleB);

                if (iGroupA !== iGroupB) {
                    return (iGroupA - iGroupB) * iDirection;
                }

                return sTitleA.localeCompare(sTitleB, undefined, {
                    numeric: true,
                    sensitivity: "base"
                }) * iDirection;
            };

            const sortRec = function (aNodes) {
                if (!Array.isArray(aNodes) || !aNodes.length) {
                    return aNodes;
                }

                aNodes.forEach(function (oNode) {
                    if (Array.isArray(oNode.children) && oNode.children.length) {
                        oNode.children = sortRec(oNode.children);
                    }
                });

                aNodes.sort(compareByTitle);

                return aNodes;
            };

            const updateOrderIndexRec = function (aNodes) {
                if (!Array.isArray(aNodes)) {
                    return;
                }

                aNodes.forEach(function (oNode, iIndex) {
                    oNode.OrderIndex = iIndex + 1;

                    if (Array.isArray(oNode.children) && oNode.children.length) {
                        updateOrderIndexRec(oNode.children);
                    }
                });
            };

            const aSorted = sortRec(JSON.parse(JSON.stringify(aTree)));

            updateOrderIndexRec(aSorted);

            oJson.setProperty("/productPriceList", aSorted);
            oJson.setProperty("/productSortDirection", sDirection);
            oJson.updateBindings(true);

            const oTable = sap.ui.getCore().byId(idPrefix + "ProductPriceListTreeTable");

            if (oTable) {
                const oBinding = oTable.getBinding("rows");

                if (oBinding && typeof oBinding.sort === "function") {
                    oBinding.sort([]);
                }

                if (oBinding && typeof oBinding.refresh === "function") {
                    oBinding.refresh(true);
                }

                if (typeof oTable.clearSelection === "function") {
                    oTable.clearSelection();
                }

                if (typeof oTable.getColumns === "function") {
                    oTable.getColumns().forEach(function (oColumn) {
                        if (typeof oColumn.setSorted === "function") {
                            oColumn.setSorted(false);
                        }
                    });
                }
            }

            MessageToast.show(
                sDirection === "asc"
                    ? "Product list sorted ascending by categories and products."
                    : "Product list sorted descending by categories and products."
            );
        },

        onOpenHierarchyFilter: function () {
            ExtController.getInstance().onOpenHierarchyFilter();
        },

        onClearHierarchyFilter: function () {
            ExtController.getInstance().onClearHierarchyFilter();
        },

        onRefreshPrice: function () {
            MessageToast.show("Refreshing Price.");
            ExtController.getInstance().onRefreshPrice();
        },

        onResetPrice: function (oEvent) {
            MessageBox.confirm("Table will be completely reset. Proceed?", {
                title: "Confirm Reset Pricelist",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        // delegate reset to extension controller which restores original snapshot if available
                        ExtController.getInstance().onResetPrice();
                    }
                }
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

        onExportExcel: function () {
            ExtController.getInstance().onExportExcel(false);
        },

        onExportExcelAs: function () {
            ExtController.getInstance().onExportExcel(true);
        },
        
        onDrop: function (oEvent) {
            const oDragCtx = oEvent.getParameter("draggedControl").getBindingContext("jsonModel");
            const oDropCtx = oEvent.getParameter("droppedControl").getBindingContext("jsonModel");
            const sDropPosition = oEvent.getParameter("dropPosition");

            if (!oDragCtx || !oDropCtx) return;

            const oDraggedData = oDragCtx.getModel().getProperty(oDragCtx.getPath());
            const oDroppedData = oDropCtx.getModel().getProperty(oDropCtx.getPath());

            if (!oDraggedData || !oDroppedData) return;
            if ((oDraggedData.ID === oDroppedData.ID) && (oDraggedData.OrderIndex === oDroppedData.OrderIndex)) return; // drop on itself

            const oJsonModel = ExtController.getInstance().base.getView().getModel("jsonModel");
            const aTree = oJsonModel.getProperty("/productPriceList");

            // ── PRODUCT ──────────────────────────────────────────────────────
            if (oDraggedData.Kind === "Product") {
                if (oDroppedData.Kind !== "Product") {
                    sap.m.MessageToast.show("Products can only be reordered within the same category.");
                    return;
                }

                const oDragParent = findParentById(aTree, oDraggedData.ID);
                const oDropParent = findParentById(aTree, oDroppedData.ID);

                // Compare parent ID (null = root level)
                const sDragParentId = oDragParent ? oDragParent.ID : null;
                const sDropParentId = oDropParent ? oDropParent.ID : null;

                if (sDragParentId !== sDropParentId) {
                    sap.m.MessageToast.show("Products can only be reordered within the same category.");
                    return;
                }

                const aChildren = oDragParent ? oDragParent.children : aTree;
                reorderInParent(aChildren, oDraggedData, oDroppedData, sDropPosition);
            }

            // ── CATEGORY ─────────────────────────────────────────────────────
            else if (oDraggedData.Kind === "Category") {
                if (oDroppedData.Kind !== "Category") {
                    sap.m.MessageToast.show("Cannot drop a category onto a product.");
                    return;
                }

                const oDragParent = findParentById(aTree, oDraggedData.ID);
                const oDropParent = findParentById(aTree, oDroppedData.ID);

                const sDragParentId = oDragParent ? oDragParent.ID : null;
                const sDropParentId = oDropParent ? oDropParent.ID : null;

                if (sDragParentId !== sDropParentId) {
                    sap.m.MessageToast.show("Categories can only be reordered within the same level.");
                    return;
                }

                const aChildren = oDragParent ? oDragParent.children : aTree;
                reorderInParent(aChildren, oDraggedData, oDroppedData, sDropPosition);
            }

            oJsonModel.setProperty("/productPriceList", [...aTree]);
        },

        onOpenColumnSettings: function (oEvent) {
            ExtController.getInstance()._onOpenColumnSettings(oEvent);
        },

        onOpenLayoutSettings: function (oEvent) {
            ExtController.getInstance().onOpenLayoutSettings(oEvent);
        },

        onRowClick: function (oEvent) {
            // Reserved for future row-click behaviour (e.g. quick preview). Not wired
            // to any control yet.
        },

        /**
         * Toggles the tree's "Delete" interaction mode.
         * All decision logic (Display-mode guard, active-filter guard, table
         * selection-mode switching, toolbar sync) lives centrally in the extension
         * controller's _handleProductTreeModeToggle — this is a thin delegate so the
         * fragment's `press` handler always reflects the single source of truth.
         */
        onToggleDeleteMode: function (oEvent) {
            ExtController.getInstance().onToggleDeleteMode(oEvent);
        },

        /**
         * Toggles the tree's "Re-order" interaction mode.
         * See onToggleDeleteMode — same centralized delegation pattern.
         */
        onToggleReorderMode: function (oEvent) {
            ExtController.getInstance().onToggleReorderMode(oEvent);
        },

        onSelectionChange: function (oEvent) {
            const oExt = ExtController.getInstance();

            oExt._handleProductTreeSelectionChange(oEvent);

            const mMode = oExt._getProductTreeModeState();

            if (mMode.deleteMode) {
                oExt._onSelectionChangeDeleteMode(oEvent);
            } else {
                oExt._onSelectionChangeDisplayMode(oEvent);
            }
        }

    }
});
