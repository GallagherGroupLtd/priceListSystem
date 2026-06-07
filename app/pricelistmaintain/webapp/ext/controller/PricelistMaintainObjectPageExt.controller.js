sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator'
], function (ControllerExtension, JSONModel, Filter, FilterOperator) {
	'use strict';

	/** Functions for building the tree table (UI Level) **/
	const H_FIELDS = ["MainCategory", "SubCategory1", "SubCategory2", "SubCategory3", "SubCategory4", "SubCategory5"];

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

				this._getProductPriceList();

				// this._productTreeTable.collapseAll();
				// this.productsTreeRefresh();

			}
		},

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

			oView.getModel()
				.bindContext(sPath, null, {
					$select: ["TradeScenario", "MarketScopeRegion", "MarketScopeCountry", "SalesOrg", "DistChannel",
						"CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant"].join(",")
				}).requestObject().then((oData) => {
					const aFilterConfig = [
						{ path: "TradeScenario", value: oData?.TradeScenario },
						{ path: "MarketScopeRegion", value: oData?.MarketScopeRegion },
						{ path: "MarketScopeCountry", value: oData?.MarketScopeCountry },
						{ path: "SalesOrg", value: oData?.SalesOrg },
						{ path: "DistChannel", value: oData?.DistChannel },
						{ path: "CustPriceList", value: oData?.CustPriceList },
						{ path: "CustGroup1", value: oData?.CustGroup1 },
						{ path: "ErpCustomer", value: oData?.ErpCustomer },
						{ path: "DeliveringPlant", value: oData?.DeliveringPlant }
					];

					const aFilters = aFilterConfig
						.filter(item => item.value !== undefined && item.value !== null && item.value !== "")
						.map(item => new Filter(item.path, FilterOperator.EQ, item.value));

					oView.getModel().bindList("/ProductPricelistTree", null, null, aFilters)
						.requestContexts(0, 5000)
						.then((aContexts) => {
							const aRawData = aContexts.map(oCtx => oCtx.getObject());
							console.log("Raw data from OData:", aRawData);
							const aTreeData = this._buildTree(aRawData);
							oView.getModel('jsonModel').setProperty("/productPriceList", aTreeData);
						})
						.catch((oErr) => {
							console.error("Error fetching ProductPricelistTree data:", oErr);
						});
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
