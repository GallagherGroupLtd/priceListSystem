sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/MessageToast',
	'sap/m/MessageBox',
    'sap/m/Dialog',
    'sap/m/Input',
    'sap/m/Label',
    'sap/m/Button',
    'sap/m/VBox',
	'sap/ui/export/library',
	'sap/ui/export/ExportHandler'
], function (ControllerExtension, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Dialog, Input, Label, Button, VBox, exportLibrary, ExportHandler) {
	'use strict';

	const idTreePrefix = "pricelistapp.pricelistdisplay::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

	/** Functions for building the tree table (UI Level) **/
	const H_FIELDS = ["MainCategory", "SubCategory1", "SubCategory2", "SubCategory3", "SubCategory4", "SubCategory5"];

	const EdmType = exportLibrary.EdmType;

	const EXPORT_COLUMN_FIELD_MAP = {
		ColCategoriesAndProducts: "Title",
		ColDescription: "Description",
		ColCountryOfOrigin: "CountryOfOrigin",
		ColPriceCurrency: "PriceDisplay",
		ColValidity: "PriceValidityDisplay",
		ColDiscountRate: "DiscountRate",
		ColDiscountEffectiveDate: "DiscountValidFrom",
		ColDiscountExpiryDate: "DiscountValidTo",
		ColPriceChangeIndicator: "PriceChangeIndicator",
		ColStatus: "Status",
		ColStatusValidity: "StatusValidityDisplay",
		ColSupplier: "Supplier",
		ColSupplierSKU: "SupplierSKU"
	};

	let _oInstance = null;

	function norm(v) {
		return (v == null) ? "" : String(v).trim();
	}

	return ControllerExtension.extend('pricelistapp.pricelistdisplay.ext.controller.PricelistDisplayObjectPageExt', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf pricelistapp.pricelistdisplay.ext.controller.PricelistDisplayObjectPageExt
			 */
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI
				// var oModel = this.base.getExtensionAPI().getModel();

				const oView = this.base.getView();
				oView.setModel(new JSONModel(), "jsonModel");

				// initialize UI mode flags
				const oJson = oView.getModel("jsonModel");

				if (oJson) {
					oJson.setProperty("/productPriceList", oJson.getProperty("/productPriceList") || []);
					oJson.setProperty("/originalProductPriceList", oJson.getProperty("/originalProductPriceList") || []);
					oJson.setProperty("/selectedKeys", []);
					oJson.setProperty("/discountUserContext", {
						IsInternalUser: false,
						IsExternalUser: false,
						CustomerNumber: ""
					});

					oJson.setProperty("/discountLoading", false);
					oJson.setProperty("/resolvedDiscountRows", []);
					oJson.setProperty("/discountResolved", false);
					oJson.setProperty("/pricelistUpdates", {
						versions: [],
						summary: {
							totalChanges: 0,
							totalVersions: 0
						},
						priceUpdates: [],
						futurePriceUpdates: [],
						categoryUpdates: [],
						notesUpdates: []
					});

					oJson.setProperty("/pricelistUpdatesFilter", {
						fromVersion: "",
						toVersion: ""
					});
				}
			},

			onPageReady: function () {
				this._productTreeSection = sap.ui.getCore().byId('pricelistapp.pricelistdisplay::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID');
				this._productTreeTable = sap.ui.getCore().byId('pricelistapp.pricelistdisplay::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductPriceListTreeTable');

				_oInstance = this;
				this._loadPricelistUpdates();
				this._initializeDiscountContext();

				this._expandProductTreeFully();
			},
		},

		_initializeDiscountContext: async function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			try {
				const oContext = await this._executeAction(
					"/getDiscountUserContext(...)",
					{}
				);

				oJsonModel.setProperty(
					"/discountUserContext",
					oContext || {
						IsInternalUser: false,
						IsExternalUser: false,
						CustomerNumber: ""
					}
				);

				if (
					oContext &&
					oContext.IsExternalUser &&
					oContext.CustomerNumber
				) {
					await this._retrieveDiscounts("");
				}
			} catch (oError) {
				console.error(
					"Unable to initialize discount user context:",
					oError
				);

				oJsonModel.setProperty("/discountUserContext", {
					IsInternalUser: false,
					IsExternalUser: false,
					CustomerNumber: ""
				});
			}
		},

		_executeAction: async function (sActionPath, mParameters) {
			const oModel = this.base.getView().getModel();
			const oActionBinding = oModel.bindContext(sActionPath);

			Object.keys(mParameters || {}).forEach((sName) => {
				oActionBinding.setParameter(sName, mParameters[sName]);
			});

			await oActionBinding.execute();

			const oBoundContext = oActionBinding.getBoundContext();

			return oBoundContext
				? oBoundContext.getObject()
				: null;
		},

		getInstance: function () { return _oInstance; },

		// Fully expands the Product Tree after its JSON row binding has processed the latest hierarchy.
		_expandProductTreeFully: function () {
			const oTable =
				this._productTreeTable ||
				sap.ui.getCore().byId(
					idTreePrefix + "ProductPriceListTreeTable"
				);

			if (!oTable) {
				return;
			}

			const fnExpand = function () {
				oTable.expandToLevel(99);

				const oExpandAllButton =
					sap.ui.getCore().byId(
						idTreePrefix + "ProductListExpandAllBtn"
					);

				const oCollapseAllButton =
					sap.ui.getCore().byId(
						idTreePrefix + "ProductListCollapseAllBtn"
					);

				if (oExpandAllButton) {
					oExpandAllButton.setVisible(false);
				}

				if (oCollapseAllButton) {
					oCollapseAllButton.setVisible(true);
				}
			};

			const oRowsBinding = oTable.getBinding("rows");

			if (oRowsBinding) {
				oTable.attachEventOnce("rowsUpdated", fnExpand);
			}

			setTimeout(fnExpand, 0);
		},

		_getProductPriceList: function () {
			const oView = this.base.getView();

			// Temp Mock Data
			// var aTreeData = this._getMockData();
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
					$select: ["PricelistType", "MarketScopeRegion", "MarketScopeCountry",
						"SalesOrg", "DistChannel", "CustPriceList", "CustGroup1",
						"ErpCustomer", "DeliveringPlant"].join(",")
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
			const oJsonModel = oView.getModel("jsonModel");

			const aTreeData = Array.isArray(aData) && aData.length ? this._buildTreeFromFlatData(aData) : this._getMockData();

			oJsonModel.setProperty("/productPriceList", aTreeData);
			oJsonModel.setProperty("/originalProductPriceList", JSON.parse(JSON.stringify(aTreeData)));
			oJsonModel.setProperty("/selectedKeys", []);
			this._applyCachedDiscountsToProductTree();
			oJsonModel.updateBindings(true);

			this._expandProductTreeFully();
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
							CountryOfOrigin: row.CountryOfOrigin || null,

							// Categories do not hold specific price/discount data
							Price: null,
							PriceUnit: null,
							PriceValidFrom: null,
							PriceValidTo: null,
							DiscountRate: null,
							DiscountValidFrom: null,
							DiscountValidTo: null,
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
						DiscountValidFrom: row.DiscountValidFrom || null,
						DiscountValidTo: row.DiscountValidTo || null,
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
					DiscountValidFrom: null,
					DiscountValidTo: null,
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
							DiscountValidFrom: null,
							DiscountValidTo: null,
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
									DiscountRate: "5 %",
									DiscountValidFrom: "2026-06-06",
									DiscountValidTo: "2026-06-08",
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
							DiscountValidFrom: null,
							DiscountValidTo: null,
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
									DiscountValidFrom: null,
									DiscountValidTo: null,
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
											DiscountRate: "5 %",
											DiscountValidFrom: "2026-06-06",
											DiscountValidTo: "2026-06-08",
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
											DiscountRate: "5 %",
											DiscountValidFrom: "2026-06-06",
											DiscountValidTo: "2026-06-08",
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

		_onSelectionChangeDisplayMode: function (oEvent) {
			const oTable = oEvent.getSource();
			const aSelectedIndices = oTable.getSelectedIndices();

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
						sSubSectionId = "pricelistapp.pricelistdisplay::PricelistDataObjectPage--fe::CustomSubSection::ProductDetails";
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
		// 	const clickedKind = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject().kind : null;

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
		// 			if (n.kind === 'Category') {
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

		_loadPricelistUpdates: function () {
			const oView = this.base.getView();
			const oContext = oView.getBindingContext();

			if (!oContext) {
				return Promise.resolve();
			}

			const oJson = oView.getModel("jsonModel");
			const oFilter = oJson.getProperty("/pricelistUpdatesFilter") || {};
			const sPath = oContext.getPath();
			const sPricelistId = this._extractKeyFromContextPath(sPath);

			if (!sPricelistId) {
				return Promise.resolve();
			}

			const oAction = oView.getModel().bindContext("/getPricelistUpdates(...)");

			oAction.setParameter("pricelistId", sPricelistId);
			oAction.setParameter("fromVersion", oFilter.fromVersion || "");
			oAction.setParameter("toVersion", oFilter.toVersion || "");

			return oAction.execute()
				.then(function () {
					const oResult = oAction.getBoundContext().getObject() || {};

					oJson.setProperty("/pricelistUpdates", {
						versions: oResult.versions || [],
						summary: oResult.summary || {
							totalChanges: 0,
							totalVersions: 0
						},
						priceUpdates: oResult.priceUpdates || [],
						futurePriceUpdates: oResult.futurePriceUpdates || [],
						categoryUpdates: oResult.categoryUpdates || [],
						notesUpdates: oResult.notesUpdates || []
					});
				})
				.catch(function (oError) {
					console.error("Error loading pricelist updates:", oError);
					MessageBox.error("Unable to load pricelist updates.");
				});
		},

		_extractKeyFromContextPath: function (sPath) {
			if (!sPath) return "";

			const aMatch = /ID=([0-9a-fA-F-]+)/.exec(sPath);

			if (aMatch && aMatch[1]) {
				return aMatch[1];
			}

			const aSimpleMatch = /\(([0-9a-fA-F-]+)\)/.exec(sPath);
			return aSimpleMatch && aSimpleMatch[1] ? aSimpleMatch[1] : "";
		},

		onExportExcel: function (bShowSettingsDialog) {
			const oTable = this._productTreeTable || sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");

			if (!oTable) {
				MessageToast.show("Table not found.");
				return;
			}

			const oJsonModel = this.base.getView().getModel("jsonModel");
			const aTree = oJsonModel.getProperty("/productPriceList") || [];
			const aRows = this._flattenTreeForExport(aTree);

			if (!aRows.length) {
				MessageToast.show("Nothing to export.");
				return;
			}

			const mSettings = {
				workbook: {
					columns: this._buildExportColumns(oTable),
					context: {
						sheetName: "Product Price List"
					}
				},
				dataSource: aRows,
				fileName: "ProductPriceList.xlsx"
			};

			if (!this._oExportHandler) {
				this._oExportHandler = new ExportHandler();
			}

			const pExport = bShowSettingsDialog
				? this._oExportHandler.exportAs(mSettings)
				: this._oExportHandler.export(mSettings);

			pExport.catch(function (oError) {
				if (oError) {
					MessageBox.error("Export failed: " + (oError.message || "Unknown error."));
				}
			});
		},

		_buildExportColumns: function (oTable) {
			return oTable.getColumns()
				.filter(function (oColumn) {
					return oColumn.getVisible();
				})
				.map(function (oColumn) {
					const sLocalId = oColumn.getId().replace(idTreePrefix, "");
					const vLabel = oColumn.getLabel && oColumn.getLabel();
					const sTitle = typeof vLabel === "string" ? vLabel : (vLabel && vLabel.getText ? vLabel.getText() : sLocalId);

					return {
						label: sTitle,
						property: EXPORT_COLUMN_FIELD_MAP[sLocalId] || sLocalId,
						type: EdmType.String
					};
				});
		},

		_flattenTreeForExport: function (aNodes, iLevel, aOut) {
			iLevel = iLevel || 0;
			aOut = aOut || [];

			(aNodes || []).forEach(function (oNode) {
				const bIsProduct = oNode.Kind === "Product" || oNode.kind === "Product";

				aOut.push({
					Title: "    ".repeat(iLevel) + (oNode.Title || oNode.text || ""),
					Description: bIsProduct ? (oNode.Description || "") : "",
					CountryOfOrigin: bIsProduct ? (oNode.CountryOfOrigin || "") : "",
					PriceDisplay: bIsProduct ? ((oNode.Price || "") + " " + (oNode.PriceUnit || "")).trim() : "",
					PriceValidityDisplay: bIsProduct ? ((oNode.PriceValidFrom || "") + " - " + (oNode.PriceValidTo || "")).trim() : "",
					DiscountRate: bIsProduct ? (oNode.DiscountRate || "") : "",
					DiscountValidFrom: bIsProduct ? (oNode.DiscountValidFrom || "") : "",
					DiscountValidTo: bIsProduct ? (oNode.DiscountValidTo || "") : "",
					PriceChangeIndicator: bIsProduct ? String(!!oNode.PriceChangeIndicator) : "",
					Status: bIsProduct ? (oNode.Status || "") : "",
					StatusValidityDisplay: bIsProduct ? ((oNode.StatusValidFromDate || "") + " - " + (oNode.StatusValidToDate || "")).trim() : "",
					Supplier: bIsProduct ? (oNode.Supplier || "") : "",
					SupplierSKU: bIsProduct ? (oNode.SupplierSKU || "") : ""
				});

				if (Array.isArray(oNode.children) && oNode.children.length) {
					this._flattenTreeForExport(oNode.children, iLevel + 1, aOut);
				}
			}.bind(this));

			return aOut;
		},

		onRetrieveDiscounts: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");
			const oUserContext =
				oJsonModel.getProperty("/discountUserContext") || {};

			if (!oUserContext.IsInternalUser) {
				MessageBox.error(
					"Customer simulation is available only to internal users."
				);
				return;
			}

			const oCustomerInput = new Input({
				width: "100%",
				placeholder: "Enter customer number",
				submit: async () => {
					await this._submitDiscountCustomer(
						oDialog,
						oCustomerInput
					);
				}
			});

			const oDialog = new Dialog({
				title: "Retrieve Discount Information",
				contentWidth: "28rem",
				content: [
					new VBox({
						width: "100%",
						class: "sapUiSmallMargin",
						items: [
							new Label({
								text: "Customer Number",
								labelFor: oCustomerInput
							}),
							oCustomerInput
						]
					})
				],
				beginButton: new Button({
					text: "Retrieve",
					type: "Emphasized",
					press: async () => {
						await this._submitDiscountCustomer(
							oDialog,
							oCustomerInput
						);
					}
				}),
				endButton: new Button({
					text: "Cancel",
					press: function () {
						oDialog.close();
					}
				}),
				afterClose: function () {
					oDialog.destroy();
				}
			});

			oView.addDependent(oDialog);
			oDialog.open();

			setTimeout(() => {
				oCustomerInput.focus();
			}, 0);
		},

		_submitDiscountCustomer: async function (
			oDialog,
			oCustomerInput
		) {
			const sCustomerNumber =
				String(oCustomerInput.getValue() || "").trim();

			if (!sCustomerNumber) {
				oCustomerInput.setValueState("Error");
				oCustomerInput.setValueStateText(
					"Customer number is required."
				);
				return;
			}

			oCustomerInput.setValueState("None");

			const bSuccess =
				await this._retrieveDiscounts(sCustomerNumber);

			if (bSuccess) {
				oDialog.close();
			}
		},

		_retrieveDiscounts: async function (sCustomerNumber) {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");
			const oBindingContext = oView.getBindingContext();

			if (!oBindingContext) {
				MessageBox.error(
					"The current pricelist context is unavailable."
				);
				return false;
			}

			const oPricelist = await oBindingContext.requestObject();
			const sPricelistId = oPricelist && oPricelist.ID;

			if (!sPricelistId) {
				MessageBox.error(
					"The current pricelist ID could not be determined."
				);
				return false;
			}

			oJsonModel.setProperty("/discountLoading", true);

			try {
				const aDiscountRows = await this._executeAction(
					"/resolveDiscounts(...)",
					{
						pricelistId: sPricelistId,
						customerNumber: sCustomerNumber || ""
					}
				);

				const aRows = Array.isArray(aDiscountRows) ? aDiscountRows : [];

				oJsonModel.setProperty("/resolvedDiscountRows",JSON.parse(JSON.stringify(aRows)));
				oJsonModel.setProperty("/discountResolved", true);

				this._applyDiscountsToProductTree(aRows);

				if (aRows.length) {
					MessageToast.show(
						"Discount information retrieved."
					);
				} else {
					MessageToast.show(
						"No matching discount information was found."
					);
				}

				return true;
			} catch (oError) {
				console.error(
					"Error retrieving discount information:",
					oError
				);

				MessageBox.error(
					this._getErrorMessage(
						oError,
						"Unable to retrieve discount information."
					)
				);

				return false;
			} finally {
				oJsonModel.setProperty("/discountLoading", false);
			}
		},

		_applyCachedDiscountsToProductTree: function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");
			const bDiscountResolved = oJsonModel.getProperty("/discountResolved") === true;

			if (!bDiscountResolved) {
				return;
			}

			const aDiscountRows = oJsonModel.getProperty("/resolvedDiscountRows") || [];
			this._applyDiscountsToProductTree(aDiscountRows);
		},

		_applyDiscountsToProductTree: function (aDiscountRows) {
			const oJsonModel =
				this.base.getView().getModel("jsonModel");

			const aTree =
				oJsonModel.getProperty("/productPriceList") || [];

			if (!Array.isArray(aTree) || aTree.length === 0) {
				return;
			}

			const oDiscount =
				Array.isArray(aDiscountRows) && aDiscountRows.length
					? aDiscountRows[0]
					: null;

			const applyRecursively = (aNodes) => {
				(aNodes || []).forEach((oNode) => {
					const bIsProduct =
						oNode.Kind === "Product" ||
						oNode.kind === "Product";

					if (bIsProduct) {
						oNode.DiscountRate =
							oDiscount?.DiscountRate || "";

						oNode.DiscountValidFrom =
							oDiscount?.DiscountValidFrom || null;

						oNode.DiscountValidTo =
							oDiscount?.DiscountValidTo || null;

						oNode.DiscountConditionType =
							oDiscount?.DiscountConditionType || "";

						oNode.DiscountAccessSequence =
							oDiscount?.DiscountAccessSequence || "";
					}

					if (
						Array.isArray(oNode.children) &&
						oNode.children.length
					) {
						applyRecursively(oNode.children);
					}
				});
			};

			applyRecursively(aTree);

			oJsonModel.setProperty(
				"/productPriceList",
				aTree.slice()
			);
		},

		_getErrorMessage: function (
			oError,
			sFallbackMessage
		) {
			return (
				oError?.error?.message ||
				oError?.cause?.message ||
				oError?.message ||
				sFallbackMessage
			);
		}
	});
});
