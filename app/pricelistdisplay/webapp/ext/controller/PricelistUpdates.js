sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/SearchField",
    "sap/m/Button",
    "sap/m/VBox"
], function (MessageToast,Dialog,SearchField,Button,VBox) {
    "use strict";
    const TABLE_CONFIG = {
        CurrentPricelistTable: {
            visiblePath: "/pricelistUpdates/currentPricelist",
            fullPath: "/pricelistUpdates/currentPricelistFull"
        },
        PricelistUpdatesTable: {
            visiblePath: "/pricelistUpdates/pricelistUpdates",
            fullPath: "/pricelistUpdates/pricelistUpdatesFull"
        },
        UpcomingPricesTable: {
            visiblePath: "/pricelistUpdates/upcomingPrices",
            fullPath: "/pricelistUpdates/upcomingPricesFull"
        },
        AddedRemovedProductsTable: {
            visiblePath: "/pricelistUpdates/addedRemovedProducts",
            fullPath: "/pricelistUpdates/addedRemovedProductsFull"
        },
        TermsNotesUpdatesTable: {
            visiblePath: "/pricelistUpdates/termsNotesUpdates",
            fullPath: "/pricelistUpdates/termsNotesUpdatesFull"
        }
    };

    const TABLE_STATE = {};

    function clone(vValue) {
        return JSON.parse(JSON.stringify(vValue || []));
    }

    function getTableIdFromEvent(oEvent) {
        return oEvent.getSource().data("tableId");
    }

    function getTargetTable(oEvent) {
        const oSource = oEvent.getSource();
        const sTableId = getTableIdFromEvent(oEvent);

        return findTargetControl(oSource, sTableId);
    }

    function getJsonModel(oControl) {
        return oControl && oControl.getModel("jsonModel");
    }

    function getNodeTitle(oNode) {
        return String(oNode?.title || oNode?.description || oNode?.changeType || "").trim();
    }

    function compareNodes(oLeft, oRight, iDirection) {
        const sLeft = getNodeTitle(oLeft);
        const sRight = getNodeTitle(oRight);

        return sLeft.localeCompare(sRight, undefined, {
            numeric: true,
            sensitivity: "base"
        }) * iDirection;
    }

    function sortHierarchy(aNodes, iDirection) {
        const aSorted = clone(aNodes);

        const sortRecursive = function (aCurrentNodes) {
            if (!Array.isArray(aCurrentNodes)) {
                return [];
            }

            aCurrentNodes.forEach(function (oNode) {
                if (Array.isArray(oNode.children)) {
                    oNode.children = sortRecursive(oNode.children);
                }
            });

            aCurrentNodes.sort(function (oLeft, oRight) {
                return compareNodes(oLeft, oRight, iDirection);
            });

            return aCurrentNodes;
        };

        return sortRecursive(aSorted);
    }

    function nodeMatchesSearch(oNode, sSearchText) {
        const sSearch = String(sSearchText || "").trim().toLowerCase();

        if (!sSearch) {
            return true;
        }

        const aValues = [
            oNode?.title,
            oNode?.description,
            oNode?.changeType,
            oNode?.previousDescription,
            oNode?.updatedDescription,
            oNode?.previousPrice,
            oNode?.updatedPrice,
            oNode?.updatedFuturePrice,
            oNode?.previousValue,
            oNode?.updatedValue
        ];

        return aValues.some(function (vValue) {
            return String(vValue || "").toLowerCase().includes(sSearch);
        });
    }

    function filterHierarchy(aNodes, sSearchText) {
        return (aNodes || []).reduce(function (aResult, oNode) {
            const aFilteredChildren = filterHierarchy(oNode.children || [],sSearchText);
            const bNodeMatches = nodeMatchesSearch(oNode,sSearchText);

            if (bNodeMatches || aFilteredChildren.length > 0) {
                const oCopy = Object.assign({}, oNode, {children: aFilteredChildren});
                aResult.push(oCopy);
            }

            return aResult;
        }, []);
    }

    function findTargetControl(oSourceControl,sTargetId) {
        if (!oSourceControl || !sTargetId) {
            return null;
        }

        const aElements = sap.ui.core.Element.registry.all();
        const sExpectedSuffix = `--${sTargetId}`;

        const aMatchingControls = Object.keys(aElements).filter(function (sControlId) {
            return (sControlId === sTargetId || sControlId.endsWith(sExpectedSuffix));
        }).map(function (sControlId) {
            return aElements[sControlId];
        });

        if (!aMatchingControls.length) {
            return null;
        }

        const sSourceId = oSourceControl.getId();

        const oSameSectionTarget = aMatchingControls.find(function (oControl) {
            const sControlId = oControl.getId();
            const iSharedPrefixLength = getSharedPrefixLength(sSourceId,sControlId);
            return (iSharedPrefixLength > 0);
        });

        return (oSameSectionTarget || aMatchingControls[0]);
    }

    function getSharedPrefixLength(sLeft,sRight) {
        const iLength = Math.min(sLeft.length,sRight.length);
        let iIndex = 0;

        while (iIndex < iLength && sLeft[iIndex] === sRight[iIndex]) {
            iIndex += 1;
        }

        return iIndex;
    }

    function applyRowStyles(oTable) {
        if (!oTable || typeof oTable.getRows !== "function") {
            return;
        }

        oTable.getRows().forEach(
            function (oRow) {
                const oContext = oRow.getBindingContext("jsonModel");
                const bChanged = Boolean(oContext && oContext.getProperty("isChanged"));
                const bStructuralOnly = Boolean(oContext && oContext.getProperty("isStructuralOnly"));
                const bAdded = Boolean(oContext && oContext.getProperty("isAdded"));
                const bRemoved = Boolean(oContext && oContext.getProperty("isRemoved"));

                const oRowDomRef = oRow.getDomRef();
                if (!oRowDomRef) {
                    return;
                }

                oRowDomRef.classList.toggle("pricelistVersionHistoryChangedRow",bChanged && !bStructuralOnly);
                oRowDomRef.classList.toggle("pricelistVersionHistoryAddedRow",bAdded && !bStructuralOnly);
                oRowDomRef.classList.toggle("pricelistVersionHistoryRemovedRow",bRemoved && !bStructuralOnly);
            }
        );
    }

    return {
        onExpand: function (oEvent) {
            const oTable = getTargetTable(oEvent);

            if (!oTable) {
                return;
            }

            const aSelectedIndices = oTable.getSelectedIndices?.() || [];

            if (!aSelectedIndices.length) {
                MessageToast.show("Please select a category to expand.");
                return;
            }

            const iSelectedIndex = aSelectedIndices[0];
            const oContext = oTable.getContextByIndex(iSelectedIndex);
            const oNode = oContext?.getObject();

            if (!oNode || !Array.isArray(oNode.children) || !oNode.children.length) {
                MessageToast.show("Please select a category to expand.");
                return;
            }

            oTable.expand(iSelectedIndex);
        },

        onCollapse: function (oEvent) {
            const oTable = getTargetTable(oEvent);

            if (!oTable) {
                return;
            }

            const aSelectedIndices = oTable.getSelectedIndices?.() || [];

            if (!aSelectedIndices.length) {
                MessageToast.show("Please select a category to collapse.");
                return;
            }

            const iSelectedIndex = aSelectedIndices[0];
            const oContext = oTable.getContextByIndex(iSelectedIndex);
            const oNode = oContext?.getObject();

            if (!oNode || !Array.isArray(oNode.children) || !oNode.children.length) {
                MessageToast.show("Please select a category to collapse.");
                return;
            }

            oTable.collapse(iSelectedIndex);
        },

        onExpandAll: function (oEvent) {
            const oTable = getTargetTable(oEvent);

            if (oTable?.expandToLevel) {
                oTable.expandToLevel(99);
            }
        },

        onCollapseAll: function (oEvent) {
            const oTable = getTargetTable(oEvent);

            if (oTable?.collapseAll) {
                oTable.collapseAll();
            }
        },

        onSort: function (oEvent) {
            const oTable = getTargetTable(oEvent);
            const sTableId = getTableIdFromEvent(oEvent);
            const oConfig = TABLE_CONFIG[sTableId];

            if (!oTable || !oConfig) {
                return;
            }

            const oModel = getJsonModel(oTable);
            const aVisibleTree = oModel.getProperty(oConfig.visiblePath) || [];
            const sCurrentDirection = TABLE_STATE[sTableId]?.sortDirection || "desc";
            const sNextDirection = sCurrentDirection === "asc" ? "desc" : "asc";

            const iDirection = sNextDirection === "asc" ? 1 : -1;

            TABLE_STATE[sTableId] = Object.assign(
                {},
                TABLE_STATE[sTableId],
                {
                    sortDirection: sNextDirection
                }
            );

            oModel.setProperty(oConfig.visiblePath,sortHierarchy(aVisibleTree, iDirection));
            oModel.updateBindings(true);
            oTable.clearSelection?.();

            MessageToast.show(sNextDirection === "asc" ? "Table sorted ascending." : "Table sorted descending.");
        },

        onOpenFilter: function (oEvent) {
            const oSource = oEvent.getSource();
            const oTable = getTargetTable(oEvent);
            const sTableId = getTableIdFromEvent(oEvent);
            const oConfig = TABLE_CONFIG[sTableId];

            if (!oTable || !oConfig) {
                return;
            }

            const oModel = getJsonModel(oTable);
            const sExistingSearch = TABLE_STATE[sTableId]?.searchText || "";

            const oSearchField = new SearchField({
                width: "100%",
                value: sExistingSearch,
                placeholder: "Search table values"
            });

            const oDialog = new Dialog({
                title: "Filter",
                contentWidth: "30rem",
                content: [
                    new VBox({
                        width: "100%",
                        items: [oSearchField]
                    }).addStyleClass("sapUiSmallMargin")
                ],
                beginButton: new Button({
                    text: "Apply",
                    type: "Emphasized",
                    press: function () {
                        const sSearchText = oSearchField.getValue().trim();
                        const aFullTree = oModel.getProperty(oConfig.fullPath) || [];

                        TABLE_STATE[sTableId] = Object.assign(
                            {},
                            TABLE_STATE[sTableId],
                            {
                                searchText: sSearchText
                            }
                        );

                        oModel.setProperty(oConfig.visiblePath,filterHierarchy(aFullTree, sSearchText));
                        oModel.updateBindings(true);

                        oDialog.close();
                        oDialog.destroy();

                        setTimeout(function () {
                            oTable.expandToLevel?.(99);
                        }, 0);
                    }
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                        oDialog.destroy();
                    }
                })
            });

            oDialog.setModel(oModel, "jsonModel");
            oDialog.open();
        },

        onClearFilter: function (oEvent) {
            const oTable = getTargetTable(oEvent);
            const sTableId = getTableIdFromEvent(oEvent);
            const oConfig = TABLE_CONFIG[sTableId];

            if (!oTable || !oConfig) {
                return;
            }

            const oModel = getJsonModel(oTable);
            const aFullTree = oModel.getProperty(oConfig.fullPath) || [];

            TABLE_STATE[sTableId] = Object.assign(
                {},
                TABLE_STATE[sTableId],
                {
                    searchText: ""
                }
            );

            oModel.setProperty(oConfig.visiblePath,clone(aFullTree));
            oModel.updateBindings(true);

            setTimeout(function () {
                oTable.expandToLevel?.(99);
            }, 0);
        },

        onNavigate: function (oEvent) {
            const oSource = oEvent.getSource();
            const sTargetId = oSource.data("target");
            const oTarget = findTargetControl(oSource,sTargetId);

            if (!oTarget || !oTarget.getDomRef()) {
                return;
            }

            oTarget.getDomRef().scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        },

        onRowsUpdated: function (oEvent) {
            applyRowStyles(oEvent.getSource());
        },

        priceState: function (sDirection) {
            if (sDirection === "INCREASE") {
                return "Error";
            }

            if (sDirection === "DECREASE") {
                return "Success";
            }

            return "None";
        },

        changeState: function (sChangeType) {
            if (sChangeType === "ADDED") {
                return "Success";
            }

            if (sChangeType === "REMOVED") {
                return "Error";
            }

            return "None";
        }
    };
});