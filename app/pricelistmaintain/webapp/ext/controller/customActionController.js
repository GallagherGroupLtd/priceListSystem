sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  'use strict';

  return {
    onDuplicatePricelist: async function () {
      const aSelectedContexts = this.getSelectedContexts();
      if (!aSelectedContexts.length) {
          sap.m.MessageToast.show("Please select a record to duplicate.");
          return;
      }
      if (aSelectedContexts.length > 1) {
          sap.m.MessageToast.show("Please select only one record to duplicate.");
          return;
      }

      const oContext = aSelectedContexts[0];
      const oModel = oContext.getModel();

      // Utility: strip system/draft fields recursively
      const excludeKeys = [
          "ID", "IsActiveEntity", "HasActiveEntity",
          "DraftAdministrativeData", "DraftAdministrativeData_DraftUUID", "HasDraftEntity"
      ];
      function buildCleanPayload(obj) {
          if (!obj || typeof obj !== "object") return obj;
          const clean = {};
          for (const [key, value] of Object.entries(obj)) {
              if (!excludeKeys.includes(key)) {
                  if (value && typeof value === "object" && !Array.isArray(value)) {
                      clean[key] = buildCleanPayload(value); // recurse for nested objects
                  } else {
                      clean[key] = value;
                  }
              }
          }
          return clean;
      }

      // Fetch full header record from backend (not just annotated fields)
      const sPath = oContext.getPath(); // e.g. "/PricelistData('123')"
      const oFullContext = oModel.bindContext(sPath);
      const oPricelist = await oFullContext.requestObject();

      // Fetch full items from backend
      const sItemsPath = sPath + "/items";
      const oItemsBinding = oModel.bindList(sItemsPath);
      const aItemContexts = await oItemsBinding.requestContexts();
      const aItems = await Promise.all(aItemContexts.map(ctx => ctx.requestObject()));

      // Build clean header payload
      const newHeader = buildCleanPayload(oPricelist);
      newHeader.PricelistTitle = (oPricelist.PricelistTitle || "") + "-copy";

      // Create new Pricelist draft
      const oRootBinding = oModel.bindList("/PricelistData");
      const oNewCtx = oRootBinding.create(newHeader);
      await oNewCtx.created();

      // Duplicate items under new Pricelist
      const sNewItemsPath = oNewCtx.getPath() + "/items";
      const oNewItemsBinding = oModel.bindList(sNewItemsPath);

      for (const item of aItems) {
          const newItem = buildCleanPayload(item);
          newItem.PricelistPartNumber = (item.PricelistPartNumber || "") + "-copy";
          oNewItemsBinding.create(newItem);
      }

      // Persist header + items
      await oModel.submitBatch("PricelistData");

      // Refresh list so new record appears
      this.getModel().refresh();
    }
  };
});