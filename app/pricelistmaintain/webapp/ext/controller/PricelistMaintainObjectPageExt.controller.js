sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/MessageToast',
    'sap/m/MessageBox'
], function (ControllerExtension, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
	'use strict';

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
			},

			onPageReady: function () {

				this._productTreeSection = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID');
				this._productTreeTable = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID--ProductsTreeTable');

				_oInstance = this;

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
			const idPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";
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

		_onSelectionChangeDeleteMode: function (oEvent) {
			if (this._bSuppressSelectionChange) return;

			const idPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";
			MessageToast.show("Row Selection Change in Delete Mode:");
			const oTable = oEvent.getSource();
			const aSelectedIndices = oTable.getSelectedIndices();
			const oDeleteButton = sap.ui.getCore().byId(idPrefix + "ProductListDeleteBtn");

			// If user selected all rows, skip ancestor auto-selection to avoid unnecessary work
			try {
				const oBinding = oTable.getBinding && oTable.getBinding('rows');
				const iTotal = oBinding && typeof oBinding.getLength === 'function' ? oBinding.getLength() : null;
				if (iTotal && aSelectedIndices && aSelectedIndices.length === iTotal) {
					if (oDeleteButton) { oDeleteButton.setEnabled(aSelectedIndices.length > 0); }
					return;
				}
			} catch (e) {
				// ignore and continue
			}

			// get current tree roots from jsonModel
			const oView = this.getInstance().base.getView();
			const aRoots = oView ? (oView.getModel('jsonModel').getProperty("/productPriceList") || []) : [];

			// For each selected row, auto-select eligible ancestor nodes (parents with exactly one child)
			for (const idx of aSelectedIndices) {
				const ctx = oTable.getContextByIndex(idx);
				if (!ctx) continue;
				const obj = ctx.getObject && ctx.getObject();
				if (obj && obj.key) {
					this._autoSelectAncestorsForKey(oTable, aRoots, obj.key);
				}
			}

			// After potential auto-selection, ensure any category that is selected but has no selected leaf children
			// gets deselected (this handles user-deselection of the last child)
			const currentSelectedIndices = oTable.getSelectedIndices() || [];
			const selectedKeys = new Set();
			for (const i of currentSelectedIndices) {
				const c = oTable.getContextByIndex(i);
				if (c && c.getObject) {
					const o = c.getObject();
					if (o && o.key) selectedKeys.add(o.key);
				}
			}

			const indicesToRemove = [];
			for (const i of currentSelectedIndices) {
				const c = oTable.getContextByIndex(i);
				if (!c || !c.getObject) continue;
				const o = c.getObject();
				if (!o) continue;
				if (o.kind === 'Category') {
					const node = this._findNodeByKey(aRoots, o.key);
					if (!node) continue;
					const leafKeys = this._collectLeafKeys(node);
					// if none of the leaf keys are in selectedKeys, mark this category to be deselected
					let anySelected = false;
					for (const lk of leafKeys) {
						if (selectedKeys.has(lk)) { anySelected = true; break; }
					}
					if (!anySelected) {
						indicesToRemove.push(i);
					}
				}
			}

			if (indicesToRemove.length) {
				this._bSuppressSelectionChange = true;
				try {
					if (typeof oTable.removeSelectionInterval === 'function') {
						for (const idx of indicesToRemove) {
							oTable.removeSelectionInterval(idx, idx);
						}
					} else {
						// fallback: rebuild selection without the removed indices
						const remaining = currentSelectedIndices.filter(i => !indicesToRemove.includes(i));
						if (oTable.clearSelection) oTable.clearSelection();
						for (const r of remaining) {
							if (typeof oTable.addSelectionInterval === 'function') {
								oTable.addSelectionInterval(r, r);
							} else if (typeof oTable.setSelectedIndex === 'function') {
								oTable.setSelectedIndex(r);
							}
						}
					}
				} finally {
					this._bSuppressSelectionChange = false;
				}
			}

			// Enable delete button if anything selected
			if (oDeleteButton) { oDeleteButton.setEnabled((oTable.getSelectedIndices() || []).length > 0); }
		},

		// productsTreeRefresh: function () {
		// 	const oModel = this.getView().getModel();
		// 	const sPath = this.getView().getBindingContext().sPath + "/items";

		// 	oModel.bindList(sPath).requestContexts()
		// 		.then((aCtx) => {
		// 			if (aCtx.length == 0) {
		// 				console.log('No data found: ' + sPath );
		// 			} else {
		// 				const rows = aCtx.map(oCtx => oCtx.getObject())
		// 				const nodes = this._buildTree(rows);

		// 				const oTreeModel = this._productTreeSection?.getModel("tree");
		// 				oTreeModel?.setProperty("/nodes", nodes);
		//         		oTreeModel?.setProperty("/nodesAll", JSON.parse(JSON.stringify(nodes)));
		// 			}
		// 		})
		// 		.catch((oErr) => {
		// 			throw oErr;
		// 		});

		// },

		// _buildTree: function (rows) {
		// 	const byKey = new Map();
		// 	const roots = [];

		// 	const ensureCategoryNode = (key, text, parentKey, level, row) => {
		// 		if (!byKey.has(key)) {

		// 			// Build category field values from the selected full key path ("Main 1 / Sub 1 / Sub 2"..)
		// 			const parts = key.split(" / ");

		// 			const node = {
		// 				key,
		// 				text,
		// 				kind: "Category",
		// 				level,
		// 				children: [],

		// 				// Store hierarchy fields so create-under-node can prefill the values correctly.
		// 				MainCategory: parts[0] || null,
		// 				Subcategory1: parts[1] || null,
		// 				Subcategory2: parts[2] || null,
		// 				Subcategory3: parts[3] || null,
		// 				Subcategory4: parts[4] || null,
		// 				Subcategory5: parts[5] || null
		// 			};

		// 			byKey.set(key, node);

		// 			if (parentKey && byKey.has(parentKey)) {
		// 				byKey.get(parentKey).children.push(node);
		// 			} else {
		// 				roots.push(node);
		// 			}
		// 		}
		// 		return byKey.get(key);
		// 	};

		// 	for (const r of rows) {
		// 		const parts = H_FIELDS.map(f => norm(r[f])).filter(Boolean);
		// 		if (!parts.length) continue;

		// 		let path = "";
		// 		let parentPath = null;

		// 		for (let i = 0; i < parts.length; i++) {
		// 			path = path ? `${path} / ${parts[i]}` : parts[i];
		// 			ensureCategoryNode(path, parts[i], parentPath, i + 1);
		// 			parentPath = path;
		// 		}

		// 		const leaf = {
		// 			key: "P:" + r.ID,
		// 			text: r.PricelistPartNumber || "(No Part Number)",
		// 			kind: "Product",
		// 			...r,
		// 			children: []
		// 		};
		// 		byKey.get(parentPath).children.push(leaf);
		// 	}

		// 	return roots;
		// }
	});
});
