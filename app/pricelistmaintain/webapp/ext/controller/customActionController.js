sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    'use strict';

    return {
        onDuplicatePricelist: async function () {
            const aSelectedContexts = this.getSelectedContexts();

            if (!aSelectedContexts.length) {
                sap.m.MessageToast.show("Please select at least one pricelist.");
                return;
            }

            const aIds = aSelectedContexts.map(ctx => ctx.getProperty("ID"));
            const oModel = aSelectedContexts[0].getModel();

            try {
                sap.ui.core.BusyIndicator.show(0);

                const oAction = oModel.bindContext("/massDuplicatePricelists(...)");
                oAction.setParameter("ids", aIds);

                await oAction.execute();

                oModel.refresh();
                sap.m.MessageToast.show(`${aIds.length} pricelist(s) duplicated successfully.`);
            } catch (e) {
                sap.m.MessageBox.error("Duplicate failed: " + (e.message || e));
            } finally {
                sap.ui.core.BusyIndicator.hide();
            }
        }
    };
});