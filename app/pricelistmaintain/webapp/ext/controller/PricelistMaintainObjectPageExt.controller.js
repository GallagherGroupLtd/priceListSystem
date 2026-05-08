sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	 'sap/ui/model/json/JSONModel'
], function (ControllerExtension, JSONModel) {
	'use strict';

	/** Functions for building the tree table (UI Level) **/
    const H_FIELDS = ["MainCategory", "Subcategory1", "Subcategory2", "Subcategory3", "Subcategory4", "Subcategory5"];

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
				var oModel = this.base.getExtensionAPI().getModel();

				// this.getView().setModel(
                // 	new JSONModel({ nodes: [] }),
                // 	"tree"
            	// );

			},

			onPageReady: function () {
				
				this._productTreeSection = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID');
				this._productTreeTable = sap.ui.getCore().byId('pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--ProductTreeFragment_ID--ProductsTreeTable');
				
				this._productTreeTable.collapseAll();
				this.productsTreeRefresh();
				
			}
		},

		productsTreeRefresh: function () {
			const oModel = this.getView().getModel();
			const sPath = this.getView().getBindingContext().sPath + "/items";

			oModel.bindList(sPath).requestContexts()
				.then((aCtx) => {
					if (aCtx.length == 0) {
						console.log('No data found: ' + sPath );
					} else {
						const rows = aCtx.map(oCtx => oCtx.getObject())
						const nodes = this._buildTree(rows);

						const oTreeModel = this._productTreeSection?.getModel("tree");
						oTreeModel?.setProperty("/nodes", nodes);
                		oTreeModel?.setProperty("/nodesAll", JSON.parse(JSON.stringify(nodes)));
					}
				})
				.catch((oErr) => {
					throw oErr;
				});

		},

		_buildTree: function (rows) {
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
	});
});
