sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/unified/FileUploader",
    "sap/ui/export/Spreadsheet"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, Label, Input, SimpleForm, FileUploader, Spreadsheet) {
    "use strict";

    /** Functions for building the tree table (UI Level) **/
    const H_FIELDS = ["MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5"];

    function norm(v) {
        return (v == null) ? "" : String(v).trim();
    }

    function buildTree(rows) {
        const byKey = new Map();
        const roots = [];

        const ensureCategoryNode = (key, text, parentKey, level, row) => {
            if (!byKey.has(key)) {

                // Build category field values from the selected full key path ("Main 1 / Sub 1 / Sub 2"..)
                const parts = key.split(" / ");

                const node = {
                    key,
                    text,
                    kind: "Category",
                    level,
                    children: [],

                    // Store hierarchy fields so create-under-node can prefill the values correctly.
                    MainCategory: parts[0] || null,
                    Subcategory1: parts[1] || null,
                    Subcategory2: parts[2] || null,
                    Subcategory3: parts[3] || null,
                    Subcategory4: parts[4] || null,
                    Subcategory5: parts[5] || null
                };

                byKey.set(key, node);

                if (parentKey && byKey.has(parentKey)) {
                    byKey.get(parentKey).children.push(node);
                } else {
                    roots.push(node);
                }
            }
            return byKey.get(key);
        };

        for (const r of rows) {
            const parts = H_FIELDS.map(f => norm(r[f])).filter(Boolean);
            if (!parts.length) continue;

            let path = "";
            let parentPath = null;

            for (let i = 0; i < parts.length; i++) {
                path = path ? `${path} / ${parts[i]}` : parts[i];
                ensureCategoryNode(path, parts[i], parentPath, i + 1);
                parentPath = path;
            }

            const leaf = {
                key: "P:" + r.ID,
                text: r.PricelistPartNumber || "(No Part Number)",
                kind: "Product",
                ...r,
                children: []
            };
            byKey.get(parentPath).children.push(leaf);
        }

        return roots;
    }

    function findTermsInChildren(children, categoryField, categoryValue, termsField) {
        for (const child of children) {
            if (child.Kind === "Product" && child[categoryField] === categoryValue) {
                return child[termsField] || "";
            }
            if (child.children && child.children.length > 0) {
                const val = findTermsInChildren(child.children, categoryField, categoryValue, termsField);
                if (val) return val;
            }
        }
        return "";
    }

    return Controller.extend("pricelistapp.pricelistmaintain.ext.controller.ProductsTree", {
        onInit: function () {
            this._selectedNode = null;

            this._sortAscending = true;
            this._hierFilterDialog = null;
            this._hierFilter = { field: "MainCategory", value: "" };

            this._lastIsActiveEntity = undefined; // Track draft/edit switch so we can refresh after save automatically
            this._isTreeExpanded = false; // Track if tree table is expanded or collapsed

            // Tree Table
            this.getView().setModel(
                new JSONModel({ nodes: [] }),
                "tree"
            );

            //Terms and Conditions
            const termsCondModel =
                new JSONModel({
                    isEditMode: this._isEditMode(), // true in Draft/Create Mode
                    termsEditable: false, // default: read-only
                    hasSelection: false  // updated when user selects a node
                });
            this.getView().setModel(termsCondModel);
            this._updateTermsUI();

            //Refresh
            this._itemCtxById = new Map();
            this._updateCreateButtonState();
            // this.onRefresh();

            //Custom Section does not reload on click of 'Edit' button - react to binding context change instead.
            this.getView().addEventDelegate({
                onBeforeRendering: () => {
                    this._updateCreateButtonState();
                    termsCondModel.setProperty("/isEditMode", this._isEditMode());
                }
            });
        },

        //Change Column Display for Tree Table
        onOpenColumnPopover: function (oEvent) {
            if (!this._oColumnPopover) {
                const oTable = this.byId("ProductsTreeTable");
                const aColumns = oTable.getColumns();

                const oVBox = new sap.m.VBox({
                    items: aColumns.map(col => new sap.m.CheckBox({
                        text: col.getLabel().getText(),
                        selected: col.getVisible()
                    }))
                });

                // Create popover if not already created
                this._oColumnPopover = new sap.m.ResponsivePopover({
                    title: "Select Columns",
                    content: [oVBox],
                    endButton: new sap.m.Button({
                        text: "Apply",
                        type: "Emphasized",
                        press: () => {
                            // Apply selections to columns
                            oVBox.getItems().forEach((chk, idx) => {
                                aColumns[idx].setVisible(chk.getSelected());
                            });
                            this._oColumnPopover.close();
                        }
                    }),
                    beginButton: new sap.m.Button({
                        text: "Cancel",
                        press: () => {
                            // Just close, no changes applied
                            this._oColumnPopover.close();
                        }
                    })
                });
            }

            this._oColumnPopover.openBy(oEvent.getSource());
        },

        _updateCreateButtonState: function () {
            const oRootCtx = this._getRootPricelistContext();
            const termsCondModel = this.getView().getModel();

            //Update label of the tree table button depending on mode
            this._updateRefreshButtonLabel();

            // Auto refresh tree once after SAVE (Edit->Display flip)
            // In FE draft apps:
            // IsActiveEntity === false  → Edit Mode (Draft)
            // IsActiveEntity === true   → Display Mode (Active)
            if (oRootCtx) {
                const isActive = oRootCtx.getProperty("IsActiveEntity");

                termsCondModel.setProperty("/isEditMode", this._isEditMode());
                this._updateTermsUI();

                if (this._lastIsActiveEntity === undefined) {
                    this._lastIsActiveEntity = isActive;
                    this.onRefresh();
                } else {
                    // If we were editing (draft) and now became active, that means Save/Activate happened
                    if (this._lastIsActiveEntity === false && isActive === true) {
                        // Remove temp draft nodes and rebuild from backend once
                        this._rebuildTreeAfterSave();
                    }
                    this._lastIsActiveEntity = isActive;
                }
            } else {
                // Clear tree whenever Object Page Context Changes (e.g. back → select another row)
                const oTreeModel = this.getView().getModel("tree");
                if (oTreeModel) {
                    oTreeModel.setProperty("/nodes", []);
                    oTreeModel.setProperty("/nodesAll", []);
                }
                if (this._itemCtxById) this._itemCtxById.clear();
                this._selectedNode = null;

                this.byId("ProductsTreeDeleteBtn").setEnabled(false);
                this.byId("ProductsTreeExpandCollapseBtn").setEnabled(false);
            }
        },

        _isCreateMode: function () {
            const oRootCtx = this._getRootPricelistContext();
            if (!oRootCtx) return false;

            // In FE draft apps, create mode is also a draft (IsActiveEntity === false)
            // You can distinguish create by checking if the header has no stable ID yet
            return oRootCtx.getProperty("IsActiveEntity") === false && !oRootCtx.getProperty("ID");
        },

        _isEditMode: function () {
            const oRootCtx = this._getRootPricelistContext();
            if (!oRootCtx) return false;

            // In FE draft apps:
            // IsActiveEntity === false  → Edit Mode
            // IsActiveEntity === true   → Display Mode
            return oRootCtx.getProperty("IsActiveEntity") === false;
        },

        //Button Label Update between Display/Edit/Create Mode
        _updateRefreshButtonLabel: function () {
            // const oBtn = this.byId("ProductsTreeRefreshButton");
            // if (!oBtn) return;

            // if (this._isEditMode()) {
            //     // In draft/edit mode → user can fetch materials
            //     oBtn.setText("Fetch Pricelist Materials");
            // } else {
            //     // In active/display mode → just refresh tree
            //     oBtn.setText("Go");
            // }
        },

        //Node Selection Change Logic
        onSelectionChange: function (oEvent) {
            // const oTable = oEvent.getSource();
            // const iIndex = oTable.getSelectedIndex();

            // const bHasSelection = iIndex >= 0;
            // this.getView().getModel().setProperty("/hasSelection", bHasSelection);

            // const termsCondModel = this.getView().getModel();
            // termsCondModel.setProperty("/hasSelection", bHasSelection);

            // const bEditMode = this._isEditMode();

            // this._selectedNode = bHasSelection ? oTable.getContextByIndex(iIndex).getObject() : null;

            // // Delete is only enebales during edit mode and if a row is selected.
            // this.byId("ProductsTreeDeleteBtn").setEnabled(bHasSelection && bEditMode);

            // //Terms buttons should be visible if node selected AND in edit OR create mode
            // const showTerms = bHasSelection && (this._isEditMode() || this._isCreateMode());
            // termsCondModel.setProperty("/termsEditable", showTerms);
            // this._updateTermsUI();

            // //Terms and Conditions
            // if (this._selectedNode) {
            //     //Only enable 'Edit' is the selected node is Product and in Create/Edit Mode
            //     if (this._selectedNode.Kind === "Product") {
            //         this.byId("editBtn").setEnabled(bHasSelection && bEditMode);
            //     } else {
            //         this.byId("editBtn").setEnabled(false);
            //     }

            //     //Update of Terms and Conditions Input Box Value
            //     let fieldName, categoryField, categoryValue;


            //     if (this._selectedNode.Kind === "Category") {
            //         switch (this._selectedNode.level) {
            //             case 1:
            //                 fieldName = "MainCategoryTermsandCond";
            //                 categoryField = "MainCategory";
            //                 break;
            //             case 2:
            //                 fieldName = "SubCategory1TermsandCond";
            //                 categoryField = "Subcategory1";
            //                 break;
            //             case 3:
            //                 fieldName = "SubCategory2TermsandCond";
            //                 categoryField = "Subcategory2";
            //                 break;
            //             case 4:
            //                 fieldName = "SubCategory3TermsandCond";
            //                 categoryField = "Subcategory3";
            //                 break;
            //             case 5:
            //                 fieldName = "SubCategory4TermsandCond";
            //                 categoryField = "Subcategory4";
            //                 break;
            //             case 6:
            //                 fieldName = "SubCategory5TermsandCond";
            //                 categoryField = "Subcategory5";
            //                 break;
            //         }
            //         categoryValue = this._selectedNode[categoryField];

            //     } else if (this._selectedNode.Kind === "Product") {
            //         fieldName = "PartNumberTermsandCond";
            //     }

            //     if (fieldName) {
            //         let termsValue = "";

            //         if (this._selectedNode.Kind === "Category") {
            //             const allRows = this.getView().getModel("tree").getProperty("/nodesAll") || [];

            //             for (const row of allRows) {
            //                 termsValue = findTermsInChildren(row.children || [], categoryField, categoryValue, fieldName);
            //                 if (termsValue)
            //                     break;
            //             }
            //         } else {
            //             termsValue = this._selectedNode[fieldName] || "";
            //         }

            //         this.byId("TermsContentBox").setValue(termsValue);
            //     }
            // } else {
            //     this.byId("TermsContentBox").setValue("");
            // }
        },

        onSelectionChangeV2: function (oEvent) {
            // // // 1. Call the original, untouched function to handle standard states & buttons
            // // this.onSelectionChange(oEvent);

            // // 2. Execute the new logic for the Fragment and Navigation
            // const oTable = oEvent.getSource();
            // const iIndex = oTable.getSelectedIndex();

            // // The exact Fiori Elements prefix for your Custom SubSection fragment
            // const sFePrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::PricelistMainCategory--";

            // if (iIndex >= 0) {
            //     const oSelectedNode = oTable.getContextByIndex(iIndex).getObject();

            //     if (oSelectedNode) {
            //         const sCategoryName = oSelectedNode.text || "";

            //         // Fetch inputs using the exact absolute IDs
            //         const oMainCatInput = sap.ui.getCore().byId(sFePrefix + "MainCategoryInput");
            //         const oPublishedCatInput = sap.ui.getCore().byId(sFePrefix + "PublishedMainCategoryInput");

            //         if (oMainCatInput) {
            //             oMainCatInput.setValue(sCategoryName);
            //         }
            //         if (oPublishedCatInput) {
            //             oPublishedCatInput.setValue(sCategoryName);
            //         }

            //         // ====================================================================
            //         // Navigate/Scroll to the Subsection (Native UI5 Approach)
            //         // ====================================================================

            //         // 1. Traverse up the UI tree to find the Fiori ObjectPageLayout container
            //         let oControl = this.getView();
            //         let oObjectPageLayout = null;

            //         while (oControl) {
            //             if (oControl.isA && oControl.isA("sap.uxap.ObjectPageLayout")) {
            //                 oObjectPageLayout = oControl;
            //                 break;
            //             }
            //             oControl = oControl.getParent && oControl.getParent();
            //         }

            //         const sSubSectionId = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::PricelistMainCategory";

            //         // 2. Tell the ObjectPageLayout to scroll smoothly to your subsection
            //         if (oObjectPageLayout) {
            //             oObjectPageLayout.scrollToSection(sSubSectionId);
            //         } else {
            //             // 3. Ultimate Fallback: Direct DOM scroll if the ObjectPageLayout isn't found
            //             const oSubSection = sap.ui.getCore().byId(sSubSectionId);
            //             if (oSubSection && oSubSection.getDomRef()) {
            //                 oSubSection.getDomRef().scrollIntoView({ behavior: "smooth" });
            //             }
            //         }
            //     } else {
            //         // Clear the inputs if the user deselects the row
            //         const oMainCatInput = sap.ui.getCore().byId(sFePrefix + "MainCategoryInput");
            //         const oPublishedCatInput = sap.ui.getCore().byId(sFePrefix + "PublishedMainCategoryInput");

            //         if (oMainCatInput) oMainCatInput.setValue("");
            //         if (oPublishedCatInput) oPublishedCatInput.setValue("");
            //     }
            // }
        },

        _getSelectedNodeNow: function () {
            const oTable = this.byId("ProductsTreeTable");
            const iIndex = oTable.getSelectedIndex();
            if (iIndex < 0)
                return null;

            const oCtx = oTable.getContextByIndex(iIndex);
            return oCtx ? oCtx.getObject() : null;
        },

        // Get Root Context Finder (PricelistData Object Page Context)
        _getRootPricelistContext: function () {
            // Try current view first
            let o = this.getView();
            while (o) {
                const ctx = o.getBindingContext && o.getBindingContext(); // default model
                if (ctx && typeof ctx.getPath === "function" && ctx.getPath().includes("PricelistData")) {
                    return ctx;
                }
                o = o.getParent && o.getParent();
            }
            return null;
        },

        // After SAVE, remove temporary draft nodes then rebuild from backend once to avoid duplicates.
        _rebuildTreeAfterSave: function () {
            const oTreeModel = this.getView().getModel("tree");
            const nodes = oTreeModel.getProperty("/nodes") || [];

            const clean = (arr) => {
                return (arr || [])
                    .filter(n => !n._isDraftTemp)
                    .map(n => ({
                        ...n,
                        children: clean(n.children)
                    }));
            };

            oTreeModel.setProperty("/nodes", clean(nodes));
            oTreeModel.refresh(true);

            this.onRefresh();
        },

        //Terms Change Logic
        onTermsChanged: async function (oEvent) {
            const newValue = oEvent.getParameter("value");
            if (!this._selectedNode)
                return;

            // Update the node object in the tree model
            const oTreeModel = this.getView().getModel("tree");
            const fieldName = this._termsFieldForNode(this._selectedNode);
            if (fieldName) {
                this._selectedNode[fieldName] = newValue;

                // Cascade down to children in /nodes and /nodesAll
                const cascadeChildren = (children) => {
                    children.forEach(child => {
                        child[fieldName] = newValue;
                        if (child.children && child.children.length > 0) {
                            cascadeChildren(child.children || []);
                        }
                    });
                };
                cascadeChildren(this._selectedNode.children || []);


                // Update the tree model array (nodes/nodesAll)
                const aRoots = oTreeModel.getProperty("/nodes") || [];
                this._updateNodeInTree(aRoots, this._selectedNode.key, fieldName, newValue);
                oTreeModel.setProperty("/nodes", aRoots);

                const aAll = oTreeModel.getProperty("/nodes") || [];
                oTreeModel.setProperty("/nodesAll", JSON.parse(JSON.stringify(aAll)));

                oTreeModel.refresh(true);

                // Update the draft context (PricelistItemData/items)
                const oRootCtx = this._getRootPricelistContext();
                if (oRootCtx) {
                    const oModel = oRootCtx.getModel();
                    const sItemsPath = oRootCtx.getPath() + "/items";
                    const oListBinding = oModel.bindList(sItemsPath);
                    const aDraftCtx = await oListBinding.requestContexts(0, 5000);

                    if (this._selectedNode.Kind === "Category") {
                        // Update all child product contexts under this category
                        aDraftCtx.forEach(ctx => {
                            const obj = ctx.getObject();
                            if (!obj) return;

                            if (this._isChildOfSelected(obj, this._selectedNode)) {
                                ctx.setProperty(fieldName, newValue);
                            }
                        });
                    } else if (this._selectedNode.Kind === "Product") {
                        // Product nodes have IDs, so we can match directly
                        const targetCtx = aDraftCtx.find(ctx => {
                            const obj = ctx.getObject();
                            return obj.ID === this._selectedNode.ID;
                        });
                        if (targetCtx) {
                            targetCtx.setProperty(fieldName, newValue);
                        }
                    }
                }
            }

        },

        _updateNodeInTree: function (nodes, key, fieldName, value) {
            for (const node of nodes) {
                if (node.key === key) {
                    node[fieldName] = value; // Update the selected node value

                    // Always update children too
                    if (node.children && node.children.length > 0) {
                        node.children.forEach(child => {
                            child[fieldName] = value;

                            // Recurse into grandchildren
                            this._updateNodeInTree(child.children || [], child.key, fieldName, value);
                        });
                    }
                    return true;
                }

                // Search deeper if not matched yet
                if (node.children && node.children.length > 0) {
                    if (this._updateNodeInTree(node.children, key, fieldName, value)) {
                        return true;
                    }
                }
            }
            return false;
        },

        _isChildOfSelected: function (obj, selectedNode) {
            // Compare hierarchy fields to see if obj belongs under selectedNode
            return (
                obj.MainCategory === selectedNode.MainCategory &&
                (!selectedNode.Subcategory1 || obj.Subcategory1 === selectedNode.Subcategory1) &&
                (!selectedNode.Subcategory2 || obj.Subcategory2 === selectedNode.Subcategory2) &&
                (!selectedNode.Subcategory3 || obj.Subcategory3 === selectedNode.Subcategory3) &&
                (!selectedNode.Subcategory4 || obj.Subcategory4 === selectedNode.Subcategory4) &&
                (!selectedNode.Subcategory5 || obj.Subcategory5 === selectedNode.Subcategory5)
            );
        },

        _termsFieldForNode: function (node) {
            if (node.Kind === "Product") return "PartNumberTermsandCond";
            switch (node.level) {
                case 1: return "MainCategoryTermsandCond";
                case 2: return "SubCategory1TermsandCond";
                case 3: return "SubCategory2TermsandCond";
                case 4: return "SubCategory3TermsandCond";
                case 5: return "SubCategory4TermsandCond";
                case 6: return "SubCategory5TermsandCond";
            }
        },

        // Refresh/Fetch Updated Data
        onRefresh: async function () {
            const oRootCtx = this._getRootPricelistContext();
            const oTreeModel = this.getView().getModel("tree");

            //Clear the tree model first, before binding anything to it.
            oTreeModel.setProperty("/nodes", []);
            oTreeModel.setProperty("/nodesAll", []);
            if (this._itemCtxById)
                this._itemCtxById.clear();

            // Detect whether in Create or Update mode.
            const headerData = oRootCtx.getObject();
            const bIsCreateDraft = headerData.IsActiveEntity === false && headerData.HasActiveEntity === false;
            const bIsUpdateDraft = headerData.IsActiveEntity === false && headerData.HasActiveEntity === true;

            const oModel = oRootCtx.getModel();

            // Helper to add filters only if non-empty
            const filters = [];
            const addFilter = (field, value) => {
                if (value && String(value).trim() !== "") {
                    filters.push(`${field} eq '${value}'`);
                }
            };

            // Mandatory fields
            addFilter("TradeScenario", headerData.TradeScenario);
            addFilter("MarketScopeRegion", headerData.MarketScopeRegion);
            addFilter("MarketScopeCountry", headerData.MarketScopeCountry);

            // Optional fields (only added if non-empty)
            addFilter("SalesOrg", headerData.SalesOrg);
            addFilter("DistChannel", headerData.DistChannel);
            addFilter("CustPriceList", headerData.CustPriceList);
            addFilter("CustGroup1", headerData.CustGroup1);
            addFilter("ErpCustomer", headerData.ErpCustomer);
            addFilter("DeliveringPlant", headerData.DeliveringPlant);

            const filterString = filters.join(" and ");

            // --- CREATE MODE: Prepopulate from ExternalMaterials ++ HANA DB Tables
            if (bIsCreateDraft) {
                // Call ResolvedPricelistItem with dynamic filter.
                const oList = oModel.bindList("/ResolvedPricelistItem", undefined, undefined, undefined, {
                    $filter: filterString
                });

                const aCtx = await oList.requestContexts(0, 5000);
                const resolvedItems = aCtx.map(c => c.getObject());

                const sItemsPath = oRootCtx.getPath() + "/items";
                const oListBinding = oModel.bindList(sItemsPath);

                // Wipe Current Draft Items first if there's any
                const aDraftCtx = await oListBinding.requestContexts(0, 5000);
                for (const ctx of aDraftCtx) {
                    await ctx.delete();
                }

                for (const item of resolvedItems) {
                    const payload = {
                        PricelistPartNumber: item.PricelistPartNumber,
                        PartNumberDescr: item.PartNumberDescr,
                        PartNumberDescrLong: item.PartNumberDescr,
                        MainCategory: item.MainCategory,
                        Subcategory1: item.Subcategory1,
                        Subcategory2: item.Subcategory2,
                        Subcategory3: item.Subcategory3,
                        Subcategory4: item.Subcategory4,
                        Subcategory5: item.Subcategory5,
                        //Plant                    : item.Plant,
                        //MaterialPricingGroup     : item.MaterialPricingGroup,
                        //CustomerClassification   : item.CustomerClassification,
                        //PriceCondition           : item.PriceCondition,
                        MaterialStatus: item.MaterialStatus,
                        MaterialStatusEffecDate: item.MaterialStatusEffecDate,
                        Price: item.Price,
                        PriceUnit: item.PriceUnit,
                        DiscountRate: item.DiscountRate,
                        DiscountEffectiveDate: item.DiscountEffectiveDate,
                        PartNumberTermsandCond: item.PartNumberTermsandCond,
                        MainCategoryTermsandCond: item.MainCategoryTermsandCond,
                        SubCategory1TermsandCond: item.SubCategory1TermsandCond,
                        SubCategory2TermsandCond: item.SubCategory2TermsandCond,
                        SubCategory3TermsandCond: item.SubCategory3TermsandCond,
                        SubCategory4TermsandCond: item.SubCategory4TermsandCond,
                        SubCategory5TermsandCond: item.SubCategory5TermsandCond
                    };

                    const newCtx = oListBinding.create(payload);
                    await newCtx.created();
                }

                // After creating, rebuild tree from draft contexts.
                const aDraftCtx2 = await oListBinding.requestContexts(0, 5000);
                const rows = aDraftCtx2.map(c => c.getObject());
                const nodes = buildTree(rows);

                this.getView().getModel("tree").setProperty("/nodes", nodes);
                this.getView().getModel("tree").setProperty("/nodesAll", JSON.parse(JSON.stringify(nodes)));

                this.getView().getModel().setProperty("/isEditMode", false);
                this._updateTermsUI();

            } else if (bIsUpdateDraft) {
                // Clear existing draft items
                const sItemsPath = oRootCtx.getPath() + "/items";
                const oListBinding = oModel.bindList(sItemsPath);
                const aCtx = await oListBinding.requestContexts(0, 5000);

                // Wipe Current Draft Items first if there's any
                for (const ctx of aCtx) {
                    await ctx.delete();
                }

                // Re-fetch from ResolvedPricelistItem with filters
                const oResolvedList = oModel.bindList("/ResolvedPricelistItem", undefined, undefined, undefined, {
                    $filter: filterString
                });
                const aResolvedCtx = await oResolvedList.requestContexts(0, 5000);
                const resolvedItems = aResolvedCtx.map(c => c.getObject());
                for (const item of resolvedItems) {
                    oListBinding.create(item);
                }

                // Rebuild tree from new draft contexts
                const aDraftCtx = await oListBinding.requestContexts(0, 5000);
                const rows = aDraftCtx.map(c => c.getObject());
                const nodes = buildTree(rows);
                oTreeModel.setProperty("/nodes", nodes);
                oTreeModel.setProperty("/nodesAll", JSON.parse(JSON.stringify(nodes)));

            } else {
                const sItemsPath = oRootCtx.getPath() + "/items";   // draft-safe source

                const oItemsBinding = oModel.bindList(sItemsPath);
                const aCtx = await oItemsBinding.requestContexts(0, 5000);

                // Cache real OData V4 contexts by ID
                aCtx.forEach(ctx => {
                    const obj = ctx.getObject();
                    if (obj && obj.ID) this._itemCtxById.set(obj.ID, ctx);
                });

                const rows = aCtx.map(ctx => ctx.getObject());
                const nodes = buildTree(rows);
                oTreeModel.setProperty("/nodes", nodes);
                oTreeModel.setProperty(
                    "/nodesAll",
                    JSON.parse(JSON.stringify(nodes))
                );
            }

            // Keep selection consistent
            const oTable = this.byId("ProductsTreeTable");
            oTable.clearSelection();

            this._selectedNode = null;

            // Disable Edit/Delete Button first -
            this.byId("ProductsTreeDeleteBtn").setEnabled(false);
            this.byId("editBtn").setEnabled(false);

            // Enable expand / collapse button first, only enabled when GO button is hit.
            this.byId("ProductsTreeExpandCollapseBtn").setEnabled(true);

            // Clear Terms and Conditions Input Box
            this.byId("TermsContentBox").setValue("");
        },

        // Edit Button
        onEditNode: function () {
            const node = this._selectedNode;
            if (!node)
                return;

            // Create reusable helper for a cell (label + control)
            const makeCell = (label, control) => {
                return new sap.m.HBox({
                    //alignItems: "Center",
                    layoutData: new sap.m.FlexItemData({ growFactor: 1 }),
                    items: [
                        new sap.m.Label({ text: label, width: "200px", design: "Bold" }),
                        control.addStyleClass("sapUiSmallMarginBegin")
                    ]
                }).addStyleClass("sapUiSmallMargin");
            };

            // Create reusable helper for a row (two cells side by side)
            const makeRow = (leftLabel, leftControl, rightLabel, rightControl) => {
                leftControl.setWidth("250px");
                rightControl.setWidth("300px");

                return new sap.m.HBox({
                    justifyContent: "SpaceBetween",
                    items: [
                        makeCell(leftLabel, leftControl),
                        makeCell(rightLabel, rightControl)
                    ]
                });
            };

            // Editable controls (store references for Save)
            this._descrInput = new sap.m.Input({ value: node.PartNumberDescrLong });
            this._mainCatTermsArea =
                new sap.m.TextArea({
                    value: node.MainCategoryTermsandCond,
                    rows: 3,
                    editable: !!node.MainCategory
                });
            this._subCat1TermsArea =
                new sap.m.TextArea({
                    value: node.SubCategory1TermsandCond,
                    rows: 3,
                    editable: !!node.Subcategory1
                });
            this._subCat2TermsArea =
                new sap.m.TextArea({
                    value: node.SubCategory2TermsandCond,
                    rows: 3,
                    editable: !!node.Subcategory2
                });
            this._subCat3TermsArea =
                new sap.m.TextArea({
                    value: node.SubCategory3TermsandCond,
                    rows: 3,
                    editable: !!node.Subcategory3
                });
            this._subCat4TermsArea =
                new sap.m.TextArea({
                    value: node.SubCategory4TermsandCond,
                    rows: 3,
                    editable: !!node.Subcategory4
                });
            this._subCat5TermsArea =
                new sap.m.TextArea({
                    value: node.SubCategory5TermsandCond,
                    rows: 3,
                    editable: !!node.Subcategory5
                });
            this._partNumTermsArea =
                new sap.m.TextArea({
                    value: node.PartNumberTermsandCond,
                    rows: 3
                });

            // Build rows ~
            const oVBox = new sap.m.VBox({
                items: [
                    makeRow("Pricelist Part Number", new sap.m.Text({ text: node.PricelistPartNumber }),
                        "Material Status", new sap.m.Text({ text: node.MaterialStatus })),

                    makeRow("Description (Long)", this._descrInput,
                        "Material Status Effective Date", new sap.m.Text({ text: node.MaterialStatusEffecDate })),

                    makeRow("Price", new sap.m.Text({ text: node.Price }),
                        "Discount Rate", new sap.m.Text({ text: node.DiscountRate })),

                    makeRow("Price Unit", new sap.m.Text({ text: node.PriceUnit }),
                        "Discount Effective Date", new sap.m.Text({ text: node.DiscountEffectiveDate })),

                    makeRow("Main Category", new sap.m.Text({ text: node.MainCategory }),
                        "Main Category Terms", this._mainCatTermsArea),

                    makeRow("Subcategory 1", new sap.m.Text({ text: node.Subcategory1 }),
                        "Subcategory 1 Terms", this._subCat1TermsArea),

                    makeRow("Subcategory 2", new sap.m.Text({ text: node.Subcategory2 }),
                        "Subcategory 2 Terms", this._subCat2TermsArea),

                    makeRow("Subcategory 3", new sap.m.Text({ text: node.Subcategory3 }),
                        "Subcategory 3 Terms", this._subCat3TermsArea),

                    makeRow("Subcategory 4", new sap.m.Text({ text: node.Subcategory4 }),
                        "Subcategory 4 Terms", this._subCat4TermsArea),

                    makeRow("Subcategory 5", new sap.m.Text({ text: node.Subcategory5 }),
                        "Subcategory 5 Terms", this._subCat5TermsArea),

                    makeRow("Part Number", new sap.m.Text({ text: node.PricelistPartNumber }),
                        "Part Number Terms", this._partNumTermsArea)
                ]
            });

            // Build Edit Dialog
            this._oEditDialog = new sap.m.Dialog({
                title: "Edit Product",
                contentWidth: "1200px",
                contentHeight: "700px",
                content: [oVBox],
                buttons: [
                    new sap.m.Button({
                        text: "Save Changes",
                        type: "Emphasized",
                        press: this.onSaveEdit.bind(this)
                    }),
                    new sap.m.Button({
                        text: "Cancel",
                        press: () => this._oEditDialog.close()
                    })
                ]
            });

            this._oEditDialog.open();
        },

        onSaveEdit: async function () {
            // Read values from stored references
            const newDescrLong = this._descrInput.getValue();
            const newMainCatTerms = this._mainCatTermsArea.getValue();
            const newSubCat1Terms = this._subCat1TermsArea.getValue();
            const newSubCat2Terms = this._subCat2TermsArea.getValue();
            const newSubCat3Terms = this._subCat3TermsArea.getValue();
            const newSubCat4Terms = this._subCat4TermsArea.getValue();
            const newSubCat5Terms = this._subCat5TermsArea.getValue();
            const newPartNumTerms = this._partNumTermsArea.getValue();

            // Update selected node in UI model
            Object.assign(this._selectedNode, {
                PartNumberDescrLong: newDescrLong,
                MainCategoryTermsandCond: newMainCatTerms,
                SubCategory1TermsandCond: newSubCat1Terms,
                SubCategory2TermsandCond: newSubCat2Terms,
                SubCategory3TermsandCond: newSubCat3Terms,
                SubCategory4TermsandCond: newSubCat4Terms,
                SubCategory5TermsandCond: newSubCat5Terms,
                PartNumberTermsandCond: newPartNumTerms
            });

            // Update /nodes and /nodesAll arrays in the model
            const oTreeModel = this.getView().getModel("tree");
            const aNodes = oTreeModel.getProperty("/nodes") || [];
            const aNodesAll = oTreeModel.getProperty("/nodesAll") || [];

            const updateNodeInArray = (arr) => {
                const idx = arr.findIndex(n => n.ID === this._selectedNode.ID);
                if (idx !== -1) {
                    arr[idx] = { ...arr[idx], ...this._selectedNode };
                }
            };

            updateNodeInArray(aNodes);
            updateNodeInArray(aNodesAll);

            oTreeModel.setProperty("/nodes", aNodes);

            const aAll = oTreeModel.getProperty("/nodes") || [];
            oTreeModel.setProperty("/nodesAll", JSON.parse(JSON.stringify(aAll)));

            oTreeModel.refresh(true);

            // Update draft context
            const oRootCtx = this._getRootPricelistContext();
            if (oRootCtx) {
                const oModel = oRootCtx.getModel();
                const sItemsPath = oRootCtx.getPath() + "/items";
                const oListBinding = oModel.bindList(sItemsPath);
                const aDraftCtx = await oListBinding.requestContexts(0, 5000);

                const targetCtx = aDraftCtx.find(ctx => ctx.getObject().ID === this._selectedNode.ID);
                if (targetCtx) {
                    targetCtx.setProperty("PartNumberDescrLong", newDescrLong);
                    targetCtx.setProperty("MainCategoryTermsandCond", newMainCatTerms);
                    targetCtx.setProperty("SubCategory1TermsandCond", newSubCat1Terms);
                    targetCtx.setProperty("SubCategory2TermsandCond", newSubCat2Terms);
                    targetCtx.setProperty("SubCategory3TermsandCond", newSubCat3Terms);
                    targetCtx.setProperty("SubCategory4TermsandCond", newSubCat4Terms);
                    targetCtx.setProperty("SubCategory5TermsandCond", newSubCat5Terms);
                    targetCtx.setProperty("PartNumberTermsandCond", newPartNumTerms);
                }
            }

            this._oEditDialog.close();
        },

        // Delete selected node (Product) OR selected node + subnodes (Category).
        onDelete: function () {
            if (!this._isEditMode()) {
                MessageBox.information("Please switch to Edit mode to delete records.");
                return;
            }

            const node = this._getSelectedNodeNow();
            if (!node) {
                MessageBox.information("Please select a row to delete.");
                return;
            }

            if (node.Kind === "Category") {
                MessageBox.confirm("Delete this category and all its subnodes?", {
                    title: "Delete",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: (a) => {
                        if (a !== MessageBox.Action.OK) return;
                        this._deleteCategoryDraftSafe(node);
                    }
                });
                return;
            }

            if (node.Kind === "Product") {
                MessageBox.confirm("Delete this product?", {
                    title: "Delete",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.OK,
                    onClose: (a) => {
                        if (a !== MessageBox.Action.OK) return;
                        this._deleteProductDraftSafe(node);
                    }
                });
                return;
            }

            MessageBox.information("Unsupported node type.");
        },

        _deleteCategoryDraftSafe: async function (node) {
            const oRootCtx = this._getRootPricelistContext();
            if (!oRootCtx) return;

            const oModel = oRootCtx.getModel();
            const sItemsPath = oRootCtx.getPath() + "/items";
            const oListBinding = oModel.bindList(sItemsPath);

            // Get all draft contexts
            const aDraftCtx = await oListBinding.requestContexts(0, 5000);

            // Collect product IDs under this category
            const info = this._collectProductsUnderNode(node);
            const idsToDelete = new Set(info.productIds);

            // Delete only matching draft rows
            for (const ctx of aDraftCtx) {
                const obj = ctx.getObject();
                if (idsToDelete.has(obj.ID)) {
                    try {
                        await ctx.delete();
                    } catch (e) {
                        MessageToast.show("Some draft rows could not be deleted.");
                    }
                }
            }

            //Remove from UI Tree
            this._removeBranchFromTreeModel(node.key);
            MessageToast.show("Category and subnodes successfully deleted.");
        },

        _deleteProductDraftSafe: async function (node) {
            const oRootCtx = this._getRootPricelistContext();
            if (!oRootCtx)
                return;

            const oModel = oRootCtx.getModel();
            const sItemsPath = oRootCtx.getPath() + "/items";
            const oListBinding = oModel.bindList(sItemsPath);

            // Get all draft contexts
            const aDraftCtx = await oListBinding.requestContexts(0, 5000);

            // Find the one matching our node
            const targetCtx = aDraftCtx.find(ctx => {
                const obj = ctx.getObject();
                return obj.ID === node.ID;
            });

            if (targetCtx) {
                await targetCtx.delete();
            }

            //Remove from UI Tree
            this._removeLeafFromTreeModel(node);
            MessageToast.show("Product successfully deleted.");
        },

        // Collect all products (saved + temp) under a selected category node.
        _collectProductsUnderNode: function (categoryNode) {
            const productIds = [];
            const draftContexts = [];

            const collect = (n) => {
                if (n.Kind === "Product") {
                    if (n.ID) {
                        // Persisted product row
                        productIds.push(n.ID);

                        // Also check if we have a draft context cached
                        const ctx = this._itemCtxById.get(n.ID);
                        if (ctx) draftContexts.push(ctx);
                    } else {
                        // Draft-only product row (no ID yet)
                        const ctx = this._itemCtxById.get(n.ID);
                        if (ctx) draftContexts.push(ctx);
                    }
                }
                (n.children || []).forEach(collect);
            };

            collect(categoryNode);
            return { productIds, draftContexts };
        },

        // Remove a whole category branch (node + all subnodes) from JSON tree model.
        _removeBranchFromTreeModel: function (branchKey) {
            const oTreeModel = this.getView().getModel("tree");
            const roots = oTreeModel.getProperty("/nodes") || [];

            const prune = (arr) => {
                const out = [];
                for (const n of (arr || [])) {
                    if (n.Kind === "Category" && n.key === branchKey) continue; // remove branch

                    if (n.children && n.children.length) {
                        n.children = prune(n.children);
                    }

                    if (n.Kind === "Category") {
                        if ((n.children || []).length > 0) out.push(n);
                    } else {
                        out.push(n);
                    }
                }
                return out;
            };

            oTreeModel.setProperty("/nodes", prune(roots));
            oTreeModel.refresh(true);
        },

        // Remove a single product leaf from JSON tree model (and prune empty categories).
        _removeLeafFromTreeModel: function (leafNode) {
            const oTreeModel = this.getView().getModel("tree");
            const roots = oTreeModel.getProperty("/nodes") || [];
            const targetKey = leafNode.key;
            const targetId = leafNode.ID;

            const prune = (arr) => {
                const out = [];
                for (const n of (arr || [])) {
                    if (n.Kind === "Product") {
                        const matchKey = (targetKey && n.key === targetKey);
                        const matchId = (targetId && n.ID === targetId);
                        if (matchKey || matchId) continue;
                        out.push(n);
                        continue;
                    }

                    if (n.children && n.children.length) {
                        n.children = prune(n.children);
                    }

                    if (n.Kind === "Category") {
                        if ((n.children || []).length > 0) out.push(n);
                    } else {
                        out.push(n);
                    }
                }
                return out;
            };

            oTreeModel.setProperty("/nodes", prune(roots));
            oTreeModel.refresh(true);
        },

        //Sort Button Logic
        onSortProducts: function () {
            const oModel = this.getView().getModel("tree");
            const nodes = JSON.parse(JSON.stringify(oModel.getProperty("/nodes") || []));
            const asc = this._sortAscending;

            const sortTree = (arr) => {
                arr.sort((a, b) => {
                    // Categories always first
                    if (a.Kind !== b.Kind) {
                        return a.Kind === "Category" ? -1 : 1;
                    }

                    // Sort products by Part Number
                    if (a.Kind === "Product") {
                        const pa = a.PricelistPartNumber || "";
                        const pb = b.PricelistPartNumber || "";
                        return asc ? pa.localeCompare(pb) : pb.localeCompare(pa);
                    }

                    return 0;
                });

                arr.forEach(n => {
                    if (n.children && n.children.length) {
                        sortTree(n.children);
                    }
                });
            };

            sortTree(nodes);
            oModel.setProperty("/nodes", nodes);

            // Toggle for next click
            this._sortAscending = !this._sortAscending;

            MessageToast.show(
                "Sorted by Part Number " + (asc ? "A → Z" : "Z → A")
            );
        },

        // Filter Button Logic
        onOpenHierarchyFilter: function () {
            if (!this._hierFilterDialog) {
                this._hierFilterDialog = new Dialog({
                    id: this.createId("HierarchyFilterDialog"),
                    title: "Hierarchy Filter",
                    contentWidth: "420px",
                    content: new SimpleForm({
                        id: this.createId("HierarchyFilterForm"),
                        editable: true,
                        layout: "ResponsiveGridLayout",
                        content: [
                            new Label({ text: "Level" }),
                            new sap.m.Select({
                                id: this.createId("HierarchyFilterLevel"),
                                width: "100%",
                                items: [
                                    new sap.ui.core.Item({ key: "MainCategory", text: "Main Category" }),
                                    new sap.ui.core.Item({ key: "Subcategory1", text: "Subcategory 1" }),
                                    new sap.ui.core.Item({ key: "Subcategory2", text: "Subcategory 2" }),
                                    new sap.ui.core.Item({ key: "Subcategory3", text: "Subcategory 3" }),
                                    new sap.ui.core.Item({ key: "Subcategory4", text: "Subcategory 4" }),
                                    new sap.ui.core.Item({ key: "Subcategory5", text: "Subcategory 5" })
                                ],
                                change: () => {
                                    this._hierFilter.field = this.byId("HierarchyFilterLevel").getSelectedKey();
                                }
                            }),

                            new Label({ text: "Value" }),
                            new Input({
                                id: this.createId("HierarchyFilterValue"),
                                placeholder: "Type value (contains match)",
                                liveChange: (e) => {
                                    this._hierFilter.value = (e.getParameter("newValue") || "");
                                }
                            })
                        ]
                    }),

                    beginButton: new Button({
                        text: "Apply",
                        type: "Emphasized",
                        press: () => {
                            this._applyAllFilters();
                            this._hierFilterDialog.close();
                        }
                    }),

                    endButton: new Button({
                        text: "Clear",
                        press: () => {
                            // Clear hierarchy filter state
                            this._hierFilter.value = "";
                            this.byId("HierarchyFilterValue").setValue("");

                            this._applyAllFilters();
                            this._hierFilterDialog.close();
                        }
                    })
                });

                this.getView().addDependent(this._hierFilterDialog);

                // Set defaults on first open
                this.byId("HierarchyFilterLevel").setSelectedKey(this._hierFilter.field);
                this.byId("HierarchyFilterValue").setValue(this._hierFilter.value || "");
            } else {
                // Keep UI in sync with state
                this.byId("HierarchyFilterLevel").setSelectedKey(this._hierFilter.field);
                this.byId("HierarchyFilterValue").setValue(this._hierFilter.value || "");
            }

            this._hierFilterDialog.open();
        },

        _applyAllFilters: function () {
            const oModel = this.getView().getModel("tree");
            const allNodes = oModel.getProperty("/nodesAll") || [];

            // Clone so we never mutate master
            let working = JSON.parse(JSON.stringify(allNodes));

            // 1) Hierarchy filter (if value present)
            const hv = (this._hierFilter?.value || "").trim();
            if (hv) {
                const field = this._hierFilter.field;
                const q = hv.toLowerCase();

                const matchHierarchy = (node) => {
                    const v = (node[field] || "").toString().toLowerCase();
                    return v.includes(q);
                };

                working = this._filterTree(working, matchHierarchy);
            }

            // (Optional) Part number search filter if you already implemented it
            // If you have a SearchField and keep its value in this._pnQuery, apply it here.
            if (this._pnQuery && this._pnQuery.trim()) {
                const pq = this._pnQuery.trim().toLowerCase();
                const matchPN = (node) => {
                    if (node.Kind !== "Product") return false;
                    return ((node.PricelistPartNumber || "").toLowerCase().includes(pq));
                };
                working = this._filterTree(working, matchPN);
            }

            oModel.setProperty("/nodes", working);
        },

        _filterTree: function (nodes, predicate) {
            const result = [];

            for (const n of (nodes || [])) {
                if (n.Kind === "Product") {
                    if (predicate(n)) result.push({ ...n, children: [] });
                } else if (n.Kind === "Category") {
                    const filteredChildren = this._filterTree(n.children || [], predicate);

                    // Keep category if any child matches OR category itself matches hierarchy predicate
                    // (This makes hierarchy filter intuitive when clicking higher level)
                    const keepCategory = predicate(n) || filteredChildren.length > 0;

                    if (keepCategory) {
                        result.push({ ...n, children: filteredChildren });
                    }
                }
            }

            return result;
        },

        // Toggle Expand or Collapse Button Logic
        onToggleExpandCollapse: function () {
            const oTable = this.byId("ProductsTreeTable");
            const oBtn = this.byId("ProductsTreeExpandCollapseBtn");

            if (!oTable) {
                return;
            }

            if (this._isTreeExpanded) {
                // Collapse all
                oTable.collapseAll();
                this._isTreeExpanded = false;

                oBtn.setText("Expand");
                oBtn.setIcon("sap-icon://expand-all");
                oBtn.setTooltip("Expand all");
            } else {
                // Expand all
                oTable.expandToLevel(99); // expands all levels safely
                this._isTreeExpanded = true;

                oBtn.setText("Collapse");
                oBtn.setIcon("sap-icon://collapse-all");
                oBtn.setTooltip("Collapse all");
            }
        },

        _flattenProductsFromTree: function (nodes, result = []) {
            (nodes || []).forEach(n => {
                if (n.Kind === "Product") {
                    result.push({
                        MainCategory: n.MainCategory || "",
                        Subcategory1: n.Subcategory1 || "",
                        Subcategory2: n.Subcategory2 || "",
                        Subcategory3: n.Subcategory3 || "",
                        Subcategory4: n.Subcategory4 || "",
                        Subcategory5: n.Subcategory5 || "",
                        PricelistPartNumber: n.PricelistPartNumber || "",
                        PartNumberDescrLong: n.PartNumberDescrLong || "",
                        MaterialStatus: n.MaterialStatus || "",
                        MaterialStatusEffecDate: n.MaterialStatusEffecDate || "",
                        Price: n.Price || "",
                        PriceUnit: n.PriceUnit || "",
                        DiscountRate: n.DiscountRate || "",
                        DiscountEffectiveDate: n.DiscountEffectiveDate || "",
                        MainCategoryTermsandCond: n.MainCategoryTermsandCond || "",
                        SubCategory1TermsandCond: n.SubCategory1TermsandCond || "",
                        SubCategory2TermsandCond: n.SubCategory2TermsandCond || "",
                        SubCategory3TermsandCond: n.SubCategory3TermsandCond || "",
                        SubCategory4TermsandCond: n.SubCategory4TermsandCond || "",
                        SubCategory5TermsandCond: n.SubCategory5TermsandCond || "",
                        PartNumberTermsandCond: n.PartNumberTermsandCond || ""

                    });
                } else if (n.children && n.children.length) {
                    this._flattenProductsFromTree(n.children, result);
                }
            });
            return result;
        },

        // Export Button Logic
        onExportExcel: function () {
            const oModel = this.getView().getModel("tree");
            const nodes = oModel.getProperty("/nodes") || [];

            const rows = this._flattenProductsFromTree(nodes);

            if (rows.length === 0) {
                MessageToast.show("No products to export.");
                return;
            }

            const aColumns = [
                { label: "Main Category", property: "MainCategory" },
                { label: "Subcategory 1", property: "Subcategory1" },
                { label: "Subcategory 2", property: "Subcategory2" },
                { label: "Subcategory 3", property: "Subcategory3" },
                { label: "Subcategory 4", property: "Subcategory4" },
                { label: "Subcategory 5", property: "Subcategory5" },
                { label: "Pricelist Part Number", property: "PricelistPartNumber" },
                { label: "Pricelist Part Number Description", property: "PartNumberDescr" },
                { label: "Material Status", property: "MaterialStatus" },
                { label: "Material Status Effective Date", property: "MaterialStatusEffecDate" },
                { label: "Price", property: "Price" },
                { label: "Price Unit", property: "PriceUnit" },
                { label: "Discount Rate", property: "DiscountRate" },
                { label: "Discount Effective Date", property: "DiscountEffectiveDate" },
                { label: "Main Category TermsandCond", property: "MainCategoryTermsandCond" },
                { label: "SubCategory 1 TermsandCond", property: "SubCategory1TermsandCond" },
                { label: "SubCategory 2 TermsandCond", property: "SubCategory2TermsandCond" },
                { label: "SubCategory 3 TermsandCond", property: "SubCategory3TermsandCond" },
                { label: "SubCategory 4 TermsandCond", property: "SubCategory4TermsandCond" },
                { label: "SubCategory 5 TermsandCond", property: "SubCategory5TermsandCond" },
                { label: "Part Number TermsandCond", property: "PartNumberTermsandCond" }
            ];

            const oSheet = new Spreadsheet({
                workbook: {
                    columns: aColumns
                },
                dataSource: rows,
                fileName: `Products_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
            });

            oSheet.build().finally(() => {
                oSheet.destroy();
            });

            MessageToast.show(`${rows.length} product(s) exported.`);
        },

        // Upload Excel Logic
        onUploadExcel: function () {
            const oRootCtx = this._getRootPricelistContext()
            const headerData = oRootCtx.getObject();

            const oFileUploader = new FileUploader({
                width: "100%",
                placeholder: "Choose a file...",
                buttonText: "Browse",
                fileType: ["xlsx", "xls"],
                change: (oEvent) => {
                    this._file = oEvent.getParameter("files")[0];
                    if (this._file) {
                        MessageToast.show("Selected file: " + this._file.name);
                        oUploadButton.setEnabled(true);
                    }
                }
            });

            const oUploadButton = new Button({
                text: "Upload",
                type: "Emphasized",
                enabled: false,
                press: () => {
                    if (!this._file) {
                        MessageToast.show("Please select a file first.");
                        return;
                    }

                    sap.ui.core.BusyIndicator.show(0);

                    const oReader = new FileReader();
                    oReader.onload = async (e) => {
                        const base64 = e.target.result.split(",")[1];
                        const oModel = oRootCtx.getModel();

                        try {
                            const oOperation = oModel.bindContext("/MassUploadItemTermsandConditions(...)");

                            oOperation.setParameter("file", base64);
                            oOperation.setParameter("TradeScenario", headerData.TradeScenario);
                            oOperation.setParameter("MarketScopeRegion", headerData.MarketScopeRegion);
                            oOperation.setParameter("MarketScopeCountry", headerData.MarketScopeCountry);
                            oOperation.setParameter("SalesOrg", headerData.SalesOrg);
                            oOperation.setParameter("DistChannel", headerData.DistChannel);
                            oOperation.setParameter("CustPriceList", headerData.CustPriceList);
                            oOperation.setParameter("CustGroup1", headerData.CustGroup1);
                            oOperation.setParameter("ErpCustomer", headerData.ErpCustomer);
                            oOperation.setParameter("DeliveringPlant", headerData.DeliveringPlant);

                            await oOperation.execute();

                            const oContext = oOperation.getBoundContext();
                            const result = oContext.getObject();
                            const rows = result.items || [];
                            const nodes = buildTree(rows);

                            this.getView().getModel("tree").setProperty("/nodes", nodes);
                            this.getView().getModel("tree").setProperty("/nodesAll", JSON.parse(JSON.stringify(nodes)));

                            MessageToast.show("Upload successful.");

                            if (oModel) {
                                await oModel.refresh(); // force re-read ข้อมูลระบบหลัก
                            }

                            if (oDialog) {
                                oDialog.close();
                            }

                        } catch (err) {
                            MessageToast.show("Upload failed: " + err.message);
                        } finally {
                            // ปิดตัวหมุนรอโหลดเมื่อทำงานเสร็จ
                            sap.ui.core.BusyIndicator.hide();
                        }
                    };

                    oReader.onerror = () => {
                        MessageToast.show("File reading failed.");
                        sap.ui.core.BusyIndicator.hide();
                    };

                    oReader.readAsDataURL(this._file);
                }
            });

            const oDialog = new Dialog({
                title: "Excel Upload",
                content: [oFileUploader],
                beginButton: oUploadButton,
                endButton: new Button({
                    text: "Cancel",
                    press: () => oDialog.close()
                })
            });

            oDialog.open();
        },

        _updateTermsUI: function () {
            const oModel = this.getView().getModel();
            //const isEditMode = oModel.getProperty("/isEditMode");
            const termsEditable = oModel.getProperty("/termsEditable");
            const hasSelection = oModel.getProperty("/hasSelection");

            // TextArea: editable only when editing terms and node selected
            // this.byId("TermsContentBox").setEditable(termsEditable && hasSelection);
        }
    });
});