sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/MessageToast',
    'sap/m/MessageBox'
], function (ControllerExtension, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
	'use strict';

	const idTreePrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

	/** Functions for building the tree table (UI Level) **/
	const H_FIELDS = ["MainCategory", "SubCategory1", "SubCategory2", "SubCategory3", "SubCategory4", "SubCategory5"];

	let _oInstance = null;

	function norm(v) {
		return (v == null) ? "" : String(v).trim();
	}

	return ControllerExtension.extend('pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				// var oModel = this.base.getExtensionAPI().getModel();

				const oView = this.base.getView();
				oView.setModel(new JSONModel(), "jsonModel");

				// initialize UI mode flags
				const oJson = oView.getModel('jsonModel');
				if (oJson) {
					oJson.setProperty('/isDeleteMode', false);
					oJson.setProperty('/isReorderMode', false);
					// showReset true when neither mode active
					oJson.setProperty('/showReset', true);
					// ensure product list exists
					oJson.setProperty('/productPriceList', oJson.getProperty('/productPriceList') || []);
				}
				
				oView.getModel('jsonModel').setProperty("/isDeleteMode", false);
				oView.getModel('jsonModel').setProperty("/isReorderMode", false);

				// initialize deletion snapshot stack and original snapshot holder
				this._deletedSnapshots = [];
				this._originalSnapshot = null;
			},

			onPageReady: function () {

				this._productTreeSection = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID');
				this._productTreeTable = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID--ProductsTreeTable');

				_oInstance = this;
				// ensure toggles are disabled if there's no data
				this._updateModeToggleEnabled();


				// this._getProductPriceList();

				// this._productTreeTable.collapseAll();
				// this.productsTreeRefresh();

			}
		},

		getInstance: function () { return _oInstance; },

		_getProductPriceList: function () {
			const oView = this.base.getView();

			// Temp Mock Data
			// var aRawData = this._getMockData();
			// const aTreeData = this._buildTree(aRawData);
			// oView.getModel('jsonModel').setProperty("/productPriceList", aTreeData);

			// const oData = this.base.getView().getBindingContext().getObject();

			// const aFilterConfig = [
			// 	{ path: "TradeScenario", value: oData?.TradeScenario },
			// 	{ path: "MarketScopeRegion", value: oData?.MarketScopeRegion },
			// 	{ path: "MarketScopeCountry", value: oData?.MarketScopeCountry },
			// 	{ path: "SalesOrg", value: oData?.SalesOrg },
			// 	{ path: "DistChannel", value: oData?.DistChannel },
			// 	{ path: "CustPriceList", value: oData?.CustPriceList },
			// 	{ path: "CustGroup1", value: oData?.CustGroup1 },
			// 	{ path: "ErpCustomer", value: oData?.ErpCustomer },
			// 	{ path: "DeliveringPlant", value: oData?.DeliveringPlant }
			// ];

			// const aFilters = [];
			// aFilterConfig.forEach(item => {
			// 	if (item.value !== undefined && item.value !== null && item.value !== "") {
			// 		aFilters.push(new Filter(item.path, FilterOperator.EQ, item.value));
			// 	}
			// });

			// debugger;

			// oView.getModel().bindList("/ProductPricelistTree", null, null, aFilters)
			// 	.requestContexts()
			// 	.then((aContexts) => {
			// 		aRawData = aContexts.map(oCtx => oCtx.getObject());
			// 		const aTreeData = this._buildTree(aRawData);
			// 		oView.getModel('jsonModel').setProperty("/productPriceList", aTreeData);
			// 	}).catch((oErr) => {
			// 		console.error("Error fetching ProductPricelistTree data:", oErr);
			// 	});

			//---------------------------------  After this adapt code				
			const sPath = oView.getBindingContext().getPath();

			return oView.getModel()
				.bindContext(sPath, null, {
					$select: ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry",
						"SalesOrg", "DistChannel", "CustPriceList", "CustGroup1",
						"ErpCustomer", "DeliveringPlant"].join(",")
				})
				.requestObject()
				.then((oData) => {
					debugger;
					const aFilters = [
						{ path: "TradeScenario", value: oData?.TradeScenario },
						{ path: "MarketScopeRegion", value: oData?.MarketScopeRegion },
						{ path: "MarketScopeCountry", value: oData?.MarketScopeCountry },
						{ path: "SalesOrg", value: oData?.SalesOrg },
						{ path: "DistChannel", value: oData?.DistChannel },
						{ path: "CustPriceList", value: oData?.CustPriceList },
						{ path: "CustGroup1", value: oData?.CustGroup1 },
						{ path: "ErpCustomer", value: oData?.ErpCustomer },
						{ path: "DeliveringPlant", value: oData?.DeliveringPlant }
					]
						.filter(item => item.value !== undefined && item.value !== null && item.value !== "")
						.map(item => new Filter(item.path, FilterOperator.EQ, item.value));

					return oView.getModel()
						.bindList("/ProductPricelistTree", null, null, aFilters)
						.requestContexts(0, 5000);
				})
				.then((aContexts) => {
					return aContexts.map(oCtx => oCtx.getObject());
				})
				.catch((oErr) => {
					console.error("Error fetching ProductPricelistTree data:", oErr);
					return [];
				});
		},

		_setTreeTableData: function (aData) {
			const oView = this.base.getView();
			const aTreeData = this._buildTree(aData);
			oView.getModel('jsonModel').setProperty("/productPriceList", aTreeData);
			// update toggle enablement depending on presence of data
			this._updateModeToggleEnabled();
		},

		_buildTree: function (rows) {
			const byKey = new Map();
			const roots = [];

			const ensureCategoryNode = (key, text, parentKey, level, row) => {
				if (!byKey.has(key)) {
					const parts = key.split(" / ");

					const node = {
						key: key,
						text: text,       // This will display the category name (e.g., "Command Centre" or "Software Features")
						kind: "Category",
						level: level,
						children: [],

						// Maintain field names consistent with JSON
						MainCategory: parts[0] || null,
						SubCategory1: parts[1] || null,
						SubCategory2: parts[2] || null,
						SubCategory3: parts[3] || null,
						SubCategory4: parts[4] || null,
						SubCategory5: parts[5] || null
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
				// Filter out null/empty categories so the leaf attaches to the lowest available category
				const parts = H_FIELDS.map(f => norm(r[f])).filter(Boolean);
				if (!parts.length) continue;

				let path = "";
				let parentPath = null;

				// Build the category tree path
				for (let i = 0; i < parts.length; i++) {
					path = path ? `${path} / ${parts[i]}` : parts[i];
					ensureCategoryNode(path, parts[i], parentPath, i + 1, r);
					parentPath = path;
				}

				// FIXED: Updated leaf mapping to use Material properties from your JSON
				const leaf = {
					key: r?.MaterialKey, // Used MaterialKey for uniqueness
					text: r?.Material,
					kind: "Product",
					...r, // Spreads all properties (Material, MaterialKey, ID, etc.) into the node so columns can bind to them
					children: [] // Empty array tells the TreeTable this is a leaf node
				};

				byKey.get(parentPath).children.push(leaf);
			}

			return roots;
		},

		_addUpdateProductList: function (newList) {
			const oView = this.base.getView();
			const currentList = oView.getModel('jsonModel').getProperty("/productPriceList") || [];
			const updatedList = [...currentList];
			let hasChanges = false;

			newList.forEach(newItem => {
				const existingIndex = updatedList.findIndex(item => item.MaterialKey === newItem.MaterialKey);
				if (existingIndex !== -1) {
					// Do nothing
				} else {
					updatedList.push(newItem);
					hasChanges = true;
				}
			});

			if (hasChanges) { return { productList: updatedList, hasChanges: true }; }
		},

		_getMockData: function () {
			// Placeholder: Replace this entirely with your data fetching logic.
			return [
				{
					"ID": "2eb6bbec-3b31-4be6-9dce-2cb350657696",
					"MainCategory": "Command Centre",
					"SubCategory1": "Software Features",
					"SubCategory2": "System Interfaces",
					"MaterialKey": "2A8959ELECELGGLNZ",
					"Material": "2A8959",
					"MaterialDescription": "LICENSE COMPETENCIEs"
				}
				// ... rest of your JSON data
			];
		},

		_onSelectionChangeDisplayMode: function (oEvent) {
            //Demo code
            MessageToast.show("Row Selection Change:");
            const oTable = oEvent.getSource();
            const aSelectedIndices = oTable.getSelectedIndices();
            const oDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteBtn");
            const oResetButton = sap.ui.getCore().byId(idTreePrefix + "ProductListResetBtn");
            const oRefreshButton = sap.ui.getCore().byId(idTreePrefix + "ProductListRefreshBtn");

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
				this._setDeleteBtnState(true);
                // oRefreshButton.setEnabled(true);
                // oResetButton.setEnabled(true);
            } else {
				this._setDeleteBtnState(false);
                // oRefreshButton.setEnabled(false);
                // oResetButton.setEnabled(false);
            }
            // oTable.clearSelection();
		},

		// suppress re-entrant selection handling when we programmatically change selection
		_bSuppressSelectionChange: false,

		_findParentNode: function (roots, childKey) {
			for (const node of roots) {
				if (node.children && node.children.some(c => c && c.key === childKey)) {
					return node;
				}
				if (node.children && node.children.length) {
					const found = this._findParentNode(node.children, childKey);
					if (found) return found;
				}
			}
			return null;
		},

		_findNodeByKey: function (roots, key) {
			for (const node of roots) {
				if (node && node.key === key) return node;
				if (node.children && node.children.length) {
					const found = this._findNodeByKey(node.children, key);
					if (found) return found;
				}
			}
			return null;
		},

		_collectLeafKeys: function (node) {
			const leaves = [];
			const walk = (n) => {
				if (!n) return;
				if (n.kind === 'Product') {
					leaves.push(n.key);
					return;
				}
				if (n.children && n.children.length) {
					for (const c of n.children) walk(c);
				}
			};
			walk(node);
			return leaves;
		},

		_findRowIndexByKey: function (oTable, key) {
			let i = 0;
			while (true) {
				const ctx = oTable.getContextByIndex(i);
				if (!ctx) break;
				const obj = ctx.getObject && ctx.getObject();
				if (obj && obj.key === key) return i;
				i++;
			}
			return -1;
		},

		/**
		 * Keep UndoDelete button visibility/enable in sync with Delete button.
		 * bEnabled: boolean|undefined - if provided, sets enabled state on both buttons
		 * bVisible: boolean|undefined - if provided, sets visible state on both buttons
		 */
		_setDeleteBtnState: function (bEnabled, bVisible) {
			const oDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteBtn");
			const oUndoDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListUndoDeleteBtn");
			// set delete button enabled state if provided
			if (typeof bEnabled !== 'undefined') {
				if (oDeleteButton && typeof oDeleteButton.setEnabled === 'function') oDeleteButton.setEnabled(bEnabled);
			}
			// Undo button enabled only when there are deleted snapshots available
			const hasDeleted = Array.isArray(this._deletedSnapshots) && this._deletedSnapshots.length > 0;
			if (oUndoDeleteButton && typeof oUndoDeleteButton.setEnabled === 'function') oUndoDeleteButton.setEnabled(hasDeleted);
			// visibility control (explicit)
			if (typeof bVisible !== 'undefined') {
				if (oDeleteButton && typeof oDeleteButton.setVisible === 'function') oDeleteButton.setVisible(bVisible);
				if (oUndoDeleteButton && typeof oUndoDeleteButton.setVisible === 'function') oUndoDeleteButton.setVisible(bVisible);
			}
		},

		_updateModeToggleEnabled: function () {
			const oDeleteModeToggle = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteModeBtn");
			const oReorderModeToggle = sap.ui.getCore().byId(idTreePrefix + "ProductListReorderModeBtn");

			const oView = this.base && this.base.getView && this.base.getView();
			const editMode = oView.getModel('ui').getProperty('/editMode');

			if (editMode === 'Display') {
				// if display mode, toggles should be hidden
				oDeleteModeToggle.setVisible(false);
				oReorderModeToggle.setVisible(false);
				return;
			}

			const oJsonModel = oView?.getModel('jsonModel') || [];
			const aTree = oJsonModel?.getProperty('/productPriceList') || [];
			const bHasData = Array.isArray(aTree) && aTree.length > 0;

			oDeleteModeToggle.setEnabled(bHasData);
			oReorderModeToggle.setEnabled(bHasData);
		},

		_autoSelectAncestorsForKey: function (oTable, roots, childKey) {
			let parent = this._findParentNode(roots, childKey);
			while (parent) {
				// only auto-select if parent has exactly one child (the selected one)
				const childrenCount = (parent.children || []).filter(Boolean).length;
				if (childrenCount !== 1) break;

				const parentIndex = this._findRowIndexByKey(oTable, parent.key);
				if (parentIndex >= 0) {
					this._bSuppressSelectionChange = true;
					try {
						if (typeof oTable.addSelectionInterval === "function") {
							oTable.addSelectionInterval(parentIndex, parentIndex);
						} else if (typeof oTable.setSelectedIndex === "function") {
							oTable.setSelectedIndex(parentIndex);
						}
					} finally {
						this._bSuppressSelectionChange = false;
					}
				}

				// go up one level
				childKey = parent.key;
				parent = this._findParentNode(roots, childKey);
			}
		},

		// enhanced delete-mode selection handler: keep parents/children in sync
		_onSelectionChangeDeleteMode: function (oEvent) {
			if (this._bSuppressSelectionChange) return;

			const oTable = oEvent.getSource();
			const aSelectedIndices = oTable.getSelectedIndices() || [];
			const oDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteBtn");
			const oView = this.getInstance().getView();
			const aRoots = oView ? (oView.getModel('jsonModel').getProperty("/productPriceList") || []) : [];

			// build set of currently selected keys
			const selectedKeys = new Set();
			for (const idx of aSelectedIndices) {
				const ctx = oTable.getContextByIndex(idx);
				if (!ctx) continue;
				const obj = ctx.getObject && ctx.getObject();
				if (obj && obj.key) selectedKeys.add(obj.key);
			}

			// detect user-clicked row/context (if available)
			const oRowCtx = oEvent.getParameter && oEvent.getParameter('rowContext');
			const clickedKey = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject().key : null;
			const clickedKind = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject().kind : null;

			// helper: apply selection by keys to the table
			const applySelectionKeys = (keysSet) => {
				if (oTable.clearSelection) oTable.clearSelection();
				let i = 0;
				while (true) {
					const ctx = oTable.getContextByIndex(i);
					if (!ctx) break;
					const obj = ctx.getObject && ctx.getObject();
					if (obj && obj.key && keysSet.has(obj.key)) {
						if (typeof oTable.addSelectionInterval === "function") {
							oTable.addSelectionInterval(i, i);
						} else if (typeof oTable.setSelectedIndex === "function") {
							oTable.setSelectedIndex(i);
						}
					}
					i++;
				}
			};

			// If user clicked a Category row explicitly, toggle/select/deselect all its leaf children
			if (clickedKind === 'Category' && clickedKey) {
				const catNode = this._findNodeByKey(aRoots, clickedKey);
				if (catNode) {
					const leafKeys = this._collectLeafKeys(catNode);
					if (selectedKeys.has(clickedKey)) {
						// category selected -> ensure all its leaves are selected
						for (const k of leafKeys) selectedKeys.add(k);
					} else {
						// category deselected -> remove children from selection
						for (const k of leafKeys) selectedKeys.delete(k);
					}
				}
			}

			// compute parent selection by traversing all category nodes: if all leaf descendants
			// of a category are selected then select the category; otherwise deselect it.
			const traverseAndMarkParents = (nodes) => {
				if (!nodes || !nodes.length) return;
				for (const n of nodes) {
					if (!n) continue;
					if (n.kind === 'Category') {
						const leafKeys = this._collectLeafKeys(n);
						if (leafKeys.length > 0) {
							const allChildrenSelected = leafKeys.every(k => selectedKeys.has(k));
							if (allChildrenSelected) selectedKeys.add(n.key);
							else selectedKeys.delete(n.key);
						}
					}
					// recurse into children categories
					if (n.children && n.children.length) traverseAndMarkParents(n.children);
				}
			};
			traverseAndMarkParents(aRoots);

			// apply computed selection to table while suppressing recursive handlers
			this._bSuppressSelectionChange = true;
			try {
				applySelectionKeys(selectedKeys);
			} finally {
				this._bSuppressSelectionChange = false;
			}

			// update delete button state
			const finalCount = (oTable.getSelectedIndices() || []).length;
			this._setDeleteBtnState(finalCount > 0);
		},

		/**
		 * Delete selected nodes from jsonModel but keep a snapshot for undo.
		 */
		onDelete: function () {
			const oTable = sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");
			if (!oTable) return;

			const aSelectedIndices = oTable.getSelectedIndices() || [];
			if (!aSelectedIndices.length) {
				MessageToast.show("No rows selected to delete.");
				return;
			}

			// take snapshot (deep clone) before modifying
			const oView = this.base.getView();
			const aCurrentTree = oView.getModel('jsonModel').getProperty("/productPriceList") || [];
			const aSnapshot = JSON.parse(JSON.stringify(aCurrentTree));
			// store original snapshot on first delete so Reset can restore the pre-delete state
			if (!this._originalSnapshot) {
				this._originalSnapshot = JSON.parse(JSON.stringify(aSnapshot));
			}
			this._deletedSnapshots.push(aSnapshot);

			// collect keys to remove (for categories or products)
			const keysToRemove = new Set();
			for (const idx of aSelectedIndices) {
				const ctx = oTable.getContextByIndex(idx);
				if (!ctx) continue;
				const obj = ctx.getObject && ctx.getObject();
				if (obj && obj.key) keysToRemove.add(obj.key);
			}

			// filter tree removing nodes whose key is in keysToRemove (recursively)
			const filterTree = (nodes) => {
				if (!nodes || !nodes.length) return [];
				return nodes
					.map(n => {
						if (keysToRemove.has(n.key)) return null;
						const nn = Object.assign({}, n);
						nn.children = filterTree(nn.children || []);
						return nn;
					})
					.filter(Boolean);
			};

			const aNewTree = filterTree(aCurrentTree);
		oView.getModel('jsonModel').setProperty("/productPriceList", aNewTree);

			// clear table selection and update delete button
			if (oTable.clearSelection) oTable.clearSelection();
			this._setDeleteBtnState(false);
			// ensure toggles reflect presence/absence of data
			this._updateModeToggleEnabled();

			MessageToast.show("Selected items removed (undo available).");
		},

		onUndoDelete: function () {
			if (!this._deletedSnapshots || !this._deletedSnapshots.length) {
				MessageToast.show("No deletion to restore.");
				return;
			}
			const last = this._deletedSnapshots.pop();
			const oView = this.base.getView();
			oView.getModel('jsonModel').setProperty("/productPriceList", last);

			// ensure toggles reflect presence/absence of data after restore
			this._updateModeToggleEnabled();

			// refresh UI selection state
			const oTable = sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");
			if (oTable && oTable.clearSelection) oTable.clearSelection();
			this._setDeleteBtnState(false);

			MessageToast.show("Deletion is undone.");
		},

		/**
		 * Reset entire tree to original state (before any deletes).
		 */
		onResetPrice: function () {
			const oView = this.base.getView();
			if (this._originalSnapshot) {
				oView.getModel('jsonModel').setProperty("/productPriceList", JSON.parse(JSON.stringify(this._originalSnapshot)));
				this._deletedSnapshots = [];
				const oTable = sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");
				if (oTable && oTable.clearSelection) oTable.clearSelection();
				this._setDeleteBtnState(false, false);
				// ensure toggles reflect presence/absence of data after reset
				this._updateModeToggleEnabled();
				MessageToast.show("Pricelist reset to original state.");
				return;
			}

			// fallback: if no original snapshot, fetch from backend
			MessageToast.show("No original snapshot available; fetching from server...");
			this._getProductPriceList()
				.then((aRawData) => {
					this._setTreeTableData(aRawData);
					MessageToast.show("Pricelist refreshed from server.");
				})
				.catch((e) => {
					console.error(e);
					MessageToast.show("Failed to refresh pricelist.");
				});
		},

		// (other helper stubs commented)
	});
});
