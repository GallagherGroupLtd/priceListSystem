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

					oJson.setProperty('/showReset', true);

					oJson.setProperty('/productPriceList', oJson.getProperty('/productPriceList') || []);
					oJson.setProperty('/originalProductPriceList', oJson.getProperty('/originalProductPriceList') || []);
					oJson.setProperty('/selectedKeys', []);
					oJson.setProperty('/pendingDeletedIds', []);
				}

				oView.getModel('jsonModel').setProperty("/isDeleteMode", false);
				oView.getModel('jsonModel').setProperty("/isReorderMode", false);

				// initialize deletion snapshot stack and original snapshot holder
				this._deletedSnapshots = [];
				this._originalSnapshot = null;

				this._initProductDetailSectionState();
			},

			onPageReady: function () {

				this._productTreeSection = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID');
				this._productTreeTable = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductPriceListTreeTable');

				_oInstance = this;
				// ensure toggles are disabled if there's no data
				this._updateModeToggleEnabled();

				// this._getProductPriceList();

				// this._productTreeTable.collapseAll();
				// this.productsTreeRefresh();

				this._bindProductDetailSubSections();
				this._clearProductDetailSections();
				this._updateProductListNavButtonState({
					singleSelected: false,
					deleteMode: false,
					reorderMode: false
				});

			},
			editFlow: {
				onBeforeSave: async function (mParameters) {
					const oView = this.base.getView();
					const oJsonModel = oView.getModel("jsonModel");

					if (!oJsonModel) {
						return;
					}

					const aPendingDeletedIds = oJsonModel.getProperty("/pendingDeletedIds") || [];

					if (!aPendingDeletedIds.length) {
						return;
					}

					const aOriginalTree = oJsonModel.getProperty("/originalProductPriceList") || [];
					const aIdsToDelete = this._getTopLevelDeletedIds(aPendingDeletedIds, aOriginalTree);

					if (!aIdsToDelete.length) {
						return;
					}

					try {
						await this._persistPendingDeletes(aIdsToDelete, mParameters && mParameters.context);
					} catch (oError) {
						console.error("Failed to persist deleted items", oError);
						MessageBox.error("Cannot save deleted items. Save was cancelled.");

						return Promise.reject(oError);
					}
				},

				onAfterSave: function () {
					const oView = this.base.getView();
					const oJsonModel = oView.getModel("jsonModel");

					if (!oJsonModel) {
						return;
					}

					const aCurrentTree = oJsonModel.getProperty("/productPriceList") || [];

					oJsonModel.setProperty("/pendingDeletedIds", []);
					oJsonModel.setProperty("/selectedKeys", []);
					oJsonModel.setProperty("/originalProductPriceList", JSON.parse(JSON.stringify(aCurrentTree)));

					this._deletedSnapshots = [];
					this._originalSnapshot = JSON.parse(JSON.stringify(aCurrentTree));
					this._setDeleteBtnState(false, false);
				},

				onBeforeDiscard: function () {
					const oView = this.base.getView();
					const oJsonModel = oView.getModel("jsonModel");

					if (!oJsonModel) {
						return;
					}

					const aOriginalTree = oJsonModel.getProperty("/originalProductPriceList") || [];

					oJsonModel.setProperty("/productPriceList", JSON.parse(JSON.stringify(aOriginalTree)));
					oJsonModel.setProperty("/pendingDeletedIds", []);
					oJsonModel.setProperty("/selectedKeys", []);

					this._deletedSnapshots = [];
					this._setDeleteBtnState(false, false);
				}
			}
		},

		getInstance: function () { return _oInstance; },

		_getProductPriceList: function () {
			const oView = this.base.getView();
			const oModel = oView.getModel();
			const oContext = oView.getBindingContext();

			if (!oContext) {
				return Promise.resolve([]);
			}

			const sPath = oContext.getPath();

			return oModel
				.bindContext(sPath, null, {
					$select: [
						"PricelistType",
						"MarketScopeRegion",
						"MarketScopeCountry",
						"SalesOrg",
						"DistChannel",
						"CustPriceList",
						"CustGroup1",
						"ErpCustomer",
						"DeliveringPlant"
					].join(",")
				})
				.requestObject()
				.then((oData) => {
					const aFilters = [
						{ path: "PricelistType", value: oData?.PricelistType },
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

					return oModel
						.bindList("/ProductPricelistTree", null, null, aFilters)
						.requestContexts(0, 5000);
				})
				.then((aContexts) => {
					return aContexts.map(oCtx => oCtx.getObject());
				});
		},

		// _setTreeTableData: function (aData) {
		// 	const oView = this.base.getView();
		// 	const oJsonModel = oView.getModel('jsonModel');

		// 	const aTreeData = Array.isArray(aData) && aData.length ? this._buildTreeFromFlatData(aData) : this._getMockData();

		// 	oJsonModel.setProperty("/productPriceList", aTreeData);
		// 	oJsonModel.setProperty("/originalProductPriceList", JSON.parse(JSON.stringify(aTreeData)));
		// 	oJsonModel.setProperty("/pendingDeletedIds", []);
		// 	oJsonModel.setProperty("/selectedKeys", []);

		// 	this._deletedSnapshots = [];
		// 	this._originalSnapshot = JSON.parse(JSON.stringify(aTreeData));

		// 	this._updateModeToggleEnabled();
		// },

		_setTreeTableData: function (aFlatData) {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			const aTreeData = Array.isArray(aFlatData) && aFlatData.length
				? this._buildTreeFromFlatData(aFlatData)
				: [];

			oJsonModel.setProperty("/productPriceList", aTreeData);
			oJsonModel.setProperty("/originalProductPriceList", JSON.parse(JSON.stringify(aTreeData)));
			oJsonModel.setProperty("/pendingDeletedIds", []);
			oJsonModel.setProperty("/selectedKeys", []);

			this._deletedSnapshots = [];
			this._originalSnapshot = JSON.parse(JSON.stringify(aTreeData));

			oJsonModel.updateBindings(true);

			this._setDeleteBtnState(false);
			this._updateModeToggleEnabled();

			this._clearProductDetailSections();
			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: false,
				reorderMode: false
			});
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
						Kind: "Category",
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
					Kind: "Product",
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

		_buildTreeFromFlatData: function (flatData) {
			const tree = [];
			const nodeMap = {};

			flatData.forEach((row, index) => {
				let parentNode = null;
				let currentPath = "";

				// Helper Function to build or retrieve an existing Category Node
				const addCategoryNode = (level, titleField, descField) => {
					const title = row[titleField];

					// If the category field is null or empty, skip creating a node for this level
					if (!title) return;

					// Create a unique path key (e.g., "Command Centre|Command Centre Licenses")
					currentPath += (currentPath ? "|" : "") + title;
					const nodeId = `cat-${level}-${currentPath.replace(/\s+/g, '-')}`;

					// If this category path hasn't been created yet, construct it
					if (!nodeMap[currentPath]) {
						const newNode = {
							ID: nodeId,
							PricelistType: row.PricelistType,
							MarketScopeRegion: row.MarketScopeRegion,
							MarketScopeCountry: row.MarketScopeCountry,
							SalesOrg: row.SalesOrg,
							DistChannel: row.DistChannel,
							CustPriceList: row.CustPriceList,
							CustGroup1: row.CustGroup1,
							ErpCustomer: row.ErpCustomer,
							DeliveringPlant: row.DeliveringPlant,

							Sequence: row.Sequence,
							OrderIndex: Object.keys(nodeMap).length + 1,
							Kind: "Category",
							CategoryLevel: level,
							Title: title,
							Description: row[descField] || null,

							// Categories do not hold specific price/discount data
							Price: null,
							PriceUnit: null,
							PriceValidFrom: null,
							PriceValidTo: null,
							DiscountRate: null,
							DiscountEffectiveFromDate: null,
							DiscountEffectiveToDate: null,
							PriceChangeIndicator: false,
							FuturePrice: null,
							FuturePriceValidFrom: null,
							FuturePriceValidTo: null,
							Status: null,
							StatusValidFromDate: null,
							StatusValidToDate: null,
							Supplier: null,
							SupplierSKU: null,

							// Parent-child relationship fields
							parent: parentNode ? { ID: parentNode.ID } : null,
							children: []
						};

						nodeMap[currentPath] = newNode;

						// Attach to parent's children array, or push to root tree if level 0
						if (parentNode) {
							parentNode.children.push(newNode);
						} else {
							tree.push(newNode);
						}
					}
					// Shift the parent pointer to the current category to prepare for the next level
					parentNode = nodeMap[currentPath];
				};

				// 1. Build Category Hierarchy (Level 0 -> 5)
				// It will automatically skip levels that are 'null' or empty, so products will attach to the nearest valid category above them
				addCategoryNode(0, "MainCategory", "MainCategoryLocal");
				addCategoryNode(1, "SubCategory1", "SubCategory1Local");
				addCategoryNode(2, "SubCategory2", "SubCategory2Local");
				addCategoryNode(3, "SubCategory3", "SubCategory3Local");
				addCategoryNode(4, "SubCategory4", "SubCategory4Local");
				addCategoryNode(5, "SubCategory5", "SubCategory5Local");

				// 2. Build Product (Leaf Node - Level 6)
				if (row.Material) {
					const productNode = {
						ID: row.ID || row.Material,
						PricelistType: row.PricelistType,
						MarketScopeRegion: row.MarketScopeRegion,
						MarketScopeCountry: row.MarketScopeCountry,
						SalesOrg: row.SalesOrg,
						DistChannel: row.DistChannel,
						CustPriceList: row.CustPriceList,
						CustGroup1: row.CustGroup1,
						ErpCustomer: row.ErpCustomer,
						DeliveringPlant: row.DeliveringPlant,

						Sequence: row.Sequence,
						OrderIndex: index + 1,
						Kind: "Product",
						CategoryLevel: 6, // Product level
						Title: row.Material,
						Description: row.MaterialDescription,

						// Map the actual Pricing and Condition data to the product
						AccessSequence: row.AccessSequence,
						ConditionType: row.ConditionType,
						Price: row.Price,
						PriceUnit: row.PriceUnit,
						PriceValidFrom: row.PriceValidFrom,
						PriceValidTo: row.PriceValidTo,
						DiscountRate: row.DiscountRate || null,
						DiscountEffectiveFromDate: row.DiscountEffectiveFromDate || null,
						DiscountEffectiveToDate: row.DiscountEffectiveToDate || null,
						PriceChangeIndicator: row.PriceChangeIndicator || false,
						FuturePrice: row.FuturePrice || null,
						FuturePriceValidFrom: row.FuturePriceValidFrom || null,
						FuturePriceValidTo: row.FuturePriceValidTo || null,
						Status: row.Status || null,
						StatusValidFromDate: row.StatusValidFromDate || null,
						StatusValidToDate: row.StatusValidToDate || null,
						Supplier: row.Supplier || null,
						SupplierSKU: row.SupplierSKU || null,

						parent: parentNode ? { ID: parentNode.ID } : null,
						children: [] // Products are leaf nodes and have no children
					};

					// Attach product to its deepest valid category
					if (parentNode) {
						parentNode.children.push(productNode);
					} else {
						// Fallback: If a product has no categories at all, put it at the root
						tree.push(productNode);
					}
				}
			});

			return tree;
		},

		_getMockData: function () {
			// Placeholder: Replace this entirely with your data fetching logic.
			return [
				{
					ID: "cat-main",
					PricelistType: "Global",
					MarketScopeRegion: "EMEA",
					MarketScopeCountry: "UK",
					SalesOrg: "0001",
					DistChannel: "01",
					CustPriceList: "CUST001",
					CustGroup1: "Retail",
					ErpCustomer: "1000",
					DeliveringPlant: "PL01",

					OrderIndex: 1,
					Kind: "Category",
					CategoryLevel: 0,
					Title: "Sample Main Category",
					Description: null,
					Price: null,
					PriceUnit: null,
					PriceValidFrom: null,
					PriceValidTo: null,
					DiscountRate: null,
					DiscountEffectiveFromDate: null,
					DiscountEffectiveToDate: null,
					PriceChangeIndicator: false,
					FuturePrice: null,
					FuturePriceValidFrom: null,
					FuturePriceValidTo: null,
					Status: null,
					StatusValidFromDate: null,
					StatusValidToDate: null,
					Supplier: null,
					SupplierSKU: null,

					parent: [],
					children: [
						{
							ID: "cat-1a",
							PricelistType: "Global",
							MarketScopeRegion: "EMEA",
							MarketScopeCountry: "UK",
							SalesOrg: "0001",
							DistChannel: "01",
							CustPriceList: "CUST001",
							CustGroup1: "Retail",
							ErpCustomer: "1000",
							DeliveringPlant: "PL01",

							OrderIndex: 1,
							Kind: "Category",
							CategoryLevel: 1,
							Title: "Sample SubCategory1 - A",
							Description: null,
							Price: null,
							PriceUnit: null,
							PriceValidFrom: null,
							PriceValidTo: null,
							DiscountRate: null,
							DiscountEffectiveFromDate: null,
							DiscountEffectiveToDate: null,
							PriceChangeIndicator: false,
							FuturePrice: null,
							FuturePriceValidFrom: null,
							FuturePriceValidTo: null,
							Status: null,
							StatusValidFromDate: null,
							StatusValidToDate: null,
							Supplier: null,
							SupplierSKU: null,

							parent: { ID: "cat-main" },
							children: [
								{
									ID: "prod-1",
									PricelistType: "Global",
									MarketScopeRegion: "EMEA",
									MarketScopeCountry: "UK",
									SalesOrg: "0001",
									DistChannel: "01",
									CustPriceList: "CUST001",
									CustGroup1: "Retail",
									ErpCustomer: "1000",
									DeliveringPlant: "PL01",

									OrderIndex: 1,
									Kind: "Product",
									CategoryLevel: 6,	//Product = leaf node
									Title: "C12345",
									Description: "Product Description",
									Price: "1500.00",
									PriceUnit: "GDP",
									PriceValidFrom: "2026-01-01",
									PriceValidTo: "2026-12-31",
									DiscountRate: "5",
									DiscountEffectiveFromDate: "2026-06-06",
									DiscountEffectiveToDate: "2026-06-08",
									PriceChangeIndicator: true,
									FuturePrice: "1600.00",
									FuturePriceValidFrom: "2027-01-01",
									FuturePriceValidTo: "9999-12-31",
									Status: "Status",
									StatusValidFromDate: null,
									StatusValidToDate: null,
									Supplier: null,
									SupplierSKU: null,

									parent: { ID: "cat-1a" },
									children: []	// leaf node, no children
								}
							]
						},
						{
							ID: "cat-1b",
							PricelistType: "Global",
							MarketScopeRegion: "EMEA",
							MarketScopeCountry: "UK",
							SalesOrg: "0001",
							DistChannel: "01",
							CustPriceList: "CUST001",
							CustGroup1: "Retail",
							ErpCustomer: "1000",
							DeliveringPlant: "PL01",

							OrderIndex: 2,
							Kind: "Category",
							CategoryLevel: 1,
							Title: "Sample SubCategory2 - B",
							Description: null,
							Price: null,
							PriceUnit: null,
							PriceValidFrom: null,
							PriceValidTo: null,
							DiscountRate: null,
							DiscountEffectiveFromDate: null,
							DiscountEffectiveToDate: null,
							PriceChangeIndicator: false,
							FuturePrice: null,
							FuturePriceValidFrom: null,
							FuturePriceValidTo: null,
							Status: null,
							StatusValidFromDate: null,
							StatusValidToDate: null,
							Supplier: null,
							SupplierSKU: null,

							parent: { ID: "cat-main" },
							children: [
								{
									ID: "cat-2",
									PricelistType: "Global",
									MarketScopeRegion: "EMEA",
									MarketScopeCountry: "UK",
									SalesOrg: "0001",
									DistChannel: "01",
									CustPriceList: "CUST001",
									CustGroup1: "Retail",
									ErpCustomer: "1000",
									DeliveringPlant: "PL01",

									OrderIndex: 1,
									Kind: "Category",
									CategoryLevel: 2,
									Title: "Sample SubCategory2",
									Description: null,
									Price: null,
									PriceUnit: null,
									PriceValidFrom: null,
									PriceValidTo: null,
									DiscountRate: null,
									DiscountEffectiveFromDate: null,
									DiscountEffectiveToDate: null,
									PriceChangeIndicator: false,
									FuturePrice: null,
									FuturePriceValidFrom: null,
									FuturePriceValidTo: null,
									Status: null,
									StatusValidFromDate: null,
									StatusValidToDate: null,
									Supplier: null,
									SupplierSKU: null,

									parent: { ID: "cat-1b" },
									children: [
										{
											ID: "prod-2",
											PricelistType: "Global",
											MarketScopeRegion: "EMEA",
											MarketScopeCountry: "UK",
											SalesOrg: "0001",
											DistChannel: "01",
											CustPriceList: "CUST001",
											CustGroup1: "Retail",
											ErpCustomer: "1000",
											DeliveringPlant: "PL01",

											OrderIndex: 1,
											Kind: "Product",
											CategoryLevel: 6,	//Product = leaf node
											Title: "C11111",
											Description: "Product 1 Description",
											Price: "1500.00",
											PriceUnit: "GDP",
											PriceValidFrom: "2026-01-01",
											PriceValidTo: "2026-12-31",
											DiscountRate: "5",
											DiscountEffectiveFromDate: "2026-06-06",
											DiscountEffectiveToDate: "2026-06-08",
											PriceChangeIndicator: false,
											FuturePrice: "1600.00",
											FuturePriceValidFrom: "2027-01-01",
											FuturePriceValidTo: "9999-12-31",
											Status: "Status",
											StatusValidFromDate: null,
											StatusValidToDate: null,
											Supplier: "Sup!",
											SupplierSKU: "SKU",

											parent: { ID: "cat-2" },
											children: []
										},
										{
											ID: "prod-3",
											PricelistType: "Global",
											MarketScopeRegion: "EMEA",
											MarketScopeCountry: "UK",
											SalesOrg: "0001",
											DistChannel: "01",
											CustPriceList: "CUST001",
											CustGroup1: "Retail",
											ErpCustomer: "1000",
											DeliveringPlant: "PL01",

											OrderIndex: 2,
											Kind: "Product",
											CategoryLevel: 6,	//Product = leaf node
											Title: "C22222",
											Description: "Product 1 Description",
											Price: "1500.00",
											PriceUnit: "GDP",
											PriceValidFrom: "2026-01-01",
											PriceValidTo: "2026-12-31",
											DiscountRate: "5",
											DiscountEffectiveFromDate: "2026-06-06",
											DiscountEffectiveToDate: "2026-06-08",
											PriceChangeIndicator: false,
											FuturePrice: "1600.00",
											FuturePriceValidFrom: "2027-01-01",
											FuturePriceValidTo: "9999-12-31",
											Status: "Status",
											StatusValidFromDate: null,
											StatusValidToDate: null,
											Supplier: "Sup!",
											SupplierSKU: "SKU",

											parent: { ID: "cat-2" },
											children: []
										}
									]
								}
							]
						}
					]
				}
			];
		},

		_onSelectionChangeDisplayMode: function () {
			this._setDeleteBtnState(false);
		},

		_getView: function (oControl) {
			let oC = oControl;
			while (oC) {
				if (oC.isA && oC.isA("sap.ui.core.mvc.View")) {
					return oC;
				}
				oC = oC.getParent && oC.getParent();
			}
			return null;
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
				if (n.Kind === 'Product') {
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
				// if display mode, toggles should be disabled
				oDeleteModeToggle.setEnabled(false);
				oReorderModeToggle.setEnabled(false);
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
		// _onSelectionChangeDeleteMode: function (oEvent) {
		// 	const oTable = oEvent.getSource();
		// 	const aSelectedIndices = oTable.getSelectedIndices() || [];
		// 	const oDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteBtn");
		// 	const oView = this.getInstance().getView();
		// 	const aRoots = oView ? (oView.getModel('jsonModel').getProperty("/productPriceList") || []) : [];

		// 	// build set of currently selected keys
		// 	const selectedKeys = new Set();
		// 	for (const idx of aSelectedIndices) {
		// 		const ctx = oTable.getContextByIndex(idx);
		// 		if (!ctx) continue;
		// 		const obj = ctx.getObject && ctx.getObject();
		// 		if (obj && obj.key) selectedKeys.add(obj.key);
		// 	}

		// 	// detect user-clicked row/context (if available)
		// 	const oRowCtx = oEvent.getParameter && oEvent.getParameter('rowContext');
		// 	const clickedKey = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject().key : null;
		// 	const clickedKind = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject().Kind : null;

		// 	// helper: apply selection by keys to the table
		// 	const applySelectionKeys = (keysSet) => {
		// 		if (oTable.clearSelection) oTable.clearSelection();
		// 		let i = 0;
		// 		while (true) {
		// 			const ctx = oTable.getContextByIndex(i);
		// 			if (!ctx) break;
		// 			const obj = ctx.getObject && ctx.getObject();
		// 			if (obj && obj.key && keysSet.has(obj.key)) {
		// 				if (typeof oTable.addSelectionInterval === "function") {
		// 					oTable.addSelectionInterval(i, i);
		// 				} else if (typeof oTable.setSelectedIndex === "function") {
		// 					oTable.setSelectedIndex(i);
		// 				}
		// 			}
		// 			i++;
		// 		}
		// 	};

		// 	// If user clicked a Category row explicitly, toggle/select/deselect all its leaf children
		// 	if (clickedKind === 'Category' && clickedKey) {
		// 		const catNode = this._findNodeByKey(aRoots, clickedKey);
		// 		if (catNode) {
		// 			const leafKeys = this._collectLeafKeys(catNode);
		// 			if (selectedKeys.has(clickedKey)) {
		// 				// category selected -> ensure all its leaves are selected
		// 				for (const k of leafKeys) selectedKeys.add(k);
		// 			} else {
		// 				// category deselected -> remove children from selection
		// 				for (const k of leafKeys) selectedKeys.delete(k);
		// 			}
		// 		}
		// 	}

		// 	// compute parent selection by traversing all category nodes: if all leaf descendants
		// 	// of a category are selected then select the category; otherwise deselect it.
		// 	const traverseAndMarkParents = (nodes) => {
		// 		if (!nodes || !nodes.length) return;
		// 		for (const n of nodes) {
		// 			if (!n) continue;
		// 			if (n.Kind === 'Category') {
		// 				const leafKeys = this._collectLeafKeys(n);
		// 				if (leafKeys.length > 0) {
		// 					const allChildrenSelected = leafKeys.every(k => selectedKeys.has(k));
		// 					if (allChildrenSelected) selectedKeys.add(n.key);
		// 					else selectedKeys.delete(n.key);
		// 				}
		// 			}
		// 			// recurse into children categories
		// 			if (n.children && n.children.length) traverseAndMarkParents(n.children);
		// 		}
		// 	};
		// 	traverseAndMarkParents(aRoots);

		// 	// apply computed selection to table while suppressing recursive handlers
		// 	this._bSuppressSelectionChange = true;
		// 	try {
		// 		applySelectionKeys(selectedKeys);
		// 	} finally {
		// 		this._bSuppressSelectionChange = false;
		// 	}

		// 	// update delete button state
		// 	const finalCount = (oTable.getSelectedIndices() || []).length;
		// 	this._setDeleteBtnState(finalCount > 0);
		// },

		_onSelectionChangeDeleteMode: function (oEvent) {
			if (this._bSuppressSelectionChange) return;

			const oTable = this._productTreeTable || oEvent.getSource();
			if (!oTable) return;

			const oView = this.getInstance().base.getView();
			const oModel = oView.getModel("jsonModel");
			const aRoots = oModel.getProperty("/productPriceList") || [];

			// Current table selection after user click
			const aSelectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];
			const selectedIds = new Set();

			for (const iIndex of aSelectedIndices) {
				const oContext = oTable.getContextByIndex(iIndex);
				if (!oContext) continue;

				const oRow = oContext.getObject && oContext.getObject();
				if (oRow && oRow.ID) {
					selectedIds.add(oRow.ID);
				}
			}

			// Detect clicked row
			const oRowCtx = oEvent.getParameter && oEvent.getParameter("rowContext");
			const oClickedRow = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject() : null;

			const clickedId = oClickedRow && oClickedRow.ID;
			const clickedKind = oClickedRow && oClickedRow.Kind;

			// If user clicked a Category, select/deselect all descendants
			if (clickedKind === "Category" && clickedId) {
				const oClickedNode = this._findNodeById(aRoots, clickedId);

				if (oClickedNode) {
					const aDescendantIds = this._collectDescendantIds(oClickedNode);

					if (selectedIds.has(clickedId)) {
						// Parent selected -> select all children/categories/products under it
						aDescendantIds.forEach(function (sId) {
							selectedIds.add(sId);
						});
					} else {
						// Parent deselected -> deselect everything under it
						aDescendantIds.forEach(function (sId) {
							selectedIds.delete(sId);
						});
					}
				}
			}

			// Bottom-up sync:
			// if all children of a category are selected, select the category.
			// otherwise deselect the category.
			const syncParentSelection = function (aNodes) {
				if (!Array.isArray(aNodes)) return;

				aNodes.forEach(function (oNode) {
					if (!oNode || !oNode.ID) return;

					const aChildren = oNode.children || [];

					if (aChildren.length) {
						syncParentSelection(aChildren);

						const bAllChildrenSelected = aChildren.every(function (oChild) {
							return selectedIds.has(oChild.ID);
						});

						if (bAllChildrenSelected) {
							selectedIds.add(oNode.ID);
						} else {
							selectedIds.delete(oNode.ID);
						}
					}
				});
			};

			syncParentSelection(aRoots);

			// Apply final selected IDs back to visible rows in TreeTable
			this._bSuppressSelectionChange = true;

			try {
				if (oTable.clearSelection) {
					oTable.clearSelection();
				}

				const oRowsBinding = oTable.getBinding("rows");
				const iLength = oRowsBinding && oRowsBinding.getLength
					? oRowsBinding.getLength()
					: 0;

				for (let i = 0; i < iLength; i++) {
					const oContext = oTable.getContextByIndex(i);
					if (!oContext) continue;

					const oRow = oContext.getObject && oContext.getObject();

					if (oRow && oRow.ID && selectedIds.has(oRow.ID)) {
						if (oTable.addSelectionInterval) {
							oTable.addSelectionInterval(i, i);
						} else if (oTable.setSelectedIndex) {
							oTable.setSelectedIndex(i);
						}
					}
				}
			} finally {
				this._bSuppressSelectionChange = false;
			}

			const aFinalSelectedIds = Array.from(selectedIds);

			oModel.setProperty("/selectedKeys", aFinalSelectedIds);

			const bHasSelection = aFinalSelectedIds.length > 0;
			this._setDeleteBtnState(bHasSelection, bHasSelection);
		},

		_findNodeById: function (aNodes, sId) {
			if (!Array.isArray(aNodes)) return null;

			for (const oNode of aNodes) {
				if (!oNode) continue;

				if (oNode.ID === sId) {
					return oNode;
				}

				const oFound = this._findNodeById(oNode.children || [], sId);
				if (oFound) {
					return oFound;
				}
			}

			return null;
		},

		_collectDescendantIds: function (oNode) {
			const aIds = [];

			const collect = function (aChildren) {
				if (!Array.isArray(aChildren)) return;

				aChildren.forEach(function (oChild) {
					if (!oChild || !oChild.ID) return;

					aIds.push(oChild.ID);
					collect(oChild.children || []);
				});
			};

			collect(oNode.children || []);

			return aIds;
		},

		onDelete: function () {
			const oTable = this._productTreeTable;
			if (!oTable) return;

			const oView = this.base.getView();
			const oModel = oView.getModel("jsonModel");

			const aCurrentTree = oModel.getProperty("/productPriceList") || [];
			const aSelectedIds = oModel.getProperty("/selectedKeys") || [];

			if (!aSelectedIds.length) {
				MessageToast.show("No rows selected to delete.");
				return;
			}

			const selectedIdSet = new Set(aSelectedIds);

			const aSnapshot = JSON.parse(JSON.stringify(aCurrentTree));

			if (!this._originalSnapshot) {
				this._originalSnapshot = JSON.parse(JSON.stringify(aSnapshot));
			}

			if (!this._deletedSnapshots) {
				this._deletedSnapshots = [];
			}

			this._deletedSnapshots.push({
				tree: aSnapshot,
				pendingDeletedIds: oModel.getProperty("/pendingDeletedIds") || []
			});

			const aPendingDeletedIds = oModel.getProperty("/pendingDeletedIds") || [];
			const pendingDeletedIdSet = new Set(aPendingDeletedIds);

			aSelectedIds.forEach(function (sId) {
				pendingDeletedIdSet.add(sId);
			});

			const filterTree = function (aNodes) {
				if (!Array.isArray(aNodes)) return [];

				return aNodes
					.map(function (oNode) {
						if (!oNode || !oNode.ID) return oNode;

						if (selectedIdSet.has(oNode.ID)) {
							return null;
						}

						const oCopy = Object.assign({}, oNode);
						oCopy.children = filterTree(oNode.children || []);

						return oCopy;
					})
					.filter(Boolean);
			};

			const aNewTree = filterTree(aCurrentTree);

			oModel.setProperty("/productPriceList", aNewTree);
			oModel.setProperty("/pendingDeletedIds", Array.from(pendingDeletedIdSet));
			oModel.setProperty("/selectedKeys", []);

			oModel.updateBindings(true);

			if (oTable.clearSelection) {
				oTable.clearSelection();
			}

			const oRowsBinding = oTable.getBinding("rows");
			if (oRowsBinding && oRowsBinding.refresh) {
				oRowsBinding.refresh(true);
			}

			this._setDeleteBtnState(false, false);
			this._updateModeToggleEnabled();

			MessageToast.show("Selected items removed. Changes will be saved when you press Save.");
		},

		onUndoDelete: function () {
			if (!this._deletedSnapshots || !this._deletedSnapshots.length) {
				MessageToast.show("No deletion to restore.");
				return;
			}

			const oSnapshot = this._deletedSnapshots.pop();
			const oView = this.base.getView();
			const oModel = oView.getModel('jsonModel');

			const aTree = Array.isArray(oSnapshot) ? oSnapshot : oSnapshot.tree;
			const aPendingDeletedIds = Array.isArray(oSnapshot) ? [] : (oSnapshot.pendingDeletedIds || []);

			oModel.setProperty("/productPriceList", JSON.parse(JSON.stringify(aTree)));
			oModel.setProperty("/pendingDeletedIds", aPendingDeletedIds);
			oModel.setProperty("/selectedKeys", []);

			this._updateModeToggleEnabled();

			const oTable = sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");
			if (oTable && oTable.clearSelection) {
				oTable.clearSelection();
			}

			this._setDeleteBtnState(false, false);

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

		_persistPendingDeletes: async function (aDeletedIds, oPageContext) {
			if (!Array.isArray(aDeletedIds) || !aDeletedIds.length) {
				return;
			}

			const oODataModel = this.base.getView().getModel();
			const oJsonModel = this.base.getView().getModel("jsonModel");
			const aOriginalTree = oJsonModel ? (oJsonModel.getProperty("/originalProductPriceList") || []) : [];

			for (const sId of aDeletedIds) {
				const oNode = this._findNodeById(aOriginalTree, sId);
				const sEntityPath = this._getDeleteEntityPath(sId, oNode, oPageContext);
				const oContext = oODataModel.bindContext(sEntityPath).getBoundContext();

				if (!oContext || !oContext.delete) {
					throw new Error("Cannot create delete context for " + sEntityPath);
				}

				await oContext.delete("$auto");
			}
		},

		_getDeleteEntityPath: function (sId, oNode, oPageContext) {
			// const aKeys = ["ID=" + this._quoteODataString(sId)];
			const aKeys = ["ID=" + sId];

			let bIsActiveEntity;

			if (oNode && typeof oNode.IsActiveEntity === "boolean") {
				bIsActiveEntity = oNode.IsActiveEntity;
			} else if (oPageContext && oPageContext.getObject) {
				const oPageObject = oPageContext.getObject();

				if (oPageObject && typeof oPageObject.IsActiveEntity === "boolean") {
					bIsActiveEntity = oPageObject.IsActiveEntity;
				}
			}

			if (typeof bIsActiveEntity === "boolean") {
				aKeys.push("IsActiveEntity=" + bIsActiveEntity);
			}

			return "/ProductPriceList(" + aKeys.join(",") + ")";
		},

		// _quoteODataString: function (sValue) {
		// 	return "'" + String(sValue).replace(/'/g, "''") + "'";
		// },

		_getTopLevelDeletedIds: function (aDeletedIds, aOriginalTree) {
			const oDeletedSet = new Set(aDeletedIds || []);
			const aResult = [];

			const walk = function (aNodes, bAncestorDeleted) {
				if (!Array.isArray(aNodes)) return;

				aNodes.forEach(function (oNode) {
					if (!oNode || !oNode.ID) return;

					const bThisDeleted = oDeletedSet.has(oNode.ID);

					if (bThisDeleted && !bAncestorDeleted) {
						aResult.push(oNode.ID);
					}

					walk(oNode.children || [], bAncestorDeleted || bThisDeleted);
				});
			};

			walk(aOriginalTree || [], false);

			return aResult.length ? aResult : Array.from(oDeletedSet);
		},

		_bindDetailSubSection: function (sSubSectionKey, sJsonPath) {
			const sPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::";
			const oSubSection = sap.ui.getCore().byId(sPrefix + sSubSectionKey);

			if (oSubSection && typeof oSubSection.bindElement === "function") {
				oSubSection.bindElement({
					path: sJsonPath,
					model: "jsonModel"
				});
			}
		},

		_getProductTreeModeState: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");
			const editMode = oView.getModel("ui").getProperty("/editMode");

			const bDisplayMode = editMode === "Display";

			return {
				editMode: editMode,
				displayMode: bDisplayMode,
				deleteMode: !bDisplayMode && !!oJsonModel.getProperty("/isDeleteMode"),
				reorderMode: !bDisplayMode && !!oJsonModel.getProperty("/isReorderMode")
			};
		},

		_handleProductTreeSelectionChange: function (oEvent) {
			const oTable = oEvent.getSource();
			const mMode = this._getProductTreeModeState();

			const aSelectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];
			const bSingleSelected = aSelectedIndices.length === 1;

			let oSelectedContext = null;
			let oSelectedData = null;

			if (bSingleSelected) {
				oSelectedContext = oTable.getContextByIndex(aSelectedIndices[0]);
				oSelectedData = oSelectedContext && oSelectedContext.getObject();
			}

			this._updateProductListNavButtonState({
				singleSelected: bSingleSelected,
				deleteMode: mMode.deleteMode,
				reorderMode: mMode.reorderMode
			});

			// Delete mode = multiple selection behavior, no navigation/detail sections
			if (mMode.deleteMode) {
				this._clearProductDetailSections();
				return;
			}

			// Reorder mode = no navigation/detail sections
			if (mMode.reorderMode) {
				this._clearProductDetailSections();
				return;
			}

			// Display mode or normal edit mode:
			// no single selection = hide all details
			if (!bSingleSelected || !oSelectedContext || !oSelectedData) {
				this._clearProductDetailSections();
				return;
			}

			this._updateDetailSectionsBySelectedContext(oSelectedContext);
		},

		_updateProductListNavButtonState: function (mState) {
			const oNavButton = sap.ui.getCore().byId(idTreePrefix + "ProductListNavBtn");

			if (!oNavButton) {
				return;
			}

			if (mState.reorderMode) {
				oNavButton.setVisible(false);
				oNavButton.setEnabled(false);
				return;
			}

			if (mState.deleteMode) {
				oNavButton.setVisible(true);
				oNavButton.setEnabled(false);
				return;
			}

			oNavButton.setVisible(true);
			oNavButton.setEnabled(!!mState.singleSelected);
		},

		_onSelectionChangeDisplayMode: function (oEvent) {
			this._setDeleteBtnState(false);
		},

		_onSelectionChangeDeleteMode: function (oEvent) {
			const oTable = oEvent.getSource();
			const aSelectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];

			this._setDeleteBtnState(aSelectedIndices.length > 0);
		},

		_clearProductDetailSections: function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");

			oJsonModel.setProperty("/selectedMainCategory", null);
			oJsonModel.setProperty("/selectedSubCategory1", null);
			oJsonModel.setProperty("/selectedSubCategory2", null);
			oJsonModel.setProperty("/selectedSubCategory3", null);
			oJsonModel.setProperty("/selectedSubCategory4", null);
			oJsonModel.setProperty("/selectedSubCategory5", null);
			oJsonModel.setProperty("/selectedProduct", null);

			oJsonModel.setProperty("/showMainCategoryDetails", false);
			oJsonModel.setProperty("/showSubCategory1Details", false);
			oJsonModel.setProperty("/showSubCategory2Details", false);
			oJsonModel.setProperty("/showSubCategory3Details", false);
			oJsonModel.setProperty("/showSubCategory4Details", false);
			oJsonModel.setProperty("/showSubCategory5Details", false);
			oJsonModel.setProperty("/showProductDetails", false);

			oJsonModel.updateBindings(true);

			this._syncProductDetailSubSectionVisibility();
		},

		_updateDetailSectionsBySelectedContext: function (oCtx) {
			const oJsonModel = this.base.getView().getModel("jsonModel");

			this._clearProductDetailSections();

			if (!oCtx) {
				return;
			}

			const aChain = this._getNodeChainFromContext(oCtx);

			aChain.forEach(function (oNode) {
				if (!oNode) {
					return;
				}

				if (oNode.Kind === "Product" || oNode.CategoryLevel === 6) {
					oJsonModel.setProperty("/selectedProduct", oNode);
					oJsonModel.setProperty("/showProductDetails", true);
					return;
				}

				switch (oNode.CategoryLevel) {
					case 0:
						oJsonModel.setProperty("/selectedMainCategory", oNode);
						oJsonModel.setProperty("/showMainCategoryDetails", true);
						break;

					case 1:
						oJsonModel.setProperty("/selectedSubCategory1", oNode);
						oJsonModel.setProperty("/showSubCategory1Details", true);
						break;

					case 2:
						oJsonModel.setProperty("/selectedSubCategory2", oNode);
						oJsonModel.setProperty("/showSubCategory2Details", true);
						break;

					case 3:
						oJsonModel.setProperty("/selectedSubCategory3", oNode);
						oJsonModel.setProperty("/showSubCategory3Details", true);
						break;

					case 4:
						oJsonModel.setProperty("/selectedSubCategory4", oNode);
						oJsonModel.setProperty("/showSubCategory4Details", true);
						break;

					case 5:
						oJsonModel.setProperty("/selectedSubCategory5", oNode);
						oJsonModel.setProperty("/showSubCategory5Details", true);
						break;
				}
			});

			oJsonModel.updateBindings(true);

			this._syncProductDetailSubSectionVisibility();
		},

		_getNodeChainFromContext: function (oCtx) {
			const oModel = oCtx.getModel();
			const sPath = oCtx.getPath();
			const aParts = sPath.split("/").filter(Boolean);

			const aChain = [];
			let sCurrentPath = "";

			aParts.forEach(function (sPart) {
				sCurrentPath += "/" + sPart;

				// Only array index parts are actual tree nodes.
				// Example:
				// /productPriceList/0/children/1/children/0
				if (/^\d+$/.test(sPart)) {
					const oNode = oModel.getProperty(sCurrentPath);

					if (oNode && (oNode.Kind === "Category" || oNode.Kind === "Product")) {
						aChain.push(oNode);
					}
				}
			});

			return aChain;
		},

		_getTargetSubSectionKeyByNode: function (oNode) {
			if (!oNode) {
				return null;
			}

			if (oNode.Kind === "Product" || oNode.CategoryLevel === 6) {
				return "ProductDetails";
			}

			if (oNode.CategoryLevel === 0) {
				return "PricelistMainCategory";
			}

			if (oNode.CategoryLevel >= 1 && oNode.CategoryLevel <= 5) {
				return "PricelistSubCategory" + oNode.CategoryLevel;
			}

			return null;
		},

		onNavigate: function (oEvent) {
			const oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;

			// Important:
			// Prevent browser/UI5 from restoring focus to the toolbar button,
			// which can scroll the page back to the tree after navigation.
			if (oSource && oSource.getDomRef && oSource.getDomRef()) {
				oSource.getDomRef().blur();
			}

			if (document.activeElement && document.activeElement.blur) {
				document.activeElement.blur();
			}

			const oTable = this._productTreeTable || sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");

			if (!oTable) {
				MessageToast.show("Tree table not found.");
				return;
			}

			const mMode = this._getProductTreeModeState();

			if (mMode.deleteMode || mMode.reorderMode) {
				MessageToast.show("Navigation is disabled in this mode.");
				return;
			}

			const aSelectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];

			if (aSelectedIndices.length !== 1) {
				MessageToast.show("Please select one node first.");
				return;
			}

			const oCtx = oTable.getContextByIndex(aSelectedIndices[0]);
			const oSelectedData = oCtx && oCtx.getObject();

			if (!oSelectedData) {
				MessageToast.show("No row selected.");
				return;
			}

			// Make required Main/Sub/Product sections visible first
			this._updateDetailSectionsBySelectedContext(oCtx);

			// Important:
			// Apply visibility changes before trying to scroll.
			sap.ui.getCore().applyChanges();

			const sSubSectionKey = this._getTargetSubSectionKeyByNode(oSelectedData);

			if (!sSubSectionKey) {
				MessageToast.show("Unable to determine target section.");
				return;
			}

			const sSubSectionId =
				"pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::" +
				sSubSectionKey;

			const oSubSection = sap.ui.getCore().byId(sSubSectionId);

			if (!oSubSection) {
				MessageToast.show("Target section not found.");
				return;
			}

			let oObjectPageLayout = null;
			let oControl = oTable;

			while (oControl) {
				if (oControl.isA && oControl.isA("sap.uxap.ObjectPageLayout")) {
					oObjectPageLayout = oControl;
					break;
				}

				oControl = oControl.getParent && oControl.getParent();
			}

			if (oObjectPageLayout) {
				// Use 0 duration to avoid animation fighting with focus/layout recalculation.
				oObjectPageLayout.scrollToSection(sSubSectionId, 0);
				return;
			}

			if (oSubSection.getDomRef()) {
				oSubSection.getDomRef().scrollIntoView({
					behavior: "auto",
					block: "start"
				});
			}
		},

		_initProductDetailSectionState: function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");

			oJsonModel.setProperty("/showMainCategoryDetails", false);
			oJsonModel.setProperty("/showSubCategory1Details", false);
			oJsonModel.setProperty("/showSubCategory2Details", false);
			oJsonModel.setProperty("/showSubCategory3Details", false);
			oJsonModel.setProperty("/showSubCategory4Details", false);
			oJsonModel.setProperty("/showSubCategory5Details", false);
			oJsonModel.setProperty("/showProductDetails", false);

			oJsonModel.setProperty("/selectedMainCategory", null);
			oJsonModel.setProperty("/selectedSubCategory1", null);
			oJsonModel.setProperty("/selectedSubCategory2", null);
			oJsonModel.setProperty("/selectedSubCategory3", null);
			oJsonModel.setProperty("/selectedSubCategory4", null);
			oJsonModel.setProperty("/selectedSubCategory5", null);
			oJsonModel.setProperty("/selectedProduct", null);
		},

		_bindProductDetailSubSections: function () {
			this._bindDetailSubSection("PricelistMainCategory", "/selectedMainCategory");

			this._bindDetailSubSection("PricelistSubCategory1", "/selectedSubCategory1");
			this._bindDetailSubSection("PricelistSubCategory2", "/selectedSubCategory2");
			this._bindDetailSubSection("PricelistSubCategory3", "/selectedSubCategory3");
			this._bindDetailSubSection("PricelistSubCategory4", "/selectedSubCategory4");
			this._bindDetailSubSection("PricelistSubCategory5", "/selectedSubCategory5");

			this._bindDetailSubSection("ProductDetails", "/selectedProduct");
		},

		_setDetailSubSectionVisible: function (sSubSectionKey, bVisible) {
			const sPrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::";
			const oSubSection = sap.ui.getCore().byId(sPrefix + sSubSectionKey);

			if (oSubSection && typeof oSubSection.setVisible === "function") {
				oSubSection.setVisible(bVisible);
			}
		},

		_syncProductDetailSubSectionVisibility: function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");

			this._setDetailSubSectionVisible(
				"PricelistMainCategory",
				!!oJsonModel.getProperty("/showMainCategoryDetails")
			);

			this._setDetailSubSectionVisible(
				"PricelistSubCategory1",
				!!oJsonModel.getProperty("/showSubCategory1Details")
			);

			this._setDetailSubSectionVisible(
				"PricelistSubCategory2",
				!!oJsonModel.getProperty("/showSubCategory2Details")
			);

			this._setDetailSubSectionVisible(
				"PricelistSubCategory3",
				!!oJsonModel.getProperty("/showSubCategory3Details")
			);

			this._setDetailSubSectionVisible(
				"PricelistSubCategory4",
				!!oJsonModel.getProperty("/showSubCategory4Details")
			);

			this._setDetailSubSectionVisible(
				"PricelistSubCategory5",
				!!oJsonModel.getProperty("/showSubCategory5Details")
			);

			this._setDetailSubSectionVisible(
				"ProductDetails",
				!!oJsonModel.getProperty("/showProductDetails")
			);
		}
	});
});
