sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/MessageToast',
	'sap/m/MessageBox'
], function (ControllerExtension, JSONModel, Fragment, Filter, FilterOperator, MessageToast, MessageBox) {
	'use strict';

	const idTreePrefix = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

	let _oInstance = null;

	return ControllerExtension.extend('pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt
			 */
			onInit: function () {
				const oView = this.base.getView();

				oView.setModel(new JSONModel(this._getInitialJsonData()), "jsonModel");

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

		// ============================================================================
		// Public API for Fragment Handlers
		// ============================================================================

		getInstance: function () { return _oInstance; },

		// ============================================================================
		// Product List Toolbar Handlers
		// ============================================================================
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
				// For testing will be deleted
				// return;
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

			debugger;

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

		// ============================================================================
		// Filter Handlers
		// ============================================================================
		onOpenHierarchyFilter: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			if (this._oProductFilterDialog && this._oProductFilterDialog.open) {
				this._oProductFilterDialog.setModel(oJsonModel, "jsonModel");
				this._oProductFilterDialog.open();
				return;
			}

			if (!this._pProductFilterDialog) {
				this._pProductFilterDialog = Fragment.load({
					id: oView.getId(),
					name: "pricelistapp.pricelistmaintain.ext.fragment.ProductListFilterDialog",
					controller: this
				}).then((oDialog) => {
					// Fragment.load can return either one control or an array of controls
					const oRealDialog = Array.isArray(oDialog) ? oDialog[0] : oDialog;

					this._oProductFilterDialog = oRealDialog;
					oView.addDependent(oRealDialog);

					return oRealDialog;
				});
			}

			this._pProductFilterDialog.then((oDialog) => {
				oDialog.setModel(oJsonModel, "jsonModel");
				oDialog.open();
			});
		},

		onCloseHierarchyFilterDialog: function () {
			if (this._oProductFilterDialog) {
				this._oProductFilterDialog.close();
			}
		},

		onApplyHierarchyFilter: function () {
			this._applyProductTreeFilter();

			if (this._oProductFilterDialog) {
				this._oProductFilterDialog.close();
			}
		},

		onClearHierarchyFilter: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			const aFullTree = oJsonModel.getProperty("/productPriceListFull") || [];

			oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());
			oJsonModel.setProperty("/productFilterCount", 0);
			oJsonModel.setProperty("/productPriceList", JSON.parse(JSON.stringify(aFullTree)));
			this._updateModeToggleEnabled();

			oJsonModel.updateBindings(true);

			const oTable = this._productTreeTable || sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");

			if (oTable) {
				if (oTable.clearSelection) {
					oTable.clearSelection();
				}

				const oRowsBinding = oTable.getBinding("rows");
				if (oRowsBinding && oRowsBinding.refresh) {
					oRowsBinding.refresh(true);
				}
			}

			this._clearProductDetailSections();
			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: false,
				reorderMode: false
			});

			if (this._oProductFilterDialog) {
				this._oProductFilterDialog.close();
			}
		},

		onResetHierarchyFilter: function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");

			oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());
			oJsonModel.updateBindings(true);
		},

		// ============================================================================
		// Delete Handlers
		// ============================================================================
		onDelete: function () {
			const oTable = this._productTreeTable;

			if (!oTable) {
				return;
			}

			const oView = this.base.getView();
			const oModel = oView.getModel("jsonModel");

			const aCurrentTree = oModel.getProperty("/productPriceList") || [];

			// selectedKeys now stores context paths, for example:
			// /productPriceList/0/children/1/children/0
			const aSelectedPaths = oModel.getProperty("/selectedKeys") || [];

			if (!aSelectedPaths.length) {
				MessageToast.show("No rows selected to delete.");
				return;
			}

			const selectedPathSet = new Set(aSelectedPaths);

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

			// Convert selected UI paths back to backend IDs for save/delete persistence.
			const oController = this;

			aSelectedPaths.forEach(function (sPath) {
				const oSelectedNode = oController._getNodeByContextPath(aCurrentTree, sPath);

				if (oSelectedNode && oSelectedNode.ID) {
					pendingDeletedIdSet.add(oSelectedNode.ID);
				}
			});

			// Remove selected rows by context path, not by ID.
			// This prevents deleting/selecting sibling products that have the same ID/material.
			const filterTree = function (aNodes, sBasePath) {
				if (!Array.isArray(aNodes)) {
					return [];
				}

				return aNodes
					.map(function (oNode, iIndex) {
						const sNodePath = sBasePath + "/" + iIndex;

						if (!oNode) {
							return oNode;
						}

						if (selectedPathSet.has(sNodePath)) {
							return null;
						}

						const oCopy = Object.assign({}, oNode);
						oCopy.children = filterTree(oNode.children || [], sNodePath + "/children");

						return oCopy;
					})
					.filter(Boolean);
			};

			const aNewTree = filterTree(aCurrentTree, "/productPriceList");

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

		// ============================================================================
		// Product Tree Data
		// ============================================================================
		_getProductPriceList: function () {
			// const oView = this.base.getView();
			// const oModel = oView.getModel();
			// const oContext = oView.getBindingContext();

			// if (!oContext) {
			// 	return Promise.resolve([]);
			// }

			// const sPath = oContext.getPath();

			// return oModel
			// 	.bindContext(sPath, null, {
			// 		$select: [
			// 			"PricelistType",
			// 			"MarketScopeRegion",
			// 			"MarketScopeCountry",
			// 			"SalesOrg",
			// 			"DistChannel",
			// 			"CustPriceList",
			// 			"CustGroup1",
			// 			"ErpCustomer",
			// 			"DeliveringPlant"
			// 		].join(",")
			// 	})
			// 	.requestObject()
			// 	.then((oData) => {
			// 		const aFilters = [
			// 			{ path: "PricelistType", value: oData?.PricelistType },
			// 			{ path: "MarketScopeRegion", value: oData?.MarketScopeRegion },
			// 			{ path: "MarketScopeCountry", value: oData?.MarketScopeCountry },
			// 			{ path: "SalesOrg", value: oData?.SalesOrg },
			// 			{ path: "DistChannel", value: oData?.DistChannel },
			// 			{ path: "CustPriceList", value: oData?.CustPriceList },
			// 			{ path: "CustGroup1", value: oData?.CustGroup1 },
			// 			{ path: "ErpCustomer", value: oData?.ErpCustomer },
			// 			{ path: "DeliveringPlant", value: oData?.DeliveringPlant }
			// 		]
			// 			.filter(item => item.value !== undefined && item.value !== null && item.value !== "")
			// 			.map(item => new Filter(item.path, FilterOperator.EQ, item.value));

			// 		return oModel
			// 			.bindList("/ProductPricelistTree", null, null, aFilters)
			// 			.requestContexts(0, 5000);
			// 	})
			// 	.then((aContexts) => {
			// 		return aContexts.map(oCtx => oCtx.getObject());
			// 	});

			const oView = this.base.getView();
			const oModel = oView.getModel();
			const oContext = oView.getBindingContext();

			if (!oContext) { return Promise.resolve([]); }

			return oModel
				.bindContext(oContext.getPath(), null, {
					$select: [
						"PricelistType", "MarketScopeRegion", "MarketScopeCountry",
						"SalesOrg", "DistChannel", "CustPriceList",
						"CustGroup1", "ErpCustomer", "DeliveringPlant", "EffectiveDate", "PublishedDate"
					].join(",")
				})
				.requestObject()
				.then((oData) => {
					const oHeaderData = {
						EffectiveDate: oData.EffectiveDate,
						PricelistType: oData.PricelistType,
						MarketScopeRegion: oData.MarketScopeRegion,
						MarketScopeCountry: oData.MarketScopeCountry,
						SalesOrg: oData.SalesOrg,
						DistChannel: oData.DistChannel,
						CustPriceList: oData.CustPriceList,
						CustGroup1: oData.CustGroup1,
						ErpCustomer: oData.ErpCustomer,
						DeliveringPlant: oData.DeliveringPlant
					};

					const oAction = oModel.bindContext("/getProductTreeData(...)");
					oAction.setParameter("headerData", JSON.stringify(oHeaderData));

					return oAction.execute().then(() => {
						const oResult = oAction.getBoundContext().getObject();
						return oResult.value || oResult || [];
					});
				});

		},

		_setTreeTableData: function (aFlatData) {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			const aTreeData = Array.isArray(aFlatData) && aFlatData.length
				? this._buildTreeFromFlatData(aFlatData)
				: [];

			oJsonModel.setProperty("/productPriceList", aTreeData);
			oJsonModel.setProperty("/originalProductPriceList", JSON.parse(JSON.stringify(aTreeData)));
			oJsonModel.setProperty("/productPriceListFull", JSON.parse(JSON.stringify(aTreeData)));

			oJsonModel.setProperty("/pendingDeletedIds", []);
			oJsonModel.setProperty("/selectedKeys", []);

			oJsonModel.setProperty("/productFilterCount", 0);
			oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());

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
							MaterialKey: row.MaterialKey,

							Sequence: row.Sequence,
							OrderIndex: Object.keys(nodeMap).length + 1,
							Kind: "Category",
							CategoryLevel: level,
							Title: title,
							Description: row[descField] || null,

							PublishedName: row.PublishedName,
							TermsAndConditions: row.TermsAndConditions,
							IsTACDisableExt: row.IsTACDisableExt,
							IsTACDisableInt: row.IsTACDisableInt,
							Notes: row.Notes,
							IsNotesDisableExt: row.IsNotesDisableExt,
							IsNotesDisableInt: row.IsNotesDisableInt,

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
						MaterialKey: row.MaterialKey,

						Sequence: row.Sequence,
						OrderIndex: index + 1,
						Kind: "Product",
						CategoryLevel: 6, // Product level
						Title: row.Material,
						Description: row.MaterialDescription,

						PublishedName: row.PublishedName,
						TermsAndConditions: row.TermsAndConditions,
						IsTACDisableExt: row.IsTACDisableExt,
						IsTACDisableInt: row.IsTACDisableInt,
						Notes: row.Notes,
						IsNotesDisableExt: row.IsNotesDisableExt,
						IsNotesDisableInt: row.IsNotesDisableInt,

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

		// ============================================================================
		// Product Tree Filter
		// ============================================================================
		_applyProductTreeFilter: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			const aFullTree = oJsonModel.getProperty("/productPriceListFull") || [];
			const oFilter = oJsonModel.getProperty("/productFilter") || this._getEmptyProductFilter();

			const iFilterCount = this._getProductFilterCount(oFilter);

			oJsonModel.setProperty("/productFilterCount", iFilterCount);

			if (iFilterCount === 0) {
				oJsonModel.setProperty("/productPriceList", JSON.parse(JSON.stringify(aFullTree)));
				oJsonModel.updateBindings(true);

				this._updateModeToggleEnabled();
				this._clearProductDetailSections();

				return;
			}

			const aFilteredTree = this._filterProductTree(aFullTree, oFilter);

			oJsonModel.setProperty("/productPriceList", aFilteredTree);
			oJsonModel.updateBindings(true);

			const oTable = this._productTreeTable || sap.ui.getCore().byId(idTreePrefix + "ProductPriceListTreeTable");

			if (oTable) {
				if (oTable.clearSelection) {
					oTable.clearSelection();
				}

				const oRowsBinding = oTable.getBinding("rows");
				if (oRowsBinding && oRowsBinding.refresh) {
					oRowsBinding.refresh(true);
				}

				if (oTable.expandToLevel) {
					oTable.expandToLevel(7);
				}
			}

			this._updateModeToggleEnabled();
			this._clearProductDetailSections();

			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: false,
				reorderMode: false
			});
		},

		_filterProductTree: function (aTree, oFilter) {
			const oExt = this;

			const filterNodes = function (aNodes, aParentChain) {
				if (!Array.isArray(aNodes)) {
					return [];
				}

				return aNodes
					.map(function (oNode) {
						if (!oNode) {
							return null;
						}

						const aChildren = filterNodes(oNode.children || [], aParentChain.concat(oNode));
						const bNodeMatched = oExt._doesProductTreeNodeMatchFilter(oNode, aParentChain, oFilter);

						if (bNodeMatched || aChildren.length > 0) {
							const oCopy = Object.assign({}, oNode);
							oCopy.children = aChildren;
							return oCopy;
						}

						return null;
					})
					.filter(Boolean);
			};

			return filterNodes(aTree, []);
		},

		_doesProductTreeNodeMatchFilter: function (oNode, aParentChain, oFilter) {
			const contains = function (value, search) {
				if (search === undefined || search === null || String(search).trim() === "") {
					return true;
				}

				return String(value || "")
					.toLowerCase()
					.indexOf(String(search).trim().toLowerCase()) >= 0;
			};

			const hasValue = function (value) {
				return value !== undefined && value !== null && String(value).trim() !== "";
			};

			const toBool = function (value) {
				return value === true ||
					value === "true" ||
					value === "X" ||
					value === "x" ||
					value === "Yes" ||
					value === "YES";
			};

			const getCategoryByLevel = function (iLevel) {
				const oFromParent = (aParentChain || []).find(function (oParent) {
					return oParent && Number(oParent.CategoryLevel) === iLevel;
				});

				if (oFromParent) {
					return oFromParent.Title;
				}

				if (Number(oNode.CategoryLevel) === iLevel) {
					return oNode.Title;
				}

				return "";
			};

			const bIsProduct = oNode.Kind === "Product" || Number(oNode.CategoryLevel) === 6;

			// In our tree:
			// Product material no = Product node Title
			// Product material description = Product node Description
			const sProductMaterialNo = bIsProduct
				? [oNode.Title, oNode.Material, oNode.MaterialKey].join(" ")
				: "";

			const sProductDescription = bIsProduct
				? [oNode.Description, oNode.MaterialDescription].join(" ")
				: "";

			// Categories and Products column
			if (!contains(oNode.Title, oFilter.title)) {
				return false;
			}

			// Category filters
			if (!contains(getCategoryByLevel(0), oFilter.mainCategory)) return false;
			if (!contains(getCategoryByLevel(1), oFilter.subCategory1)) return false;
			if (!contains(getCategoryByLevel(2), oFilter.subCategory2)) return false;
			if (!contains(getCategoryByLevel(3), oFilter.subCategory3)) return false;
			if (!contains(getCategoryByLevel(4), oFilter.subCategory4)) return false;
			if (!contains(getCategoryByLevel(5), oFilter.subCategory5)) return false;

			// Material field in filter dialog
			// Should match product-level Title, because material no is stored as Title at Product level.
			if (!contains(sProductMaterialNo, oFilter.material)) {
				return false;
			}

			// Description field in filter dialog
			// Should match product-level Description, because material description is stored as Description at Product level.
			if (!contains(sProductDescription, oFilter.description)) {
				return false;
			}

			// Price
			if (!contains(oNode.Price, oFilter.price)) return false;
			if (!contains(oNode.PriceUnit, oFilter.priceUnit)) return false;

			if (oFilter.hasPrice === "Yes" && !hasValue(oNode.Price)) return false;
			if (oFilter.hasPrice === "No" && hasValue(oNode.Price)) return false;

			// Price Validity
			if (!contains(oNode.PriceValidFrom, oFilter.priceValidFrom)) return false;
			if (!contains(oNode.PriceValidTo, oFilter.priceValidTo)) return false;

			// Discount
			if (!contains(oNode.DiscountRate, oFilter.discountRate)) return false;

			if (oFilter.hasDiscount === "Yes" && !hasValue(oNode.DiscountRate)) return false;
			if (oFilter.hasDiscount === "No" && hasValue(oNode.DiscountRate)) return false;

			if (!contains(oNode.DiscountEffectiveToDate, oFilter.discountEffectiveToDate)) return false;

			// Price Change Indicator
			if (oFilter.priceChangeIndicator === "Yes" && !toBool(oNode.PriceChangeIndicator)) return false;
			if (oFilter.priceChangeIndicator === "No" && toBool(oNode.PriceChangeIndicator)) return false;

			// Future Price
			if (!contains(oNode.FuturePrice, oFilter.futurePrice)) return false;
			if (!contains(oNode.FuturePriceValidFrom, oFilter.futurePriceValidFrom)) return false;
			if (!contains(oNode.FuturePriceValidTo, oFilter.futurePriceValidTo)) return false;

			// Status
			if (!contains(oNode.Status, oFilter.status)) return false;
			if (!contains(oNode.StatusValidFromDate, oFilter.statusValidFromDate)) return false;
			if (!contains(oNode.StatusValidToDate, oFilter.statusValidToDate)) return false;

			// Supplier
			if (!contains(oNode.Supplier, oFilter.supplier)) return false;
			if (!contains(oNode.SupplierSKU, oFilter.supplierSKU)) return false;

			return true;
		},

		_getProductFilterCount: function (oFilter) {
			let iCount = 0;

			const hasText = function (v) {
				return v !== undefined && v !== null && String(v).trim() !== "";
			};

			[
				"title",

				"mainCategory",
				"subCategory1",
				"subCategory2",
				"subCategory3",
				"subCategory4",
				"subCategory5",

				"description",
				"material",

				"price",
				"priceUnit",
				"priceValidFrom",
				"priceValidTo",

				"discountRate",
				"discountEffectiveToDate",

				"futurePrice",
				"futurePriceValidFrom",
				"futurePriceValidTo",

				"status",
				"statusValidFromDate",
				"statusValidToDate",

				"supplier",
				"supplierSKU"
			].forEach(function (sKey) {
				if (hasText(oFilter[sKey])) {
					iCount++;
				}
			});

			if (oFilter.hasPrice && oFilter.hasPrice !== "All") {
				iCount++;
			}

			if (oFilter.hasDiscount && oFilter.hasDiscount !== "All") {
				iCount++;
			}

			if (oFilter.priceChangeIndicator && oFilter.priceChangeIndicator !== "All") {
				iCount++;
			}

			return iCount;
		},

		_getEmptyProductFilter: function () {
			return {
				title: "",

				mainCategory: "",
				subCategory1: "",
				subCategory2: "",
				subCategory3: "",
				subCategory4: "",
				subCategory5: "",

				description: "",
				material: "",

				price: "",
				priceUnit: "",
				priceValidFrom: "",
				priceValidTo: "",
				hasPrice: "All",

				discountRate: "",
				discountEffectiveToDate: "",
				hasDiscount: "All",

				priceChangeIndicator: "All",
				futurePrice: "",
				futurePriceValidFrom: "",
				futurePriceValidTo: "",

				status: "",
				statusValidFromDate: "",
				statusValidToDate: "",

				supplier: "",
				supplierSKU: ""
			};
		},

		// ============================================================================
		// Product Tree Selection / Navigation
		// ============================================================================
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

		_onSelectionChangeDisplayMode: function () {
			this._setDeleteBtnState(false);
		},

		_onSelectionChangeDeleteMode: function (oEvent) {
			if (this._bSuppressSelectionChange) {
				return;
			}

			const oTable = this._productTreeTable || oEvent.getSource();

			if (!oTable) {
				return;
			}

			const oView = this.base.getView();
			const oModel = oView.getModel("jsonModel");
			const aRoots = oModel.getProperty("/productPriceList") || [];

			// Current selected row paths after user click
			const aSelectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];
			const selectedPaths = new Set();

			for (const iIndex of aSelectedIndices) {
				const oContext = oTable.getContextByIndex(iIndex);

				if (oContext && oContext.getPath) {
					selectedPaths.add(oContext.getPath());
				}
			}

			// Detect clicked row by context path
			const oRowCtx = oEvent.getParameter && oEvent.getParameter("rowContext");
			const oClickedRow = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject() : null;
			const sClickedPath = oRowCtx && oRowCtx.getPath ? oRowCtx.getPath() : null;

			const clickedKind = oClickedRow && oClickedRow.Kind;

			// Category click:
			// select/deselect category + all descendants
			if (clickedKind === "Category" && sClickedPath) {
				const aDescendantPaths = this._collectDescendantPathsByContextPath(
					aRoots,
					sClickedPath
				);

				if (selectedPaths.has(sClickedPath)) {
					aDescendantPaths.forEach(function (sPath) {
						selectedPaths.add(sPath);
					});
				} else {
					aDescendantPaths.forEach(function (sPath) {
						selectedPaths.delete(sPath);
					});
				}
			}

			// Product click:
			// do nothing extra.
			// TreeTable already toggled this product only.
			// Do NOT select parent.
			// Do NOT select sibling products.

			const oController = this;

			// Cleanup only:
			// If parent category is selected but not all descendant products are selected,
			// remove parent category selection.
			// This does not auto-add parent selection.
			const cleanupParentSelection = function (aNodes, sBasePath) {
				if (!Array.isArray(aNodes)) {
					return;
				}

				aNodes.forEach(function (oNode, iIndex) {
					const sNodePath = sBasePath + "/" + iIndex;

					if (!oNode) {
						return;
					}

					const aChildren = oNode.children || [];

					if (aChildren.length) {
						cleanupParentSelection(aChildren, sNodePath + "/children");
					}

					if (oNode.Kind !== "Category") {
						return;
					}

					if (!selectedPaths.has(sNodePath)) {
						return;
					}

					const aProductPaths = oController._collectProductPathsByContextPath(
						aRoots,
						sNodePath
					);

					const bAllProductsSelected =
						aProductPaths.length > 0 &&
						aProductPaths.every(function (sProductPath) {
							return selectedPaths.has(sProductPath);
						});

					if (!bAllProductsSelected) {
						selectedPaths.delete(sNodePath);
					}
				});
			};

			cleanupParentSelection(aRoots, "/productPriceList");

			// Apply final selected paths back to visible TreeTable rows
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

					if (!oContext || !oContext.getPath) {
						continue;
					}

					if (selectedPaths.has(oContext.getPath())) {
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

			const aFinalSelectedPaths = Array.from(selectedPaths);

			oModel.setProperty("/selectedKeys", aFinalSelectedPaths);

			const bHasSelection = aFinalSelectedPaths.length > 0;
			this._setDeleteBtnState(bHasSelection, bHasSelection);
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

		// ============================================================================
		// Product Detail Sections
		// ============================================================================
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

				debugger;
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
		},

		// ============================================================================
		// Delete Persistence / Delete Helpers
		// ============================================================================
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

		_getNodeByContextPath: function (aRoots, sPath) {
			if (!sPath) {
				return null;
			}

			const aParts = sPath.split("/").filter(Boolean);

			let aCurrentNodes = aRoots;
			let oCurrentNode = null;

			for (let i = 0; i < aParts.length; i++) {
				const sPart = aParts[i];

				if (sPart === "productPriceList") {
					continue;
				}

				if (sPart === "children") {
					if (!oCurrentNode) {
						return null;
					}

					aCurrentNodes = oCurrentNode.children || [];
					continue;
				}

				if (/^\d+$/.test(sPart)) {
					oCurrentNode = aCurrentNodes[Number(sPart)];

					if (!oCurrentNode) {
						return null;
					}
				}
			}

			return oCurrentNode;
		},

		_collectDescendantPathsByContextPath: function (aRoots, sParentPath) {
			const oParentNode = this._getNodeByContextPath(aRoots, sParentPath);
			const aPaths = [];

			const collect = function (aChildren, sChildrenBasePath) {
				if (!Array.isArray(aChildren)) {
					return;
				}

				aChildren.forEach(function (oChild, iIndex) {
					const sChildPath = sChildrenBasePath + "/" + iIndex;

					aPaths.push(sChildPath);

					collect(oChild.children || [], sChildPath + "/children");
				});
			};

			if (oParentNode) {
				collect(oParentNode.children || [], sParentPath + "/children");
			}

			return aPaths;
		},

		_collectProductPathsByContextPath: function (aRoots, sParentPath) {
			const oParentNode = this._getNodeByContextPath(aRoots, sParentPath);
			const aPaths = [];

			const collect = function (oNode, sNodePath) {
				if (!oNode) {
					return;
				}

				if (oNode.Kind === "Product" || Number(oNode.CategoryLevel) === 6) {
					aPaths.push(sNodePath);
					return;
				}

				(oNode.children || []).forEach(function (oChild, iIndex) {
					collect(oChild, sNodePath + "/children/" + iIndex);
				});
			};

			if (oParentNode) {
				collect(oParentNode, sParentPath);
			}

			return aPaths;
		},

		_setDeleteBtnState: function (bEnabled, bVisible) {
			const oDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteBtn");
			const oUndoDeleteButton = sap.ui.getCore().byId(idTreePrefix + "ProductListUndoDeleteBtn");

			const oJsonModel = this.base.getView().getModel("jsonModel");
			const bDeleteMode = oJsonModel ? !!oJsonModel.getProperty("/isDeleteMode") : false;

			const bHasDeleted =
				Array.isArray(this._deletedSnapshots) &&
				this._deletedSnapshots.length > 0;

			// Delete button follows current row selection.
			if (typeof bEnabled !== "undefined") {
				if (oDeleteButton && typeof oDeleteButton.setEnabled === "function") {
					oDeleteButton.setEnabled(bEnabled);
				}
			}

			if (typeof bVisible !== "undefined") {
				if (oDeleteButton && typeof oDeleteButton.setVisible === "function") {
					oDeleteButton.setVisible(bVisible);
				}
			}

			// Undo button should NOT follow Delete button visibility.
			// It should show when there is something to undo.
			if (oUndoDeleteButton && typeof oUndoDeleteButton.setEnabled === "function") {
				oUndoDeleteButton.setEnabled(bHasDeleted);
			}

			if (oUndoDeleteButton && typeof oUndoDeleteButton.setVisible === "function") {
				oUndoDeleteButton.setVisible(bDeleteMode && bHasDeleted);
			}
		},

		// ============================================================================
		// Shared Helpers
		// ============================================================================
		_getInitialJsonData: function () {
			return {
				// mode flags
				isDeleteMode: false,
				isReorderMode: false,

				// toolbar / UI flags
				showReset: true,
				hasProductTreeData: false,
				hasVisibleProductTreeData: false,

				// tree data
				productPriceList: [],
				originalProductPriceList: [],
				productPriceListFull: [],

				// delete / selection state
				selectedKeys: [],
				pendingDeletedIds: [],

				// filter state
				productFilterCount: 0,
				productFilter: this._getEmptyProductFilter()
			};
		},

		// suppress re-entrant selection handling when we programmatically change selection
		_bSuppressSelectionChange: false,


		_updateModeToggleEnabled: function () {
			const oView = this.base && this.base.getView && this.base.getView();
			const oJsonModel = oView && oView.getModel("jsonModel");

			if (!oView || !oJsonModel) {
				return;
			}

			this._syncProductTreeDataFlags();

			const bHasVisibleData = !!oJsonModel.getProperty("/hasVisibleProductTreeData");

			const oDeleteModeToggle = sap.ui.getCore().byId(idTreePrefix + "ProductListDeleteModeBtn");
			const oReorderModeToggle = sap.ui.getCore().byId(idTreePrefix + "ProductListReorderModeBtn");

			const oUiModel = oView.getModel("ui");
			const editMode = oUiModel ? oUiModel.getProperty("/editMode") : "Display";
			const bDisplayMode = editMode === "Display";

			if (oDeleteModeToggle && typeof oDeleteModeToggle.setEnabled === "function") {
				oDeleteModeToggle.setEnabled(!bDisplayMode && bHasVisibleData);
			}

			if (oReorderModeToggle && typeof oReorderModeToggle.setEnabled === "function") {
				oReorderModeToggle.setEnabled(!bDisplayMode && bHasVisibleData);
			}
		},

		_syncProductTreeDataFlags: function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");

			if (!oJsonModel) {
				return;
			}

			const aVisibleTree = oJsonModel.getProperty("/productPriceList") || [];
			const aFullTree = oJsonModel.getProperty("/productPriceListFull") || [];
			const aOriginalTree = oJsonModel.getProperty("/originalProductPriceList") || [];

			const bHasVisibleData = Array.isArray(aVisibleTree) && aVisibleTree.length > 0;
			const bHasSourceData =
				bHasVisibleData ||
				(Array.isArray(aFullTree) && aFullTree.length > 0) ||
				(Array.isArray(aOriginalTree) && aOriginalTree.length > 0);

			oJsonModel.setProperty("/hasVisibleProductTreeData", bHasVisibleData);
			oJsonModel.setProperty("/hasProductTreeData", bHasSourceData);
		},

		// ============================================================================
		// Temp - Mocked Data
		// ============================================================================
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
		}



		// _getView: function (oControl) {
		// 	let oC = oControl;
		// 	while (oC) {
		// 		if (oC.isA && oC.isA("sap.ui.core.mvc.View")) {
		// 			return oC;
		// 		}
		// 		oC = oC.getParent && oC.getParent();
		// 	}
		// 	return null;
		// },


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


		// _addUpdateProductList: function (newList) {
		// 	const oView = this.base.getView();
		// 	const currentList = oView.getModel('jsonModel').getProperty("/productPriceList") || [];
		// 	const updatedList = [...currentList];
		// 	let hasChanges = false;

		// 	newList.forEach(newItem => {
		// 		const existingIndex = updatedList.findIndex(item => item.MaterialKey === newItem.MaterialKey);
		// 		if (existingIndex !== -1) {
		// 			// Do nothing
		// 		} else {
		// 			updatedList.push(newItem);
		// 			hasChanges = true;
		// 		}
		// 	});

		// 	if (hasChanges) { return { productList: updatedList, hasChanges: true }; }
		// },


	});
});
