sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/MessageToast',
	'sap/m/MessageBox',
	'sap/ui/export/library',
	'sap/ui/export/ExportHandler'
], function (ControllerExtension, JSONModel, Fragment, Filter, FilterOperator, MessageToast, MessageBox, exportLibrary, ExportHandler) {
	'use strict';

	// ── Module-level constants ────────────────────────────────────────────────────

	/** ID prefix shared by all controls inside the ProductsTree custom sub-section. */
	const ID_TREE_PREFIX = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::ProductsTree--";

	/** ID prefix shared by all custom sub-sections on the Object Page. */
	const SUBSECTION_PREFIX = "pricelistapp.pricelistmaintain::PricelistDataObjectPage--fe::CustomSubSection::";

	/**
	 * Header fields written to `saveProductPriceList` on save and read from the
	 * Object-Page binding context. Must stay in sync with the backend action signature.
	 */
	const HEADER_FIELDS = [
		"ID", "PricelistType", "MarketScopeRegion", "MarketScopeCountry",
		"SalesOrg", "DistChannel", "CustPriceList",
		"CustGroup1", "ErpCustomer", "DeliveringPlant", "MaterialKey"
	];

	/**
	 * Fields selected from the main entity context for the tree-fetch OData action.
	 * Includes EffectiveDate / PublishedDate which are not part of HEADER_FIELDS.
	 */
	const TREE_FETCH_SELECT_FIELDS = [
		"PricelistType", "MarketScopeRegion", "MarketScopeCountry",
		"SalesOrg", "DistChannel", "CustPriceList",
		"CustGroup1", "ErpCustomer", "DeliveringPlant", "EffectiveDate", "PublishedDate"
	];

	/**
	 * Subset of TREE_FETCH_SELECT_FIELDS forwarded as the headerData parameter to
	 * the getProductTreeData action (PublishedDate is not included).
	 */
	const TREE_HEADER_ACTION_FIELDS = [
		"EffectiveDate", "PricelistType", "MarketScopeRegion", "MarketScopeCountry",
		"SalesOrg", "DistChannel", "CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant"
	];

	/**
	 * Header dimension fields used to scope a direct query against the persisted
	 * ProductPriceList entity set (used by _initialLoadProductPriceList). Excludes
	 * MaterialKey — that's a per-row field on individual product nodes, not a
	 * root-level scoping dimension, so filtering by it here would wrongly exclude
	 * every Category row and all but one Product row.
	 */
	const PRODUCT_PRICE_LIST_FILTER_FIELDS = [
		"PricelistType", "MarketScopeRegion", "MarketScopeCountry",
		"SalesOrg", "DistChannel", "CustPriceList",
		"CustGroup1", "ErpCustomer", "DeliveringPlant"
	];

	/**
	 * Columns selected when fetching the ProductPriceList entity set directly.
	 * Mirrors the entity's CDS definition; parent_ID is the FK generated for the
	 * `parent` association and is used to reassemble the tree client-side.
	 */
	const PRODUCT_PRICE_LIST_ENTITY_FIELDS = [
		"ID", "parent_ID", "pricelist_ID",
		"PricelistType", "MarketScopeRegion", "MarketScopeCountry",
		"SalesOrg", "DistChannel", "CustPriceList", "CustGroup1", "ErpCustomer", "DeliveringPlant", "MaterialKey",
		"OrderIndex", "Kind", "CategoryLevel", "Title", "Description",
		"PublishedName", "TermsAndConditions", "IsTACDisableExt", "IsTACDisableInt",
		"Notes", "IsNotesDisableExt", "IsNotesDisableInt",
		"Price", "PriceUnit", "PriceValidFrom", "PriceValidTo",
		"DiscountRate", "DiscountValidFrom", "DiscountValidTo", "PriceChangeIndicator",
		"FuturePrice", "FuturePriceValidFrom", "FuturePriceValidTo",
		"Status", "StatusValidFromDate", "StatusValidToDate",
		"Supplier", "SupplierSKU"
	];

	const PRODUCT_PRICE_UPDATE_FIELDS = [
		"AccessSequence", "ConditionType",
		"Price", "PriceUnit", "PriceValidFrom", "PriceValidTo",
		"DiscountRate", "DiscountValidFrom", "DiscountValidTo",
		"DiscountConditionType", "DiscountAccessSequence",
		"FuturePrice", "FuturePriceValidFrom", "FuturePriceValidTo",
		"Status", "StatusValidFromDate", "StatusValidToDate",
		"Supplier", "SupplierSKU"
	];

	const CATEGORY_NODE_FIELD_CONFIG = [
		{ level: 0, titleField: "MainCategory", descField: "MainCategoryLocal", extraFields: { TermsAndConditions: "MainCategoryTermsandCond" } },
		{ level: 1, titleField: "SubCategory1", descField: "SubCategory1Local", extraFields: { TermsAndConditions: "SubCategory1TermsandCond" } },
		{ level: 2, titleField: "SubCategory2", descField: "SubCategory2Local", extraFields: { TermsAndConditions: "SubCategory2TermsandCond" } },
		{ level: 3, titleField: "SubCategory3", descField: "SubCategory3Local", extraFields: { TermsAndConditions: "SubCategory3TermsandCond" } },
		{ level: 4, titleField: "SubCategory4", descField: "SubCategory4Local", extraFields: { TermsAndConditions: "SubCategory4TermsandCond" } },
		{ level: 5, titleField: "SubCategory5", descField: "SubCategory5Local", extraFields: { TermsAndConditions: "SubCategory5TermsandCond" } }
	];

	/**
	 * Descriptor for each category level (0–5).
	 * Acts as a single source of truth that drives init / clear / bind / sync /
	 * navigation without repetitive switch-case chains or copy-pasted property names.
	 *
	 * @type {{ level: number, showPath: string, dataPath: string, sectionKey: string }[]}
	 */
	const CATEGORY_LEVELS = [
		{ level: 0, showPath: "/showMainCategoryDetails", dataPath: "/selectedMainCategory", sectionKey: "PricelistMainCategory" },
		{ level: 1, showPath: "/showSubCategory1Details", dataPath: "/selectedSubCategory1", sectionKey: "PricelistSubCategory1" },
		{ level: 2, showPath: "/showSubCategory2Details", dataPath: "/selectedSubCategory2", sectionKey: "PricelistSubCategory2" },
		{ level: 3, showPath: "/showSubCategory3Details", dataPath: "/selectedSubCategory3", sectionKey: "PricelistSubCategory3" },
		{ level: 4, showPath: "/showSubCategory4Details", dataPath: "/selectedSubCategory4", sectionKey: "PricelistSubCategory4" },
		{ level: 5, showPath: "/showSubCategory5Details", dataPath: "/selectedSubCategory5", sectionKey: "PricelistSubCategory5" }
	];

	const EdmType = exportLibrary.EdmType;
	const EXPORT_COLUMN_FIELD_MAP = {
		ColCategoriesAndProducts: "Title",
		ColDescription: "Description",
		ColPriceCurrency: "PriceDisplay",
		ColValidity: "PriceValidFrom",
		ColDiscountRate: "DiscountRate",
		ColDiscountValidity: "DiscountValidFrom",
		ColDiscountExpiry: "DiscountValidTo",
		ColPriceChangeIndicator: "PriceChangeIndicator",
		ColFuturePrice: "FuturePriceDisplay",
		ColFuturePriceValidity: "FuturePriceValidityDisplay",
		ColStatus: "Status",
		ColStatusValidFrom: "StatusValidFromDate",
		ColStatusValidTo: "StatusValidToDate",
		ColSupplier: "Supplier",
		ColSupplierSKU: "SupplierSKU"
	};

	/** Controller singleton – exposed via getInstance() for use in fragment event handlers. */
	let _oInstance = null;

	// ─────────────────────────────────────────────────────────────────────────────

	return ControllerExtension.extend('pricelistapp.pricelistmaintain.ext.controller.PricelistMaintainObjectPageExt', {

		// ── Lifecycle hooks ───────────────────────────────────────────────────────

		override: {
			/**
			 * Initialises the JSON model and resets all transient controller state.
			 * Runs once when the controller is instantiated.
			 */
			onInit: function () {
				this.base.getView().setModel(new JSONModel(this._getInitialJsonData()), "jsonModel");

				this._deletedSnapshots = [];
				this._originalSnapshot = null;
				this._lastObjectPageEditMode = null;

				this._initProductDetailSectionState();
			},

			/**
			 * Runs after the Object Page is ready and all controls are rendered.
			 * Caches control references and performs the initial state sync.
			 */
			onPageReady: function () {
				this._productTreeSection = this._getTreeControl("ProductTreeFragment_ID");
				this._productTreeTable = this._getTreeControl("ProductPriceListTreeTable");

				_oInstance = this;

				this._bindProductDetailSubSections();
				this._syncEditModeState();
				this._captureOriginalSnapshotWhenEnteringEditMode();
				this._resetProductDetailState();
				this._attachEditModeListener();

				this._updateProductListNavButtonState({
					singleSelected: false,
					deleteMode: false,
					reorderMode: false
				});

				this._syncProductTreeToolbarState();
				this._updateModeToggleEnabled();

				this._loadProductPriceListOnEnter();
				this._applyDefaultLayoutOnPageLoad();
			},

			editFlow: {
				/**
				 * Serialises the current tree to the backend before Fiori Elements commits
				 * the draft. Returns a rejected promise on error so FE can abort the save.
				 */
				onBeforeSave: function () {
					const oJsonModel = this._getJsonModel();

					// Bug fix: saving while delete/reorder mode is active is not allowed —
					// the user must press "Finish" on that mode first.
					if (oJsonModel.getProperty("/isDeleteMode") || oJsonModel.getProperty("/isReorderMode")) {
						MessageBox.error("Please finish delete or re-order mode before saving your changes.");
						return Promise.reject();
					}

					const aTree = oJsonModel.getProperty("/productPriceList") || [];
					const aPendingDeletedIds = oJsonModel.getProperty("/pendingDeletedIds") || [];

					if (!aTree.length && !aPendingDeletedIds.length) {
						// MessageToast.show("Nothing to save.");
						return Promise.resolve();
					}

					const oHeader = this._getCurrentHeaderData();
					const oOriginalHeader = this._originalHeaderSnapshot || oHeader;

					return this._callSaveProductPriceList(oHeader, oOriginalHeader, aTree);
				},

				/** Clears transient delete / selection state and reloads the persisted tree after a successful save. */
				onAfterSave: function () {
					const oJsonModel = this._getJsonModel();
					if (!oJsonModel) return;

					oJsonModel.setProperty("/pendingDeletedIds", []);
					oJsonModel.setProperty("/selectedKeys", []);

					this._deletedSnapshots = [];

					this._setDeleteBtnState(false, false);

					// Reload from the entity (same function used on initial page load) so the
					// tree picks up server-assigned IDs and becomes the new edit baseline.
					this._initialLoadProductPriceList();
				},

				/** Restores the tree to its pre-edit state when the user discards changes. */
				onBeforeDiscard: function () {
					const oJsonModel = this._getJsonModel();
					if (!oJsonModel) return;

					const aOriginalTree =
						oJsonModel.getProperty("/originalProductPriceList") ||
						this._originalSnapshot ||
						[];

					oJsonModel.setProperty("/productPriceList", this._clone(aOriginalTree));
					oJsonModel.setProperty("/productPriceListFull", this._clone(aOriginalTree));
					oJsonModel.setProperty("/isDeleteMode", false);
					oJsonModel.setProperty("/isReorderMode", false);
					oJsonModel.setProperty("/showReset", true);

					this._resetProductTreeModeButtonsToNormal();
					this._clearProductTreeTransientState();

					this._originalSnapshot = null;
					oJsonModel.setProperty("/originalProductPriceList", []);

					oJsonModel.updateBindings(true);
				}
			}
		},

		// ── Public API for fragment handlers ──────────────────────────────────────

		/** Returns the current controller singleton for use in fragment event handlers. */
		getInstance: function () { return _oInstance; },

		// ── Product list toolbar handlers ─────────────────────────────────────────

		/** Discards all local tree state and re-fetches the pricelist from the server. */
		onResetPrice: async function () {

			// Ask user to prompt for customer number before resetting price list
			let sCustomerNumber = "";
			// sCustomerNumber = await this._openCustomerSelectionDialog();
			// if (sCustomerNumber === null) {
			// 	return;
			// }

			this._clearProductTreeBufferAndSelection();

			this._getProductPriceList(sCustomerNumber)
				.then((aRawData) => {
					this._setTreeTableData(aRawData);
					MessageToast.show("Pricelist reset from server.");
				})
				.catch((oError) => {
					console.error(oError);
					MessageToast.show("Failed to reset pricelist.");
				});
		},

		onRefreshPrice: async function () {
			const oJsonModel = this.base.getView().getModel("jsonModel");
			const aCurrentTree = oJsonModel.getProperty("/productPriceList") || [];
			if (!aCurrentTree.length) {
				MessageToast.show("Cannot refresh prices. No pricelist data loaded.");
				return;
			}

			let sCustomerNumber = "";
			// sCustomerNumber = await this._openCustomerSelectionDialog();
			// if (sCustomerNumber === null) {
			// 	return;
			// }

			this._clearProductTreeBufferAndSelection();

			this._getProductPriceList(sCustomerNumber)
				.then((aFlatData) => {
					if (!aFlatData || !aFlatData.length) {
						return;
					}
					this._refreshPricesOnly(aFlatData);
					// this._setTreeTableData(aFlatData);
					MessageToast.show("Prices refreshed successfully.");
				})
				.catch((oErr) => {
					console.error("Error refreshing prices:", oErr);
					sap.m.MessageBox.error("Cannot refresh prices. Please try again.");
				});
		},

		/**
		* Patches the existing tree structures with fresh pricing data.
		* Updates both the UI model and the internal snapshot for consistency.
		*/
		_refreshPricesOnly: function (aFreshFlatData) {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			// Create a lookup map for faster access
			const freshPriceMap = new Map();
			aFreshFlatData.forEach((row) => {
				if (row.Material) freshPriceMap.set(row.Material, row);
			});

			// Recursive function to apply updates
			const updatePrices = (aNodes) => {
				if (!Array.isArray(aNodes)) return;

				aNodes.forEach((oNode) => {
					if (oNode.Kind === "Product" && oNode.Title) {
						const oFreshRow = freshPriceMap.get(oNode.Title);
						if (oFreshRow) {
							PRODUCT_PRICE_UPDATE_FIELDS.forEach((sField) => {
								oNode[sField] = oFreshRow[sField] ?? null;
							});
							oNode.PriceChangeIndicator = oFreshRow.PriceChangeIndicator || false;
						}
					}
					if (Array.isArray(oNode.children)) {
						updatePrices(oNode.children);
					}
				});
			};

			const aTrees = [
				"/productPriceList",
				"/productPriceListFull"
			];

			aTrees.forEach((sPath) => {
				const aTree = oJsonModel.getProperty(sPath) || [];
				updatePrices(aTree);
				oJsonModel.setProperty(sPath, this._clone(aTree));
			});

			// Sync in-memory snapshot
			const aOrigPricelistTree = oJsonModel.getProperty("/originalProductPriceList") || [];
			this._originalSnapshot = JSON.parse(JSON.stringify(aOrigPricelistTree));

		},

		/**
		 * Scrolls the Object Page to the detail sub-section that corresponds to
		 * the currently selected tree node.
		 *
		 * Blurs the trigger button first to prevent the browser from scrolling back
		 * to the tree after the layout recalculation.
		 */
		onNavigate: function (oEvent) {
			const oSource = oEvent && oEvent.getSource && oEvent.getSource();
			const oDomRef = oSource && oSource.getDomRef && oSource.getDomRef();

			if (oDomRef) oDomRef.blur();
			if (document.activeElement && document.activeElement.blur) {
				document.activeElement.blur();
			}

			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");

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

			// Reveal the correct detail sub-sections before scrolling.
			this._updateDetailSectionsBySelectedContext(oCtx);
			sap.ui.getCore().applyChanges();

			const sSubSectionKey = this._getTargetSubSectionKeyByNode(oSelectedData);

			if (!sSubSectionKey) {
				MessageToast.show("Unable to determine target section.");
				return;
			}

			const sSubSectionId = SUBSECTION_PREFIX + sSubSectionKey;
			const oSubSection = sap.ui.getCore().byId(sSubSectionId);

			if (!oSubSection) {
				MessageToast.show("Target section not found.");
				return;
			}

			// Prefer ObjectPageLayout.scrollToSection for header-aware scrolling;
			// fall back to native scrollIntoView when the layout is not available.
			const oObjectPageLayout = this._findAncestorObjectPageLayout(oTable);

			if (oObjectPageLayout) {
				oObjectPageLayout.scrollToSection(sSubSectionId, 0 /* no animation */);
				return;
			}

			const oSectionDom = oSubSection.getDomRef();
			if (oSectionDom) {
				oSectionDom.scrollIntoView({ behavior: "auto", block: "start" });
			}
		},

		// ── Filter handlers ───────────────────────────────────────────────────────

		onOpenHierarchyFilter: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			if (this._oProductFilterDialog) {
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
			this._clearProductTreeFilter();

			if (this._oProductFilterDialog) {
				this._oProductFilterDialog.close();
			}
		},

		/**
		 * Resets the hierarchy filter back to empty and restores the full tree.
		 * Shared by the explicit "Clear Filter" button and the auto-clear that
		 * happens when entering Delete/Reorder mode with a filter still active.
		 */
		_clearProductTreeFilter: function () {
			const oJsonModel = this._getJsonModel();
			const aFullTree = oJsonModel.getProperty("/productPriceListFull") || [];

			oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());
			oJsonModel.setProperty("/productFilterCount", 0);
			oJsonModel.setProperty("/productPriceList", this._clone(aFullTree));
			oJsonModel.updateBindings(true);

			this._refreshTreeTableBinding();
			this._clearProductDetailSections();

			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: false,
				reorderMode: false
			});

			// Must run AFTER the table selection has been cleared above, since
			// toggle-button enablement now also depends on current selection.
			this._updateModeToggleEnabled();
		},

		onResetHierarchyFilter: function () {
			const oJsonModel = this._getJsonModel();
			oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());
			oJsonModel.updateBindings(true);
		},

		// ── Delete handlers ───────────────────────────────────────────────────────

		onDelete: function () {
			const oTable = this._productTreeTable;
			if (!oTable) return;

			const oModel = this._getJsonModel();
			const aCurrentTree = oModel.getProperty("/productPriceList") || [];
			const aSelectedPaths = oModel.getProperty("/selectedKeys") || [];

			if (!aSelectedPaths.length) {
				MessageToast.show("No rows selected to delete.");
				return;
			}

			// Capture a snapshot before deletion so the operation can be undone.
			const aSnapshot = this._clone(aCurrentTree);

			if (!this._originalSnapshot) {
				this._originalSnapshot = this._clone(aSnapshot);
			}

			this._deletedSnapshots.push({
				tree: aSnapshot,
				pendingDeletedIds: oModel.getProperty("/pendingDeletedIds") || []
			});

			// Accumulate backend IDs that need to be deleted on save.
			const aPendingDeletedIds = oModel.getProperty("/pendingDeletedIds") || [];
			const pendingDeletedIdSet = new Set(aPendingDeletedIds);
			const selectedPathSet = new Set(aSelectedPaths);

			aSelectedPaths.forEach((sPath) => {
				this._collectDescendantPathsByContextPath(aCurrentTree, sPath)
					.forEach((sDescPath) => selectedPathSet.add(sDescPath));
			});

			selectedPathSet.forEach((sPath) => {
				const oNode = this._getNodeByContextPath(aCurrentTree, sPath);
				if (oNode && oNode.ID) pendingDeletedIdSet.add(oNode.ID);
			});

			// Remove rows by context path rather than by ID to avoid accidentally
			// removing sibling products that share the same material number.
			const filterTree = (aNodes, sBasePath) => {
				if (!Array.isArray(aNodes)) return [];

				return aNodes
					.map((oNode, iIndex) => {
						const sNodePath = `${sBasePath}/${iIndex}`;

						if (!oNode || selectedPathSet.has(sNodePath)) return null;

						return Object.assign({}, oNode, {
							children: filterTree(oNode.children || [], `${sNodePath}/children`)
						});
					})
					.filter(Boolean);
			};

			// After removing the selected rows, drop any Category that has become empty
			// Deleting the last child of a parent should delete the parent too. 
			const removeEmptyCategories = (aNodes) => {
				if (!Array.isArray(aNodes)) return [];

				return aNodes
					.map((oNode) => {
						if (!oNode) return null;

						const aCleanChildren = removeEmptyCategories(oNode.children || []);
						const oUpdatedNode = Object.assign({}, oNode, { children: aCleanChildren });

						if (oUpdatedNode.Kind === "Category" && aCleanChildren.length === 0) {
							if (oUpdatedNode.ID) pendingDeletedIdSet.add(oUpdatedNode.ID);
							return null;
						}

						return oUpdatedNode;
					})
					.filter(Boolean);
			};
			const aCleanTree = removeEmptyCategories(filterTree(aCurrentTree, "/productPriceList"));

			oModel.setProperty("/productPriceList", aCleanTree);
			oModel.setProperty("/pendingDeletedIds", Array.from(pendingDeletedIdSet));
			oModel.setProperty("/selectedKeys", []);

			oModel.updateBindings(true);

			if (oTable.clearSelection) oTable.clearSelection();

			this._refreshTreeTableBinding(oTable);
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
			const oModel = this._getJsonModel();
			const aTree = Array.isArray(oSnapshot) ? oSnapshot : oSnapshot.tree;
			const aPendingDeletedIds = Array.isArray(oSnapshot) ? [] : (oSnapshot.pendingDeletedIds || []);

			oModel.setProperty("/productPriceList", this._clone(aTree));
			oModel.setProperty("/pendingDeletedIds", aPendingDeletedIds);
			oModel.setProperty("/selectedKeys", []);

			const oTable = this._getTreeControl("ProductPriceListTreeTable");
			if (oTable && oTable.clearSelection) oTable.clearSelection();

			// Must run AFTER the table selection has been cleared above, since
			// toggle-button enablement now also depends on current selection.
			this._updateModeToggleEnabled();

			this._setDeleteBtnState(false, false);

			MessageToast.show("Deletion is undone.");
		},

		// ── Delete / reorder mode toggle handlers ─────────────────────────────────

		/** Entry point for the "Delete" mode ToggleButton (delegated from ProductList.js). */
		onToggleDeleteMode: function (oEvent) {
			this._handleProductTreeModeToggle(oEvent, "Delete");
		},

		/** Entry point for the "Re-order" mode ToggleButton (delegated from ProductList.js). */
		onToggleReorderMode: function (oEvent) {
			this._handleProductTreeModeToggle(oEvent, "Reorder");
		},

		/**
		 * Shared logic behind the Delete / Reorder mode ToggleButtons.
		 *
		 * Guards enforced here:
		 *  - The Object Page must be in Edit mode (Display mode never allows these modes).
		 *  - An active hierarchy filter is auto-cleared before entering, since delete/
		 *    reorder operate on context paths into the full tree, which a filter would
		 *    make ambiguous. The user is informed via a toast rather than being blocked.
		 *
		 * @param {sap.ui.base.Event} oEvent
		 * @param {"Delete"|"Reorder"} sMode
		 */
		_handleProductTreeModeToggle: function (oEvent, sMode) {
			const oToggleButton = oEvent.getSource();
			const bRequestedOn = oToggleButton.getPressed();

			if (this._isObjectPageDisplayMode()) {
				oToggleButton.setPressed(false);
				return;
			}

			// Toggling OFF always returns to normal browsing — no guards needed.
			if (!bRequestedOn) {
				this._setProductTreeModeState("Display");
				return;
			}

			const oJsonModel = this._getJsonModel();
			const bFilterActive = !!oJsonModel && (oJsonModel.getProperty("/productFilterCount") || 0) > 0;

			if (bFilterActive) {
				this._clearProductTreeFilter();
				MessageToast.show("Filter cleared automatically because you entered " + sMode.toLowerCase() + " mode.");
			}

			this._setProductTreeModeState(sMode);
		},

		// ── Product tree data ─────────────────────────────────────────────────────

		/**
		 * Reads header data from the current Object-Page binding context, then calls
		 * the `getProductTreeData` OData action to retrieve the flat product list.
		 *
		 * @returns {Promise<object[]>} Flat product rows from the backend.
		 */
		_getProductPriceList: function (sCustomerNumber) {
			const oView = this.base.getView();
			const oModel = oView.getModel();
			const oContext = oView.getBindingContext();

			if (!oContext) return Promise.resolve([]);

			return oModel
				.bindContext(oContext.getPath(), null, {
					$select: TREE_FETCH_SELECT_FIELDS.join(",")
				})
				.requestObject()
				.then((oData) => {
					const oHeaderData = TREE_HEADER_ACTION_FIELDS.reduce((oAcc, sField) => {
						oAcc[sField] = oData[sField];
						return oAcc;
					}, {});

					//Additional fields
					oHeaderData.CustomerNumber = sCustomerNumber ? sCustomerNumber : "";

					const oAction = oModel.bindContext("/getProductTreeData(...)");
					oAction.setParameter("headerData", JSON.stringify(oHeaderData));

					return oAction.execute().then(() => {
						const oResult = oAction.getBoundContext().getObject();
						return oResult.value || oResult || [];
					});
				});
		},

		/**
		 * Converts flat backend data into a hierarchical tree and stores it in the
		 * JSON model. Does NOT update `originalProductPriceList` – that snapshot is
		 * only captured when the user enters edit mode.
		 *
		 * @param {object[]} aFlatData Flat rows from the backend.
		 */
		_setTreeTableData: function (aFlatData) {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			const aTreeData = Array.isArray(aFlatData) && aFlatData.length
				? this._buildTreeFromFlatData(aFlatData)
				: [];

			oJsonModel.setProperty("/productPriceList", this._clone(aTreeData));
			oJsonModel.setProperty("/productPriceListFull", this._clone(aTreeData));

			this._clearProductTreeTransientState();
			oJsonModel.updateBindings(true);
		},

		// ── Initial load (direct from the ProductPriceList entity) ─────────────────
		//
		// Distinct from _getProductPriceList/_setTreeTableData above (used by the
		// "Reset Pricelist" button, which re-derives the tree via the
		// getProductTreeData action) and from onRefreshPrice (its own separate
		// purpose). This reads the already-persisted, already-hierarchical
		// ProductPriceList entity directly. Used on initial page load and again
		// after every successful Save, so the tree always reflects exactly what is
		// on the backend — including server-assigned IDs for newly created rows.

		/**
		 * Loads the persisted ProductPriceList hierarchy and shows it in the tree.
		 * Also becomes the new "original" snapshot baseline for Discard, since at
		 * the moment this runs (page load, or right after a successful save) there
		 * are by definition no unsaved edits yet.
		 *
		 * @returns {Promise<void>}
		 */
		_initialLoadProductPriceList: function () {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return Promise.resolve();

			return this._fetchProductPriceListEntityTree()
				.then((aTree) => {
					oJsonModel.setProperty("/productPriceList", this._clone(aTree));
					oJsonModel.setProperty("/productPriceListFull", this._clone(aTree));
					oJsonModel.setProperty("/originalProductPriceList", this._clone(aTree));

					this._originalSnapshot = this._clone(aTree);

					this._clearProductTreeTransientState();
					oJsonModel.updateBindings(true);
				})
				.catch((oError) => {
					console.error(oError);
					MessageToast.show("Failed to load the pricelist.");
				});
		},

		_loadProductPriceListOnEnter: function () {
			const oContext = this.base.getView().getBindingContext();
			const sContextPath = oContext && oContext.getPath();
			const oJsonModel = this._getJsonModel();
			const aExistingTree = oJsonModel ? (oJsonModel.getProperty("/productPriceList") || []) : [];

			const bSameContextAlreadyLoaded =
				sContextPath &&
				this._lastLoadedContextPath === sContextPath &&
				aExistingTree.length > 0;

			if (bSameContextAlreadyLoaded) {
				return Promise.resolve();
			}

			return this._initialLoadProductPriceList().then(() => {
				this._lastLoadedContextPath = sContextPath;
			});
		},

		/**
		 * Fetches flat ProductPriceList rows scoped to the current header context
		 * and assembles them into a tree via their parent/ID relationships.
		 *
		 * @returns {Promise<object[]>} Root-level tree nodes.
		 */
		_fetchProductPriceListEntityTree: function () {
			const oView = this.base.getView();
			const oContext = oView.getBindingContext();

			if (!oContext) return Promise.resolve([]);

			const oODataModel = oView.getModel();

			const sHeaderId = oContext.getProperty("ID");
			if (!sHeaderId) return Promise.resolve([]);

			const aFilters = [new Filter("pricelist_ID", FilterOperator.EQ, sHeaderId)];

			const oListBinding = oODataModel.bindList("/ProductPriceList", null, [], aFilters, {
				$select: PRODUCT_PRICE_LIST_ENTITY_FIELDS.join(","),
				$orderby: "OrderIndex"
			});

			return oListBinding.requestContexts(0, 10000).then((aContexts) =>
				this._buildTreeFromEntityRows(aContexts.map((oCtx) => oCtx.getObject()))
			);



		},

		/**
		 * Nests flat ProductPriceList rows into a tree using ID / parent_ID.
		 * Unlike _buildTreeFromFlatData, no synthetic category construction is
		 * needed — the entity already carries Kind/CategoryLevel/Title per row.
		 *
		 * @param {object[]} aFlatRows
		 * @returns {object[]} Root-level tree nodes, each level sorted by OrderIndex.
		 */
		_buildTreeFromEntityRows: function (aFlatRows) {
			if (!Array.isArray(aFlatRows) || !aFlatRows.length) return [];

			const mById = {};
			const aRoots = [];

			aFlatRows.forEach((oRow) => {
				mById[oRow.ID] = Object.assign({}, oRow, { children: [] });
			});

			aFlatRows.forEach((oRow) => {
				const oNode = mById[oRow.ID];
				const sParentId = oRow.parent_ID;

				if (sParentId && mById[sParentId]) {
					oNode.parent = { ID: sParentId };
					mById[sParentId].children.push(oNode);
				} else {
					oNode.parent = null;
					aRoots.push(oNode);
				}
			});

			const sortRec = (aNodes) => {
				aNodes.sort((a, b) => (a.OrderIndex || 0) - (b.OrderIndex || 0));
				aNodes.forEach((oNode) => {
					if (oNode.children.length) sortRec(oNode.children);
				});
			};

			sortRec(aRoots);

			return aRoots;
		},

		/**
		 * Transforms a flat array of product rows into a nested Category / Product tree.
		 * Category nodes at each level are deduplicated by path key; product nodes are
		 * always leaf nodes (no children).
		 *
		 * Category levels are skipped automatically when their title field is empty,
		 * so products attach to the nearest valid ancestor.
		 *
		 * @param {object[]} flatData
		 * @returns {object[]} Root-level tree nodes.
		 */
		_buildTreeFromFlatData: function (flatData) {
			const tree = [];
			const nodeMap = {};

			flatData.forEach((row, rowIndex) => {
				let parentNode = null;
				let currentPath = "";

				/**
				 * Finds or creates a Category node for the given level.
				 * Mutates `parentNode` and `currentPath` via closure.
				 */
				const addCategoryNode = (oLevelConfig) => {
					const title = row[oLevelConfig.titleField];
					if (!title) return; // skip empty levels

					currentPath = (currentPath ? `${currentPath}|` : "") + title;

					if (!nodeMap[currentPath]) {

						const oExtraFields = Object.entries(oLevelConfig.extraFields).reduce((oAcc, [sNodeField, sSourceField]) => {
							oAcc[sNodeField] = row[sSourceField] || null;
							return oAcc;
						}, {});

						const newNode = {
							...this._buildSharedNodeFields(row),
							ID: `cat-${oLevelConfig.level}-${currentPath.replace(/\s+/g, '-')}`,
							Sequence: row.Sequence,
							OrderIndex: Object.keys(nodeMap).length + 1,
							Kind: "Category",
							CategoryLevel: oLevelConfig.level,
							Title: title,
							Description: row[oLevelConfig.descField] || null,
							...oExtraFields,

							// Categories carry no price or discount data.
							Price: null, PriceUnit: null,
							PriceValidFrom: null, PriceValidTo: null,
							DiscountRate: null, DiscountValidFrom: null,
							DiscountValidTo: null, PriceChangeIndicator: false,
							FuturePrice: null, FuturePriceValidFrom: null,
							FuturePriceValidTo: null,
							Status: null, StatusValidFromDate: null,
							StatusValidToDate: null, Supplier: null,
							SupplierSKU: null,

							parent: parentNode ? { ID: parentNode.ID } : null,
							children: []
						};

						nodeMap[currentPath] = newNode;

						if (parentNode) {
							parentNode.children.push(newNode);
						} else {
							tree.push(newNode);
						}
					} else {
						const oExisting = nodeMap[currentPath];
						Object.entries(oLevelConfig.extraFields).forEach(([sNodeField, sSourceField]) => {
							const vCurrent = oExisting[sNodeField];
							if ((vCurrent === null || vCurrent === undefined || vCurrent === "") && row[sSourceField]) {
								oExisting[sNodeField] = row[sSourceField];
							}
						});
					}

					parentNode = nodeMap[currentPath];
				};

				// Build category hierarchy; empty levels are skipped automatically.
				CATEGORY_NODE_FIELD_CONFIG.forEach(addCategoryNode);

				// Leaf product node (CategoryLevel 6).
				if (row.Material) {
					const productNode = {
						...this._buildSharedNodeFields(row),
						ID: row.ID || row.Material,
						Sequence: row.Sequence,
						OrderIndex: rowIndex + 1,
						Kind: "Product",
						CategoryLevel: 6,
						Title: row.Material,
						Description: row.MaterialDescription,

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
						children: []
					};

					if (parentNode) {
						parentNode.children.push(productNode);
					} else {
						// Fallback: product has no category parent – attach to root.
						tree.push(productNode);
					}
				}
			});

			return tree;
		},

		/**
		 * Returns the fields that are identical between Category and Product nodes.
		 * Used internally by _buildTreeFromFlatData to avoid duplication.
		 * @private
		 */
		_buildSharedNodeFields: function (row) {
			return {
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

				PublishedName: row.PublishedName,
				TermsAndConditions: row.TermsAndConditions,
				IsTACDisableExt: row.IsTACDisableExt,
				IsTACDisableInt: row.IsTACDisableInt,
				Notes: row.Notes,
				IsNotesDisableExt: row.IsNotesDisableExt,
				IsNotesDisableInt: row.IsNotesDisableInt
			};
		},

		// ── Product tree filter ───────────────────────────────────────────────────

		_applyProductTreeFilter: function () {
			const oJsonModel = this._getJsonModel();
			const aFullTree = oJsonModel.getProperty("/productPriceListFull") || [];
			const oFilter = oJsonModel.getProperty("/productFilter") || this._getEmptyProductFilter();
			const iCount = this._getProductFilterCount(oFilter);

			oJsonModel.setProperty("/productFilterCount", iCount);

			if (iCount === 0) {
				oJsonModel.setProperty("/productPriceList", this._clone(aFullTree));
				oJsonModel.updateBindings(true);
				this._updateModeToggleEnabled();
				this._clearProductDetailSections();
				return;
			}

			oJsonModel.setProperty("/productPriceList", this._filterProductTree(aFullTree, oFilter));
			oJsonModel.updateBindings(true);

			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");

			if (oTable) {
				if (oTable.clearSelection) oTable.clearSelection();

				this._refreshTreeTableBinding(oTable);

				if (oTable.expandToLevel) oTable.expandToLevel(7);
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
			const filterNodes = (aNodes, aParentChain) => {
				if (!Array.isArray(aNodes)) return [];

				return aNodes
					.map((oNode) => {
						if (!oNode) return null;

						const aChildren = filterNodes(oNode.children || [], aParentChain.concat(oNode));
						const bNodeMatched = this._doesProductTreeNodeMatchFilter(oNode, aParentChain, oFilter);

						if (!bNodeMatched && !aChildren.length) return null;

						return Object.assign({}, oNode, { children: aChildren });
					})
					.filter(Boolean);
			};

			return filterNodes(aTree, []);
		},

		_doesProductTreeNodeMatchFilter: function (oNode, aParentChain, oFilter) {

			// ── Local helpers ──────────────────────────────────────────────────────
			const contains = (value, search) => {
				if (search === undefined || search === null || String(search).trim() === "") return true;
				return String(value || "").toLowerCase().includes(String(search).trim().toLowerCase());
			};

			const hasValue = (value) =>
				value !== undefined && value !== null && String(value).trim() !== "";

			const toBool = (value) =>
				value === true || value === "true" ||
				value === "X" || value === "x" ||
				value === "Yes" || value === "YES";

			const getCategoryByLevel = (iLevel) => {
				const oFromParent = (aParentChain || []).find(
					(oParent) => oParent && Number(oParent.CategoryLevel) === iLevel
				);
				if (oFromParent) return oFromParent.Title;
				if (Number(oNode.CategoryLevel) === iLevel) return oNode.Title;
				return "";
			};

			// ── Filter evaluation ──────────────────────────────────────────────────
			const bIsProduct = oNode.Kind === "Product" || Number(oNode.CategoryLevel) === 6;
			const sProductMat = bIsProduct ? [oNode.Title, oNode.Material, oNode.MaterialKey].join(" ") : "";
			const sProductDesc = bIsProduct ? [oNode.Description, oNode.MaterialDescription].join(" ") : "";

			// Title column (applies to both categories and products)
			if (!contains(oNode.Title, oFilter.title)) return false;

			// Category columns
			if (!contains(getCategoryByLevel(0), oFilter.mainCategory)) return false;
			if (!contains(getCategoryByLevel(1), oFilter.subCategory1)) return false;
			if (!contains(getCategoryByLevel(2), oFilter.subCategory2)) return false;
			if (!contains(getCategoryByLevel(3), oFilter.subCategory3)) return false;
			if (!contains(getCategoryByLevel(4), oFilter.subCategory4)) return false;
			if (!contains(getCategoryByLevel(5), oFilter.subCategory5)) return false;

			// Material / description (product-level fields)
			if (!contains(sProductMat, oFilter.material)) return false;
			if (!contains(sProductDesc, oFilter.description)) return false;

			// Price
			if (!contains(oNode.Price, oFilter.price)) return false;
			if (!contains(oNode.PriceUnit, oFilter.priceUnit)) return false;

			if (oFilter.hasPrice === "Yes" && !hasValue(oNode.Price)) return false;
			if (oFilter.hasPrice === "No" && hasValue(oNode.Price)) return false;

			if (!contains(oNode.PriceValidFrom, oFilter.priceValidFrom)) return false;
			if (!contains(oNode.PriceValidTo, oFilter.priceValidTo)) return false;

			// Discount
			if (!contains(oNode.DiscountRate, oFilter.discountRate)) return false;

			if (oFilter.hasDiscount === "Yes" && !hasValue(oNode.DiscountRate)) return false;
			if (oFilter.hasDiscount === "No" && hasValue(oNode.DiscountRate)) return false;

			if (!contains(oNode.DiscountEffectiveToDate, oFilter.discountEffectiveToDate)) return false;

			// Price change indicator
			if (oFilter.priceChangeIndicator === "Yes" && !toBool(oNode.PriceChangeIndicator)) return false;
			if (oFilter.priceChangeIndicator === "No" && toBool(oNode.PriceChangeIndicator)) return false;

			// Future price
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
			const TEXT_KEYS = [
				"title",
				"mainCategory", "subCategory1", "subCategory2",
				"subCategory3", "subCategory4", "subCategory5",
				"description", "material",
				"price", "priceUnit", "priceValidFrom", "priceValidTo",
				"discountRate", "discountEffectiveToDate",
				"futurePrice", "futurePriceValidFrom", "futurePriceValidTo",
				"status", "statusValidFromDate", "statusValidToDate",
				"supplier", "supplierSKU"
			];

			const hasText = (v) => v !== undefined && v !== null && String(v).trim() !== "";

			let iCount = TEXT_KEYS.filter((sKey) => hasText(oFilter[sKey])).length;

			if (oFilter.hasPrice && oFilter.hasPrice !== "All") iCount++;
			if (oFilter.hasDiscount && oFilter.hasDiscount !== "All") iCount++;
			if (oFilter.priceChangeIndicator && oFilter.priceChangeIndicator !== "All") iCount++;

			return iCount;
		},

		_getEmptyProductFilter: function () {
			return {
				title: "",

				mainCategory: "", subCategory1: "", subCategory2: "",
				subCategory3: "", subCategory4: "", subCategory5: "",

				description: "",
				material: "",

				price: "", priceUnit: "",
				priceValidFrom: "", priceValidTo: "",
				hasPrice: "All",

				discountRate: "",
				discountEffectiveToDate: "",
				hasDiscount: "All",

				priceChangeIndicator: "All",
				futurePrice: "", futurePriceValidFrom: "", futurePriceValidTo: "",

				status: "", statusValidFromDate: "", statusValidToDate: "",

				supplier: "",
				supplierSKU: ""
			};
		},

		// ── Product tree selection / navigation ───────────────────────────────────

		_getProductTreeModeState: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");
			const editMode = oView.getModel("ui").getProperty("/editMode");
			const bDisplay = editMode === "Display";

			return {
				editMode: editMode,
				displayMode: bDisplay,
				deleteMode: !bDisplay && !!oJsonModel.getProperty("/isDeleteMode"),
				reorderMode: !bDisplay && !!oJsonModel.getProperty("/isReorderMode")
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

			// Delete / Reorder mode toggles require a single selected row to be
			// enterable, mirroring the Nav button's enablement rule.
			this._updateModeToggleEnabled();

			// In delete or reorder mode, hide all detail sections.
			if (mMode.deleteMode || mMode.reorderMode) {
				this._clearProductDetailSections();
				return;
			}

			// In display / normal edit mode, require exactly one selection for details.
			if (!bSingleSelected || !oSelectedContext || !oSelectedData) {
				this._clearProductDetailSections();
				return;
			}

			this._updateDetailSectionsBySelectedContext(oSelectedContext);
		},

		/** Called from the XML view when the table selection changes in display mode. */
		_onSelectionChangeDisplayMode: function () {
			this._setDeleteBtnState(false);
		},

		_onSelectionChangeDeleteMode: function (oEvent) {
			if (this._bSuppressSelectionChange) return;

			const oTable = this._productTreeTable || oEvent.getSource();
			if (!oTable) return;

			const oModel = this._getJsonModel();
			const aRoots = oModel.getProperty("/productPriceList") || [];

			// Build the initial set of selected paths from the TreeTable's current state.
			const aSelectedIndices = oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];
			const selectedPaths = new Set(
				aSelectedIndices
					.map((i) => oTable.getContextByIndex(i))
					.filter((oCtx) => oCtx && oCtx.getPath)
					.map((oCtx) => oCtx.getPath())
			);

			const oRowCtx = oEvent.getParameter && oEvent.getParameter("rowContext");
			const oClickedRow = oRowCtx && oRowCtx.getObject ? oRowCtx.getObject() : null;
			const sClickedPath = oRowCtx && oRowCtx.getPath ? oRowCtx.getPath() : null;

			let bNeedsExpand = false;

			// Category click → cascade select / deselect to all descendants.
			if (oClickedRow && oClickedRow.Kind === "Category" && sClickedPath) {
				const aDescendantPaths = this._collectDescendantPathsByContextPath(aRoots, sClickedPath);
				const bNowSelected = selectedPaths.has(sClickedPath);

				aDescendantPaths.forEach((sPath) => {
					if (bNowSelected) {
						selectedPaths.add(sPath);
					} else {
						selectedPaths.delete(sPath);
					}
				});

				// Only SELECTING needs descendants to be visible/reachable in order to
				// apply selection to them — deselecting just drops paths from the set,
				// which works regardless of expand state. Only bother with the (scoped)
				// expand pass when the clicked category actually has children.
				if (bNowSelected) {
					const oClickedNode = this._getNodeByContextPath(aRoots, sClickedPath);
					bNeedsExpand = !!(oClickedNode && Array.isArray(oClickedNode.children) && oClickedNode.children.length);
				}
			}

			// Product click: the TreeTable already toggled that product only.
			// We intentionally do NOT auto-select the parent category or siblings.

			const finalizeDeleteModeSelection = () => {
				// Cleanup: if a category is selected but not ALL its product descendants
				// are also selected, remove the category from the selection set.
				const cleanupParentSelection = (aNodes, sBasePath) => {
					if (!Array.isArray(aNodes)) return;

					aNodes.forEach((oNode, iIndex) => {
						const sNodePath = `${sBasePath}/${iIndex}`;
						if (!oNode) return;

						cleanupParentSelection(oNode.children || [], `${sNodePath}/children`);

						if (oNode.Kind !== "Category" || !selectedPaths.has(sNodePath)) return;

						const aProductPaths = this._collectProductPathsByContextPath(aRoots, sNodePath);
						const bAllSelected =
							aProductPaths.length > 0 &&
							aProductPaths.every((sPath) => selectedPaths.has(sPath));

						if (!bAllSelected) selectedPaths.delete(sNodePath);
					});
				};

				cleanupParentSelection(aRoots, "/productPriceList");

				// Re-apply the resolved selection set back to the TreeTable UI.
				this._bSuppressSelectionChange = true;

				try {
					if (oTable.clearSelection) oTable.clearSelection();

					const oRowsBinding = oTable.getBinding("rows");
					const iLength = oRowsBinding && oRowsBinding.getLength ? oRowsBinding.getLength() : 0;

					for (let i = 0; i < iLength; i++) {
						const oCtx = oTable.getContextByIndex(i);
						if (!oCtx || !oCtx.getPath) continue;

						if (selectedPaths.has(oCtx.getPath())) {
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

				const aFinalPaths = Array.from(selectedPaths);
				oModel.setProperty("/selectedKeys", aFinalPaths);

				const bHasSelection = aFinalPaths.length > 0;
				this._setDeleteBtnState(bHasSelection, bHasSelection);
			};

			if (!bNeedsExpand) {
				finalizeDeleteModeSelection();
				return;
			}

			// Expanding a large collapsed branch can take a moment — show busy state
			// so the click visibly registers and the user doesn't re-click. Deferred
			// via setTimeout so the busy indicator actually paints before the
			// (synchronous) expand loop runs.
			if (oTable.setBusy) oTable.setBusy(true);

			setTimeout(() => {
				try {
					this._expandProductTreeCategorySubtree(oTable, sClickedPath);
					finalizeDeleteModeSelection();
				} finally {
					if (oTable.setBusy) oTable.setBusy(false);
				}
			}, 0);
		},

		/**
		 * Expands every collapsed Category node within the subtree rooted at
		 * sParentPath (inclusive), so all of its descendants — however deeply
		 * nested — become reachable via getContextByIndex/addSelectionInterval.
		 *
		 * Scoped strictly to this one subtree; does NOT expand the rest of the tree.
		 * Safe to call on an already-expanded subtree (no-op).
		 *
		 * @param {sap.ui.table.TreeTable} oTable
		 * @param {string} sParentPath Context path of the category to expand, e.g. "/productPriceList/0".
		 */
		_expandProductTreeCategorySubtree: function (oTable, sParentPath) {
			if (!oTable || !sParentPath) return;

			const sChildPrefix = sParentPath + "/children/";
			let bExpandedSomething = true;
			let iSafety = 0;

			// Row indices shift every time a node is expanded, so each pass rescans
			// from the top and expands at most one node before restarting. The
			// safety cap guards against unexpected infinite loops on malformed data.
			while (bExpandedSomething && iSafety < 500) {
				bExpandedSomething = false;
				iSafety++;

				const oRowsBinding = oTable.getBinding("rows");
				const iLength = oRowsBinding && oRowsBinding.getLength ? oRowsBinding.getLength() : 0;

				for (let i = 0; i < iLength; i++) {
					const oCtx = oTable.getContextByIndex(i);
					if (!oCtx || !oCtx.getPath) continue;

					const sPath = oCtx.getPath();
					if (sPath !== sParentPath && sPath.indexOf(sChildPrefix) !== 0) continue;

					const oData = oCtx.getObject();
					const bIsCollapsedCategoryWithChildren =
						oData && oData.Kind === "Category" &&
						Array.isArray(oData.children) && oData.children.length &&
						oTable.isExpanded && !oTable.isExpanded(i);

					if (bIsCollapsedCategoryWithChildren) {
						oTable.expand(i);
						bExpandedSomething = true;
						break;
					}
				}
			}
		},

		_updateProductListNavButtonState: function (mState) {
			const oNavButton = this._getTreeControl("ProductListNavBtn");
			if (!oNavButton) return;

			if (mState.reorderMode) {
				oNavButton.setVisible(false);
				oNavButton.setEnabled(false);
				return;
			}

			// In delete mode the button is visible but always disabled.
			oNavButton.setVisible(true);
			oNavButton.setEnabled(!mState.deleteMode && !!mState.singleSelected);
		},

		/**
		 * Walks the model path of the given binding context and returns an ordered
		 * array of all ancestor + the selected node itself, from root to leaf.
		 */
		_getNodeChainFromContext: function (oCtx) {
			const oModel = oCtx.getModel();
			const aParts = oCtx.getPath().split("/").filter(Boolean);
			const aChain = [];
			let sCurrentPath = "";

			aParts.forEach((sPart) => {
				sCurrentPath += "/" + sPart;

				// Only numeric segments represent actual tree node array indices.
				if (/^\d+$/.test(sPart)) {
					const oNode = oModel.getProperty(sCurrentPath);
					if (oNode && (oNode.Kind === "Category" || oNode.Kind === "Product")) {
						aChain.push(oNode);
					}
				}
			});

			return aChain;
		},

		/**
		 * Maps a tree node to the Object-Page sub-section key that should be
		 * scrolled to / made visible when the node is selected.
		 *
		 * @param {object} oNode
		 * @returns {string|null} Sub-section key, or null if the node type is unknown.
		 */
		_getTargetSubSectionKeyByNode: function (oNode) {
			if (!oNode) return null;

			if (oNode.Kind === "Product" || oNode.CategoryLevel === 6) {
				return "ProductDetails";
			}

			const oDescriptor = CATEGORY_LEVELS[oNode.CategoryLevel];
			return oDescriptor ? oDescriptor.sectionKey : null;
		},

		// ── Product detail sections ───────────────────────────────────────────────

		/** Resets all detail-section visibility flags and clears selected data objects. */
		_initProductDetailSectionState: function () {
			const oJsonModel = this._getJsonModel();

			CATEGORY_LEVELS.forEach(({ showPath, dataPath }) => {
				oJsonModel.setProperty(showPath, false);
				oJsonModel.setProperty(dataPath, null);
			});

			oJsonModel.setProperty("/showProductDetails", false);
			oJsonModel.setProperty("/selectedProduct", null);
		},

		/** Binds each detail sub-section element to its corresponding JSON model path. */
		_bindProductDetailSubSections: function () {
			CATEGORY_LEVELS.forEach(({ sectionKey, dataPath }) => {
				this._bindDetailSubSection(sectionKey, dataPath);
			});

			this._bindDetailSubSection("ProductDetails", "/selectedProduct");
		},

		_bindDetailSubSection: function (sSubSectionKey, sJsonPath) {
			const oSubSection = this._getSubSection(sSubSectionKey);
			if (oSubSection && typeof oSubSection.bindElement === "function") {
				oSubSection.bindElement({ path: sJsonPath, model: "jsonModel" });
			}
		},

		/** Hides all detail sub-sections and clears their data objects. */
		_clearProductDetailSections: function () {
			const oJsonModel = this._getJsonModel();

			CATEGORY_LEVELS.forEach(({ showPath, dataPath }) => {
				oJsonModel.setProperty(showPath, false);
				oJsonModel.setProperty(dataPath, null);
			});

			oJsonModel.setProperty("/showProductDetails", false);
			oJsonModel.setProperty("/selectedProduct", null);

			oJsonModel.updateBindings(true);
			this._syncProductDetailSubSectionVisibility();
		},

		/**
		 * Walks the ancestor chain of the given binding context and makes visible
		 * only the sub-sections relevant to the selected node and its ancestors.
		 */
		_updateDetailSectionsBySelectedContext: function (oCtx) {
			const oJsonModel = this._getJsonModel();

			this._clearProductDetailSections();

			if (!oCtx) return;

			const aChain = this._getNodeChainFromContext(oCtx);

			aChain.forEach((oNode) => {
				if (!oNode) return;

				if (oNode.Kind === "Product" || oNode.CategoryLevel === 6) {
					oJsonModel.setProperty("/selectedProduct", oNode);
					oJsonModel.setProperty("/showProductDetails", true);
					return;
				}

				const oDescriptor = CATEGORY_LEVELS[oNode.CategoryLevel];
				if (oDescriptor) {
					oJsonModel.setProperty(oDescriptor.dataPath, oNode);
					oJsonModel.setProperty(oDescriptor.showPath, true);
				}
			});

			oJsonModel.updateBindings(true);
			this._syncProductDetailSubSectionVisibility();
		},

		_setDetailSubSectionVisible: function (sSubSectionKey, bVisible) {
			const oSubSection = this._getSubSection(sSubSectionKey);
			if (oSubSection && typeof oSubSection.setVisible === "function") {
				oSubSection.setVisible(bVisible);
			}
		},

		/** Reads visibility flags from the JSON model and applies them to the DOM. */
		_syncProductDetailSubSectionVisibility: function () {
			const oJsonModel = this._getJsonModel();

			CATEGORY_LEVELS.forEach(({ showPath, sectionKey }) => {
				this._setDetailSubSectionVisible(sectionKey, !!oJsonModel.getProperty(showPath));
			});

			this._setDetailSubSectionVisible(
				"ProductDetails",
				!!oJsonModel.getProperty("/showProductDetails")
			);
		},

		// ── Delete persistence / helpers ──────────────────────────────────────────

		_persistPendingDeletes: async function (aDeletedIds, oPageContext) {
			if (!Array.isArray(aDeletedIds) || !aDeletedIds.length) return;

			const oODataModel = this.base.getView().getModel();
			const oJsonModel = this._getJsonModel();
			const aOriginalTree = oJsonModel
				? (oJsonModel.getProperty("/originalProductPriceList") || [])
				: [];

			for (const sId of aDeletedIds) {
				const oNode = this._findNodeById(aOriginalTree, sId);
				const sEntityPath = this._getDeleteEntityPath(sId, oNode, oPageContext);
				const oContext = oODataModel.bindContext(sEntityPath).getBoundContext();

				if (!oContext || !oContext.delete) {
					throw new Error(`Cannot create delete context for ${sEntityPath}`);
				}

				await oContext.delete("$auto");
			}
		},

		_getDeleteEntityPath: function (sId, oNode, oPageContext) {
			const aKeys = [`ID=${sId}`];

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
				aKeys.push(`IsActiveEntity=${bIsActiveEntity}`);
			}

			return `/ProductPriceList(${aKeys.join(",")})`;
		},

		/**
		 * Given a flat list of deleted IDs and the original tree, returns only the
		 * top-level IDs (i.e. IDs whose ancestors were NOT also deleted).
		 */
		_getTopLevelDeletedIds: function (aDeletedIds, aOriginalTree) {
			const oDeletedSet = new Set(aDeletedIds || []);
			const aResult = [];

			const walk = (aNodes, bAncestorDeleted) => {
				if (!Array.isArray(aNodes)) return;

				aNodes.forEach((oNode) => {
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
				if (oNode.ID === sId) return oNode;

				const oFound = this._findNodeById(oNode.children || [], sId);
				if (oFound) return oFound;
			}

			return null;
		},

		/** Returns flat IDs of all descendant nodes (not including the node itself). */
		_collectDescendantIds: function (oNode) {
			const aIds = [];

			const collect = (aChildren) => {
				if (!Array.isArray(aChildren)) return;
				aChildren.forEach((oChild) => {
					if (!oChild || !oChild.ID) return;
					aIds.push(oChild.ID);
					collect(oChild.children || []);
				});
			};

			collect(oNode.children || []);
			return aIds;
		},

		/**
		 * Resolves a JSON model context path (e.g. `/productPriceList/0/children/1`)
		 * to the actual node object in the tree array.
		 */
		_getNodeByContextPath: function (aRoots, sPath) {
			if (!sPath) return null;

			let aCurrentNodes = aRoots;
			let oCurrentNode = null;

			for (const sPart of sPath.split("/").filter(Boolean)) {
				if (sPart === "productPriceList") continue;

				if (sPart === "children") {
					if (!oCurrentNode) return null;
					aCurrentNodes = oCurrentNode.children || [];
					continue;
				}

				if (/^\d+$/.test(sPart)) {
					oCurrentNode = aCurrentNodes[Number(sPart)];
					if (!oCurrentNode) return null;
				}
			}

			return oCurrentNode;
		},

		/** Returns context paths of all descendants of the node at `sParentPath`. */
		_collectDescendantPathsByContextPath: function (aRoots, sParentPath) {
			const oParentNode = this._getNodeByContextPath(aRoots, sParentPath);
			const aPaths = [];

			const collect = (aChildren, sChildrenBase) => {
				if (!Array.isArray(aChildren)) return;
				aChildren.forEach((oChild, iIndex) => {
					const sChildPath = `${sChildrenBase}/${iIndex}`;
					aPaths.push(sChildPath);
					collect(oChild.children || [], `${sChildPath}/children`);
				});
			};

			if (oParentNode) {
				collect(oParentNode.children || [], `${sParentPath}/children`);
			}

			return aPaths;
		},

		/** Returns context paths of all Product leaf nodes under the node at `sParentPath`. */
		_collectProductPathsByContextPath: function (aRoots, sParentPath) {
			const oParentNode = this._getNodeByContextPath(aRoots, sParentPath);
			const aPaths = [];

			const collect = (oNode, sNodePath) => {
				if (!oNode) return;

				if (oNode.Kind === "Product" || Number(oNode.CategoryLevel) === 6) {
					aPaths.push(sNodePath);
					return;
				}

				(oNode.children || []).forEach((oChild, iIndex) => {
					collect(oChild, `${sNodePath}/children/${iIndex}`);
				});
			};

			if (oParentNode) collect(oParentNode, sParentPath);

			return aPaths;
		},

		_setDeleteBtnState: function (bEnabled, bVisible) {
			const oDeleteButton = this._getTreeControl("ProductListDeleteBtn");
			const oUndoDeleteButton = this._getTreeControl("ProductListUndoDeleteBtn");
			const oJsonModel = this._getJsonModel();
			const bDeleteMode = oJsonModel ? !!oJsonModel.getProperty("/isDeleteMode") : false;
			const bHasDeleted = Array.isArray(this._deletedSnapshots) && this._deletedSnapshots.length > 0;

			if (oJsonModel) {
				if (bEnabled !== undefined) oJsonModel.setProperty("/hasDeleteSelection", !!bEnabled);
				oJsonModel.setProperty("/hasDeleteUndo", bHasDeleted);
			}

			if (bEnabled !== undefined && oDeleteButton) {
				if (typeof oDeleteButton.setEnabled === "function") oDeleteButton.setEnabled(!!bEnabled);
			}

			if (bVisible !== undefined && oDeleteButton) {
				if (typeof oDeleteButton.setVisible === "function") oDeleteButton.setVisible(!!bVisible);
			}

			if (oUndoDeleteButton) {
				if (typeof oUndoDeleteButton.setEnabled === "function") oUndoDeleteButton.setEnabled(bHasDeleted);
				if (typeof oUndoDeleteButton.setVisible === "function") oUndoDeleteButton.setVisible(bDeleteMode && bHasDeleted);
			}
		},

		// ── Shared helpers ────────────────────────────────────────────────────────

		/** Returns the JSON model, or null if the view is not yet initialised. */
		_getJsonModel: function () {
			const oView = this.base && this.base.getView && this.base.getView();
			return oView && oView.getModel("jsonModel");
		},

		/**
		 * Looks up a control inside the ProductsTree sub-section by its short ID.
		 * @param {string} sId Local control ID (without the tree prefix).
		 */
		_getTreeControl: function (sId) {
			return sap.ui.getCore().byId(ID_TREE_PREFIX + sId);
		},

		/**
		 * Looks up a custom sub-section on the Object Page by its key.
		 * @param {string} sKey Sub-section key (without the sub-section prefix).
		 */
		_getSubSection: function (sKey) {
			return sap.ui.getCore().byId(SUBSECTION_PREFIX + sKey);
		},

		/**
		 * Deep-clones any JSON-serialisable value.
		 * Returns an empty array when the value is null or undefined.
		 */
		_clone: function (vData) {
			return JSON.parse(JSON.stringify(vData || []));
		},

		_getObjectPageEditMode: function () {
			const oView = this.base && this.base.getView && this.base.getView();
			const oUiModel = oView && oView.getModel("ui");
			return oUiModel ? oUiModel.getProperty("/editMode") : "Display";
		},

		_isEditMode: function () {
			return this._getObjectPageEditMode() !== "Display";
		},

		_isObjectPageDisplayMode: function () {
			return this._getObjectPageEditMode() === "Display";
		},

		/**
		 * Clears the TreeTable selection and refreshes its rows binding.
		 * Accepts an optional pre-looked-up table reference to avoid redundant byId calls.
		 *
		 * @param {sap.ui.table.TreeTable} [oTable]
		 */
		_refreshTreeTableBinding: function (oTable) {
			const oT = oTable || this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");
			if (!oT) return;

			if (oT.clearSelection) oT.clearSelection();

			const oRowsBinding = oT.getBinding("rows");
			if (oRowsBinding && oRowsBinding.refresh) oRowsBinding.refresh(true);
		},

		/**
		 * Walks up the UI5 control hierarchy and returns the first
		 * `sap.uxap.ObjectPageLayout` ancestor, or null if none is found.
		 *
		 * @param {sap.ui.core.Control} oControl Starting control.
		 * @returns {sap.uxap.ObjectPageLayout|null}
		 */
		_findAncestorObjectPageLayout: function (oControl) {
			let oC = oControl;
			while (oC) {
				if (oC.isA && oC.isA("sap.uxap.ObjectPageLayout")) return oC;
				oC = oC.getParent && oC.getParent();
			}
			return null;
		},

		/**
		 * Resets all runtime state (selection, delete buffer, filter, sort) that
		 * should not survive a tree reload or mode change.
		 */
		_clearProductTreeTransientState: function () {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			oJsonModel.setProperty("/selectedKeys", []);
			oJsonModel.setProperty("/pendingDeletedIds", []);
			this._deletedSnapshots = [];

			oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());
			oJsonModel.setProperty("/productFilterCount", 0);
			oJsonModel.setProperty("/productSortDirection", null);

			this._refreshTreeTableBinding();
			this._resetProductTreeExpandCollapseButtons();
			this._resetProductDetailState();

			const mMode = this._getProductTreeModeState();
			this._setDeleteBtnState(false, mMode.deleteMode);

			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: mMode.deleteMode,
				reorderMode: mMode.reorderMode
			});

			this._updateModeToggleEnabled();
			oJsonModel.updateBindings(true);
		},

		_resetProductDetailState: function () {
			this._initProductDetailSectionState();
			this._syncProductDetailSubSectionVisibility();
		},

		_resetProductTreeExpandCollapseButtons: function () {
			const oExpandAll = this._getTreeControl("ProductListExpandAllBtn");
			const oCollapseAll = this._getTreeControl("ProductListCollapseAllBtn");

			if (oExpandAll) oExpandAll.setVisible(true);
			if (oCollapseAll) oCollapseAll.setVisible(false);
		},

		_getInitialJsonData: function () {
			return {
				// Mode flags
				isDeleteMode: false,
				isReorderMode: false,

				// Toolbar / UI flags
				showReset: true,
				hasProductTreeData: false,
				hasVisibleProductTreeData: false,

				// Tree data
				productPriceList: [],
				originalProductPriceList: [],
				productPriceListFull: [],

				// Delete / selection state
				selectedKeys: [],
				pendingDeletedIds: [],
				hasDeleteSelection: false,
				hasDeleteUndo: false,

				// Filter state
				productFilterCount: 0,
				productFilter: this._getEmptyProductFilter(),

				columnSettings: {
					availableLayouts: [],
					columns: [],
					layoutNameInput: "",
					setAsDefault: false,
					setAsMasterDefault: false,
					canDeleteSelected: false
				}

			};
		},

		/** Suppresses re-entrant selection-change handling when selection is set programmatically. */
		_bSuppressSelectionChange: false,

		_clearProductTreeBufferAndSelection: function () {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			oJsonModel.setProperty("/isDeleteMode", false);
			oJsonModel.setProperty("/isReorderMode", false);
			oJsonModel.setProperty("/showReset", true);
			oJsonModel.setProperty("/selectedKeys", []);
			oJsonModel.setProperty("/pendingDeletedIds", []);

			this._deletedSnapshots = [];

			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");

			if (oTable) {
				if (oTable.setSelectionMode) oTable.setSelectionMode("Single");
				if (oTable.clearSelection) oTable.clearSelection();
			}

			this._setDeleteBtnState(false, false);
			this._clearProductDetailSections();

			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: false,
				reorderMode: false
			});

			this._syncProductTreeToolbarState();
			this._updateModeToggleEnabled();
			oJsonModel.updateBindings(true);
		},

		/**
		 * Resets tree interaction state to a known-good baseline.
		 *
		 * @param {{ restoreData?: boolean, clearFilter?: boolean, clearDeleteBuffer?: boolean }} [mOptions]
		 */
		_resetProductTreeInteractionState: function (mOptions) {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			if (mOptions && mOptions.restoreData) {
				const aOriginalTree =
					oJsonModel.getProperty("/originalProductPriceList") ||
					this._originalSnapshot ||
					[];

				const aCleanTree = this._clone(aOriginalTree);
				oJsonModel.setProperty("/productPriceList", aCleanTree);
				oJsonModel.setProperty("/productPriceListFull", this._clone(aCleanTree));
			}

			if (mOptions && mOptions.clearFilter) {
				oJsonModel.setProperty("/productFilter", this._getEmptyProductFilter());
				oJsonModel.setProperty("/productFilterCount", 0);
			}

			oJsonModel.setProperty("/pendingDeletedIds", []);
			oJsonModel.setProperty("/selectedKeys", []);
			oJsonModel.setProperty("/hasDeleteSelection", false);

			if (mOptions && mOptions.clearDeleteBuffer) {
				this._deletedSnapshots = [];
				oJsonModel.setProperty("/hasDeleteUndo", false);
			}

			this._setProductTreeModeState("Display");
			oJsonModel.updateBindings(true);

			if (this._productTreeTable) {
				this._refreshTreeTableBinding(this._productTreeTable);
			}

			this._clearProductDetailSections();
			this._updateModeToggleEnabled();
		},

		/**
		 * Switches the tree between "Display", "Delete", and "Reorder" modes,
		 * updating the TreeTable selection model and all dependent toolbar controls.
		 *
		 * @param {"Display"|"Delete"|"Reorder"} sMode
		 */
		_setProductTreeModeState: function (sMode) {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			const bDeleteMode = sMode === "Delete";
			const bReorderMode = sMode === "Reorder";

			oJsonModel.setProperty("/isDeleteMode", bDeleteMode);
			oJsonModel.setProperty("/isReorderMode", bReorderMode);
			oJsonModel.setProperty("/showReset", !bDeleteMode && !bReorderMode);
			oJsonModel.setProperty("/selectedKeys", []);
			oJsonModel.setProperty("/hasDeleteSelection", false);

			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");

			if (oTable) {
				if (oTable.setSelectionMode) oTable.setSelectionMode(bDeleteMode ? "Multi" : "Single");
				if (oTable.clearSelection) oTable.clearSelection();
			}

			this._syncProductTreeToolbarState();
			this._setDeleteBtnState(false, bDeleteMode);

			this._updateProductListNavButtonState({
				singleSelected: false,
				deleteMode: bDeleteMode,
				reorderMode: bReorderMode
			});

			this._clearProductDetailSections();
			oJsonModel.updateBindings(true);

			this._updateModeToggleEnabled();
		},

		_syncProductTreeToolbarState: function () {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			this._syncProductTreeDataFlags();

			const bDisplayMode = this._isObjectPageDisplayMode();

			let bDeleteMode = !!oJsonModel.getProperty("/isDeleteMode");
			let bReorderMode = !!oJsonModel.getProperty("/isReorderMode");

			// Fiori Elements display mode must never keep custom action modes alive.
			if (bDisplayMode) {
				bDeleteMode = false;
				bReorderMode = false;
				oJsonModel.setProperty("/isDeleteMode", false);
				oJsonModel.setProperty("/isReorderMode", false);
				oJsonModel.setProperty("/showReset", true);
			}

			const oDeleteToggle = this._getTreeControl("ProductListDeleteModeBtn");
			const oReorderToggle = this._getTreeControl("ProductListReorderModeBtn");
			const oResetBtn = this._getTreeControl("ProductListResetBtn");
			const oExpandAll = this._getTreeControl("ProductListExpandAllBtn");
			const oCollapseAll = this._getTreeControl("ProductListCollapseAllBtn");

			// "enabled" is owned by _updateModeToggleEnabled(). "visible" is owned
			// entirely here (same pattern as the Nav button) — this method must be
			// called on every Display↔Edit transition, not just on sub-mode toggles,
			// or these buttons (and Reset) go stale.
			if (oDeleteToggle) {
				oDeleteToggle.setPressed(bDeleteMode);
				oDeleteToggle.setVisible(!bDisplayMode && !bReorderMode);
				oDeleteToggle.setIcon(bDeleteMode ? "sap-icon://complete" : "sap-icon://delete");
				oDeleteToggle.setText(bDeleteMode ? "Finish" : "Delete");
				oDeleteToggle.setTooltip(bDeleteMode ? "Finish delete mode" : "Toggle delete mode");
			}

			if (oReorderToggle) {
				oReorderToggle.setPressed(bReorderMode);
				oReorderToggle.setVisible(!bDisplayMode && !bDeleteMode);
			}

			if (oExpandAll && oCollapseAll) {
				oExpandAll.setVisible(true);
				oCollapseAll.setVisible(false);
			}
		},

		/**
		 * Recomputes the enabled state of the Delete-mode / Reorder-mode toggle buttons.
		 *
		 * A mode may only be ENTERED when: not in Display mode, the tree has data,
		 * no hierarchy filter is active, and exactly one row is currently selected
		 * (mirrors the Nav button's enablement rule). Once a mode is already ACTIVE,
		 * its toggle stays enabled regardless of selection so the user can always
		 * press "Finish" to exit it.
		 */
		_updateModeToggleEnabled: function () {
			const oView = this.base && this.base.getView && this.base.getView();
			const oJsonModel = oView && oView.getModel("jsonModel");

			if (!oView || !oJsonModel) return;

			this._syncProductTreeDataFlags();

			const bDisplayMode = this._isObjectPageDisplayMode();
			const bHasVisibleData = !!oJsonModel.getProperty("/hasVisibleProductTreeData");
			const mMode = this._getProductTreeModeState();

			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");
			const aSelectedIndices = oTable && oTable.getSelectedIndices ? oTable.getSelectedIndices() : [];
			const bSingleSelected = aSelectedIndices.length === 1;

			// NOTE: an active filter does NOT block entry — it is auto-cleared (with
			// a toast) by _handleProductTreeModeToggle when the user enters a mode.
			const bCanEnterMode = !bDisplayMode && bHasVisibleData && bSingleSelected;

			const oDeleteToggle = this._getTreeControl("ProductListDeleteModeBtn");
			const oReorderToggle = this._getTreeControl("ProductListReorderModeBtn");

			if (oDeleteToggle && typeof oDeleteToggle.setEnabled === "function") {
				oDeleteToggle.setEnabled(mMode.deleteMode || bCanEnterMode);
			}

			if (oReorderToggle && typeof oReorderToggle.setEnabled === "function") {
				oReorderToggle.setEnabled(mMode.reorderMode || bCanEnterMode);
			}
		},

		_syncProductTreeDataFlags: function () {
			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			const aVisible = oJsonModel.getProperty("/productPriceList") || [];
			const aFull = oJsonModel.getProperty("/productPriceListFull") || [];
			const aOriginal = oJsonModel.getProperty("/originalProductPriceList") || [];

			const bHasVisible = Array.isArray(aVisible) && aVisible.length > 0;
			const bHasSource = bHasVisible
				|| (Array.isArray(aFull) && aFull.length > 0)
				|| (Array.isArray(aOriginal) && aOriginal.length > 0);

			oJsonModel.setProperty("/hasVisibleProductTreeData", bHasVisible);
			oJsonModel.setProperty("/hasProductTreeData", bHasSource);
		},

		/**
		 * Captures the current tree as the "original" snapshot the first time the
		 * Object Page transitions from Display → Edit. No-op on all subsequent calls.
		 */
		_captureOriginalSnapshotWhenEnteringEditMode: function () {
			const sCurrentMode = this._getObjectPageEditMode();
			const bEnteredEdit =
				this._lastObjectPageEditMode === "Display" &&
				sCurrentMode !== "Display";

			if (bEnteredEdit) {
				const oJsonModel = this._getJsonModel();
				const aCurrentTree = oJsonModel
					? (oJsonModel.getProperty("/productPriceList") || [])
					: [];

				this._originalSnapshot = this._clone(aCurrentTree);
				oJsonModel.setProperty("/originalProductPriceList", this._clone(aCurrentTree));
			}

			this._lastObjectPageEditMode = sCurrentMode;
		},

		/** Resets all mode-toggle buttons to their unpressed / normal state. */
		_resetProductTreeModeButtonsToNormal: function () {
			const oDeleteToggle = this._getTreeControl("ProductListDeleteModeBtn");
			const oReorderToggle = this._getTreeControl("ProductListReorderModeBtn");
			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");

			if (oTable && oTable.setSelectionMode) {
				oTable.setSelectionMode("Single");
			}

			// "visible" is intentionally left untouched here — it is owned entirely
			// by the XML binding (which also checks ui>/editMode).
			if (oDeleteToggle) {
				oDeleteToggle.setPressed(false);
				oDeleteToggle.setIcon("sap-icon://delete");
				oDeleteToggle.setText("Delete");
				oDeleteToggle.setTooltip("Toggle delete mode");
			}

			if (oReorderToggle) {
				oReorderToggle.setPressed(false);
				oReorderToggle.setText("Re-order");
				oReorderToggle.setTooltip("Toggle re-order mode");
			}
		},

		_callSaveProductPriceList: function (oHeader, oOriginalHeader, aTree) {
			const oActionBinding = this.base.getView().getModel().bindContext("/saveProductPriceList(...)");

			oActionBinding.setParameter("headerData", JSON.stringify(oHeader));
			oActionBinding.setParameter("originalHeaderData", JSON.stringify(oOriginalHeader));
			oActionBinding.setParameter("treeData", JSON.stringify(aTree));

			return oActionBinding
				.execute()
				.then(() => {
					MessageToast.show("Pricelist saved successfully.");

					// Clear session-scoped staging state now that it is persisted.
					this._originalSnapshot = null;
					this._originalHeaderSnapshot = null;
					this._deletedSnapshots = [];
				})
				.catch((oError) => {
					MessageBox.error("Save failed: " + (oError.message || "Unknown error."));
					throw oError;
				});
		},

		/** Reads the current header field values from the Object-Page binding context. */
		_getCurrentHeaderData: function () {
			const oContext = this.base.getView().getBindingContext();
			if (!oContext) return {};

			return HEADER_FIELDS.reduce((oAcc, sField) => {
				oAcc[sField] = oContext.getProperty(sField);
				return oAcc;
			}, {});
		},

		/**
		 * Syncs controller state to the current Object-Page edit / display mode.
		 * Captures the header snapshot when a draft is open; clears it on activation.
		 */
		_syncEditModeState: function () {
			const oContext = this.base.getView().getBindingContext();
			if (!oContext) return;

			const bIsDraft = oContext.getProperty("IsActiveEntity") === false;
			this._bAwaitingTreeSnapshot = bIsDraft; // may be read by other files

			if (bIsDraft) {
				if (!this._originalHeaderSnapshot) {
					this._originalHeaderSnapshot = this._getCurrentHeaderData();
				}
			} else {
				// Returned to display mode (after Save or Cancel) – clear staged state.
				this._originalSnapshot = null;
				this._originalHeaderSnapshot = null;
				this._deletedSnapshots = [];
			}
		},

		/**
		 * Attaches a one-time listener on the "ui" model's `/editMode` property so the
		 * tree's selection / delete / reorder state is re-synced on EVERY Display↔Edit
		 * transition — not only on the initial page load. Fiori Elements does not
		 * re-run onPageReady when the user simply presses Edit/Save/Cancel, so without
		 * this listener stale selection and mode flags can leak across edit sessions.
		 */
		_attachEditModeListener: function () {
			if (this._bEditModeListenerAttached) return;

			const oUiModel = this.base.getView().getModel("ui");
			if (!oUiModel) return;

			oUiModel.bindProperty("/editMode").attachChange(this._onEditModeChanged, this);
			this._bEditModeListenerAttached = true;
		},

		/**
		 * Runs on every Display↔Edit transition. Re-captures the original snapshot
		 * when entering Edit mode, and unconditionally clears tree selection plus
		 * any leftover delete/reorder buffers so neither mode nor selection survives
		 * across edit sessions (Bug fix: selection was not cleared on Display→Edit).
		 */
		_onEditModeChanged: function () {
			this._syncEditModeState();
			this._captureOriginalSnapshotWhenEnteringEditMode();
			this._clearProductTreeBufferAndSelection();
		},

		_openCustomerSelectionDialog: function () {
			const oView = this.getView();

			return new Promise((resolve) => {
				this._fnResolveCustomerDialog = resolve;

				if (this._oCustomerSelectionDialog) {
					this._oCustomerSelectionDialog.open();
					return;
				}

				Fragment.load({
					id: oView.getId(),
					name: "pricelistapp.pricelistmaintain.ext.fragment.CustomerSelectionDialog", // adjust namespace
					controller: this
				}).then((oDialog) => {
					this._oCustomerSelectionDialog = oDialog;
					oView.addDependent(oDialog);
					oDialog.open();
				});
			});
		},

		onCustomerNoLiveChange: function (oEvent) {
			oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
		},

		onCustomerSelectionConfirm: function () {
			const oView = this.getView();
			const oInput = Fragment.byId(oView.getId(), "customerNoInput");
			const sValue = oInput.getValue().trim();

			this._oCustomerSelectionDialog.close();
			this._fnResolveCustomerDialog?.(sValue);
		},

		onCustomerSelectionCancel: function () {
			this._oCustomerSelectionDialog.close();
			this._fnResolveCustomerDialog?.(null);
		},

		onCustomerSelectionDialogAfterClose: function () {
			// keep the dialog cached for reuse; clear the input for next open
			Fragment.byId(this.getView().getId(), "customerNoInput").setValue("");
		},

		//Change Column Display for Tree Table
		_buildColumnSnapshot: function (oTable) {
			return oTable.getColumns().map((oColumn) => {
				const sFullId = oColumn.getId();
				const sLocalId = sFullId.startsWith(ID_TREE_PREFIX) ? sFullId.slice(ID_TREE_PREFIX.length) : sFullId;
				const vLabel = oColumn.getLabel && oColumn.getLabel();
				const sTitle = typeof vLabel === "string" ? vLabel : (vLabel?.getText?.() || sLocalId);

				return { id: sLocalId, title: sTitle, visible: oColumn.getVisible(), width: oColumn.getWidth() || "" };
			});
		},

		_onOpenColumnSettings: function () {
			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");
			if (!oTable) return MessageToast.show("Table not found.");

			this._getJsonModel().setProperty("/columnSettings/columns", this._buildColumnSnapshot(oTable));
			this._openColumnSettingsDialog();
		},

		onApplyColumnSettings: function () {
			this._applyColumnSettingsToTable();
			this.onCloseColumnSettingsDialog();
			MessageToast.show("Columns updated.");
		},

		onSelectAllColumns: function () { this._setAllColumnsVisible(true); },
		onDeselectAllColumns: function () { this._setAllColumnsVisible(false); },

		_setAllColumnsVisible: function (bVisible) {
			const oJsonModel = this._getJsonModel();
			const aColumns = (oJsonModel.getProperty("/columnSettings/columns") || []).map((c) => ({ ...c, visible: bVisible }));
			oJsonModel.setProperty("/columnSettings/columns", aColumns);
		},

		_openColumnSettingsDialog: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			if (this._oColumnSettingsDialog) {
				this._oColumnSettingsDialog.setModel(oJsonModel, "jsonModel");
				this._oColumnSettingsDialog.open();
				return;
			}

			if (!this._pColumnSettingsDialog) {
				this._pColumnSettingsDialog = Fragment.load({
					id: oView.getId(),
					name: "pricelistapp.pricelistmaintain.ext.fragment.TreeTableColumnSettingDialog",
					controller: this
				}).then((oDialog) => {
					const oRealDialog = Array.isArray(oDialog) ? oDialog[0] : oDialog;
					this._oColumnSettingsDialog = oRealDialog;
					oView.addDependent(oRealDialog);
					return oRealDialog;
				});
			}

			this._pColumnSettingsDialog.then((oDialog) => {
				oDialog.setModel(oJsonModel, "jsonModel");
				oDialog.open();
			});
		},

		onOpenLayoutSettings: function () {
			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");
			if (!oTable) return MessageToast.show("Table not found.");

			const oJsonModel = this._getJsonModel();
			oJsonModel.setProperty("/columnSettings/columns", this._buildColumnSnapshot(oTable));

			if (!this._sSelectedLayoutId) {
				oJsonModel.setProperty("/columnSettings/layoutNameInput", "");
				oJsonModel.setProperty("/columnSettings/setAsDefault", false);
				oJsonModel.setProperty("/columnSettings/setAsMasterDefault", false);
				oJsonModel.setProperty("/columnSettings/canDeleteSelected", false);
				oJsonModel.setProperty("/columnSettings/selectedLayoutId", null);
			}

			this._loadAvailableLayouts()
				.then(() => this._preselectDefaultLayoutOnFirstOpen())
				.catch((err) => console.error("Failed to load layouts", err))
				.then(() => this._openLayoutSettingsDialog());
		},

		onCloseLayoutSettingsDialog: function () {
			this._oLayoutSettingsDialog?.close();
		},

		_openLayoutSettingsDialog: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			if (this._oLayoutSettingsDialog) {
				this._oLayoutSettingsDialog.setModel(oJsonModel, "jsonModel");
				this._oLayoutSettingsDialog.open();
				return;
			}

			if (!this._pLayoutSettingsDialog) {
				this._pLayoutSettingsDialog = Fragment.load({
					id: oView.getId(),
					name: "pricelistapp.pricelistmaintain.ext.fragment.TreeTableLayoutSettingDialog",
					controller: this
				}).then((oDialog) => {
					const oRealDialog = Array.isArray(oDialog) ? oDialog[0] : oDialog;
					this._oLayoutSettingsDialog = oRealDialog;
					oView.addDependent(oRealDialog);
					return oRealDialog;
				});
			}

			this._pLayoutSettingsDialog.then((oDialog) => {
				oDialog.setModel(oJsonModel, "jsonModel");
				oDialog.open();
			});
		},

		// picks default layout only if user hasn't manually picked anything yet this session
		_preselectDefaultLayoutOnFirstOpen: function () {
			if (this._sSelectedLayoutId) return;

			const aLayouts = this._getJsonModel().getProperty("/columnSettings/availableLayouts") || [];
			const oDefault = aLayouts.find((l) => l.isOwn && l.defaultLayout) || aLayouts.find((l) => l.masterDefault);

			if (oDefault) this._applySavedLayout(oDefault);
		},

		_applyDefaultLayoutOnPageLoad: function () {
			if (this._bDefaultLayoutApplied || this._sSelectedLayoutId) return;
			this._bDefaultLayoutApplied = true;

			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");
			if (!oTable) return;

			const oJsonModel = this._getJsonModel();
			if (!oJsonModel) return;

			oJsonModel.setProperty("/columnSettings/columns", this._buildColumnSnapshot(oTable));

			this._loadAvailableLayouts()
				.then(() => {
					const aLayouts = oJsonModel.getProperty("/columnSettings/availableLayouts") || [];
					const oDefault = aLayouts.find((l) => l.isOwn && l.defaultLayout)
						|| aLayouts.find((l) => l.masterDefault);

					if (!oDefault) return;

					this._applySavedLayout(oDefault);
				})
				.catch((oErr) => console.error("Failed to apply default layout", oErr));
		},


		// shared by manual selection in the list + auto-preselect on first open
		_applySavedLayout: function (oLayout) {
			const oJsonModel = this._getJsonModel();

			oJsonModel.setProperty("/columnSettings/canDeleteSelected", !!oLayout.isOwn);
			oJsonModel.setProperty("/columnSettings/selectedLayoutId", oLayout.ID);
			oJsonModel.setProperty("/columnSettings/setAsDefault", !!oLayout.defaultLayout);
			oJsonModel.setProperty("/columnSettings/setAsMasterDefault", !!oLayout.masterDefault);
			this._sSelectedLayoutId = oLayout.ID;

			let aParsedColumns = [];
			try {
				aParsedColumns = JSON.parse(oLayout.config || "[]");
			} catch (e) {
				return MessageToast.show("Error on loading layout.");
			}

			const aCurrentColumns = oJsonModel.getProperty("/columnSettings/columns") || [];
			const oCurrentById = new Map(aCurrentColumns.map((c) => [c.id, c]));
			const aMerged = [];

			aParsedColumns.forEach((oSaved) => {
				const oCurrent = oCurrentById.get(oSaved.id);
				if (!oCurrent) return;

				aMerged.push({ id: oSaved.id, title: oCurrent.title, visible: !!oSaved.visible, width: oSaved.width || oCurrent.width });
				oCurrentById.delete(oSaved.id);
			});

			oCurrentById.forEach((oCurrent) => aMerged.push(oCurrent));

			oJsonModel.setProperty("/columnSettings/columns", aMerged);
			oJsonModel.setProperty("/columnSettings/layoutNameInput", oLayout.layoutName);
			oJsonModel.setProperty("/columnSettings/setAsDefault", !!oLayout.defaultLayout);

			this._applyColumnSettingsToTable();
		},

		onSelectSavedLayout: function (oEvent) {
			const oSelectedItem = oEvent.getParameter("listItem") || oEvent.getSource().getSelectedItem();
			const oLayout = oSelectedItem?.getBindingContext("jsonModel")?.getObject();
			if (!oLayout) return;

			this._applySavedLayout(oLayout);
			MessageToast.show(`Layout '${oLayout.layoutName}' applied.`);
		},

		onCloseColumnSettingsDialog: function () {
			if (this._oColumnSettingsDialog) {
				this._oColumnSettingsDialog.close();
			}
		},

		// Apply working column list (visible/width/order) onto the real TreeTable
		_applyColumnSettingsToTable: function () {
			const oJsonModel = this._getJsonModel();
			const aWorkingColumns = oJsonModel.getProperty("/columnSettings/columns") || [];
			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");

			if (!oTable) return;

			aWorkingColumns.forEach((oColInfo, iTargetIndex) => {
				const oColumn = this._getTreeControl(oColInfo.id);
				if (!oColumn) return;

				oColumn.setVisible(!!oColInfo.visible);
				if (oColInfo.width) oColumn.setWidth(oColInfo.width);

				const iCurrentIndex = oTable.indexOfColumn(oColumn);
				if (iCurrentIndex !== iTargetIndex) {
					oTable.removeColumn(oColumn);
					oTable.insertColumn(oColumn, iTargetIndex);
				}
			});
		},

		_getCurrentUserId: function () {
			if (this._sCachedUserId) {
				return Promise.resolve(this._sCachedUserId);
			}

			const oModel = this.base.getView().getModel();

			// return oModel.bindList("/User").requestContexts(0, 1)
			// 	.then((aCtx) => {
			// 		const oUser = aCtx && aCtx[0] && aCtx[0].getObject();
			// 		this._sCachedUserId = (oUser && oUser.email) || "";
			// 		return this._sCachedUserId;
			// 	})
			// 	.catch(() => "");

			if (sap.ushell && sap.ushell.Container) {
				var oUser = sap.ushell.Container.getUser();
				var sEmail = oUser.getEmail();
				return this._sCachedUserId = sEmail || "";
			}

		},

		_loadAvailableLayouts: function () {
			const oView = this.base.getView();
			const oModel = oView.getModel();
			const oJsonModel = oView.getModel("jsonModel");

			const oAction = oModel.bindContext("/getAvailableLayouts(...)");
			oAction.setParameter("tableId", "ProductPriceListTreeTable");

			return Promise.all([oAction.execute(), this._getCurrentUserId()]).then(([, sUserId]) => {
				const oResult = oAction.getBoundContext().getObject();
				const aLayouts = (oResult && (oResult.value || oResult)) || [];

				oJsonModel.setProperty("/columnSettings/availableLayouts", aLayouts);
			});
		},

		onDeleteSavedLayout: function () {
			if (!this._sSelectedLayoutId) {
				MessageToast.show("Please select a layout to delete.");
				return;
			}

			const sLayoutId = this._sSelectedLayoutId;

			MessageBox.confirm("Delete this saved layout? This cannot be undone.", {
				title: "Confirm Delete",
				onClose: (sAction) => {
					if (sAction !== MessageBox.Action.OK) return;

					const oModel = this.base.getView().getModel();
					const oAction = oModel.bindContext("/deleteTreeLayout(...)");
					oAction.setParameter("ID", sLayoutId);

					oAction.execute()
						.then(() => {
							MessageToast.show("Layout deleted.");
							this._sSelectedLayoutId = null;
							return this._loadAvailableLayouts();
						})
						.catch((oErr) => {
							console.error(oErr);
							MessageBox.error("Cannot delete this layout.");
						});
				}
			});
		},

		onSaveColumnLayout: function () {
			const oView = this.base.getView();
			const oJsonModel = oView.getModel("jsonModel");

			const sLayoutName = (oJsonModel.getProperty("/columnSettings/layoutNameInput") || "").trim();
			const bSetAsDefault = !!oJsonModel.getProperty("/columnSettings/setAsDefault");
			const bSetAsMasterDefault = !!oJsonModel.getProperty("/columnSettings/setAsMasterDefault");
			const aColumns = oJsonModel.getProperty("/columnSettings/columns") || [];

			if (!sLayoutName) return MessageToast.show("Please enter a layout name.");

			const sConfigJson = JSON.stringify(aColumns.map((c) => ({ id: c.id, visible: !!c.visible, width: c.width || "" })));

			const aAvailable = oJsonModel.getProperty("/columnSettings/availableLayouts") || [];
			const oExistingOwn = aAvailable.find((l) => l.isOwn && l.layoutName === sLayoutName);

			const oAction = oView.getModel().bindContext("/saveTreeLayout(...)");
			oAction.setParameter("ID", oExistingOwn ? oExistingOwn.ID : null);
			oAction.setParameter("tableId", "ProductPriceListTreeTable");
			oAction.setParameter("layoutName", sLayoutName);
			oAction.setParameter("defaultLayout", bSetAsDefault);
			oAction.setParameter("masterDefault", bSetAsMasterDefault);
			oAction.setParameter("config", sConfigJson);

			oAction.execute()
				.then(() => {
					// MessageToast.show(`Layout '${sLayoutName}' saved.`); 
					// this.onCloseLayoutSettingsDialog();					
					// return this._loadAvailableLayouts(); 

					const oSavedLayout = oAction.getBoundContext().getObject();
					this._applyColumnSettingsToTable();
					this._sSelectedLayoutId = oSavedLayout?.ID || null;

					oJsonModel.setProperty("/columnSettings/selectedLayoutId", this._sSelectedLayoutId);

					MessageToast.show(`Layout '${sLayoutName}' saved and applied.`);

					this._loadAvailableLayouts().catch((err) => console.error("Failed to refresh layouts", err));
					this.onCloseLayoutSettingsDialog();
				})
				.catch((err) => {
					console.error(err); MessageBox.error("Cannot save layout.");
				});
		},

		/**
		* Exports the currently visible tree data to Excel, respecting the current column visibility and order in the TreeTable.
		* If bShowSettingsDialog is true, the user is prompted with the "Export As" dialog where they can adjust export settings before confirming. 
		*/
		onExportExcel: function (bShowSettingsDialog) {
			const oTable = this._productTreeTable || this._getTreeControl("ProductPriceListTreeTable");
			if (!oTable) return MessageToast.show("Table not found.");

			const aTree = this._getJsonModel().getProperty("/productPriceList") || [];
			const aRows = this._flattenTreeForExport(aTree);

			if (!aRows.length) return MessageToast.show("Nothing to export.");

			const mSettings = {
				workbook: {
					columns: this._buildExportColumns(oTable),
					context: { sheetName: "Product Price List" }
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

			pExport.catch((oError) => {
				// User cancelling the "Export As" dialog rejects with no error
				if (oError) MessageBox.error("Export failed: " + (oError.message || "Unknown error."));
			});
		},

		/**
		 * Builds the export column config from whatever columns are currently visible on the TreeTable
		 */
		_buildExportColumns: function (oTable) {
			return oTable.getColumns()
				.filter((oColumn) => oColumn.getVisible())
				.map((oColumn) => {
					const sLocalId = oColumn.getId().replace(ID_TREE_PREFIX, "");
					const vLabel = oColumn.getLabel && oColumn.getLabel();
					const sTitle = typeof vLabel === "string" ? vLabel : (vLabel?.getText?.() || sLocalId);

					return {
						label: sTitle,
						property: EXPORT_COLUMN_FIELD_MAP[sLocalId] || sLocalId,
						type: EdmType.String
					};
				});
		},

		/**
		 * Flattens the (nested) tree into export rows, depth-first, pre-computing the same display values the table shows
		 */
		_flattenTreeForExport: function (aNodes, iLevel = 0, aOut = []) {
			(aNodes || []).forEach((oNode) => {
				const bIsProduct = oNode.Kind === "Product";
				aOut.push({
					Title: "    ".repeat(iLevel) + (oNode.Title || ""),
					Description: bIsProduct ? (oNode.Description || "") : "",
					PriceDisplay: bIsProduct ? `${oNode.Price || ""} ${oNode.PriceUnit || ""}`.trim() : "",
					PriceValidFrom: bIsProduct ? (oNode.PriceValidFrom || "") : "",
					DiscountRate: bIsProduct ? (oNode.DiscountRate || "") : "",
					DiscountValidFrom: bIsProduct ? (oNode.DiscountValidFrom || "") : "",
					DiscountValidTo: bIsProduct ? (oNode.DiscountValidTo || "") : "",
					PriceChangeIndicator: bIsProduct ? !!oNode.PriceChangeIndicator : "",
					FuturePriceDisplay: bIsProduct ? `${oNode.FuturePrice || ""} ${oNode.PriceUnit || ""}`.trim() : "",
					FuturePriceValidityDisplay: bIsProduct
						? `${oNode.FuturePriceValidFrom || ""} - ${oNode.FuturePriceValidTo || ""}`
						: "",
					Status: bIsProduct ? (oNode.Status || "") : "",
					StatusValidFromDate: bIsProduct ? (oNode.StatusValidFromDate || "") : "",
					StatusValidToDate: bIsProduct ? (oNode.StatusValidToDate || "") : "",
					Supplier: bIsProduct ? (oNode.Supplier || "") : "",
					SupplierSKU: bIsProduct ? (oNode.SupplierSKU || "") : ""
				});

				if (Array.isArray(oNode.children) && oNode.children.length) {
					this._flattenTreeForExport(oNode.children, iLevel + 1, aOut);
				}
			});

			return aOut;
		}

	});
});