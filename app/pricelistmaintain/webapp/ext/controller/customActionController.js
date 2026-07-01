sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/CheckBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/ComboBox",
    "sap/ui/core/Item",
    "sap/m/DatePicker",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/MessageBox"
], function (Controller, MessageToast, Dialog, Button, CheckBox, Label, Input, ComboBox, Item, DatePicker, VBox, HBox, MessageBox) {
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
        },
        onMassEditPricelist: async function () {
            const aSelectedContexts = this.getSelectedContexts();

            if (!aSelectedContexts.length) {
                MessageToast.show("Please select at least one pricelist.");
                return;
            }

            const oModel = aSelectedContexts[0].getModel();

            const aFields = [
                { name: "PricelistTitle", label: "Pricelist", type: "Input" },
                { name: "Status", label: "Status", type: "ComboBox", path: "/StatusVH", key: "code", text: "code" },
                { name: "PricelistType", label: "Pricelist Type", type: "ComboBox", path: "/PricelistTypeVH", key: "PricelistType", text: "PricelistType" },
                { name: "MarketScopeRegion", label: "Region", type: "ComboBox", path: "/MarketRegionVH", key: "MarketScopeRegion", text: "MarketScopeRegion" },
                { name: "MarketScopeCountry", label: "Country", type: "ComboBox", path: "/MarketCountryVH", key: "MarketScopeCountry", text: "MarketScopeCountry" },
                { name: "Currency", label: "Currency", type: "Input" },
                { name: "EffectiveDate", label: "Effective Date", type: "Date" },
                { name: "SalesOrg", label: "Sales Organization", type: "ComboBox", path: "/SalesOrgVH", key: "Code", text: "Description" },
                { name: "DistChannel", label: "Distribution Channel", type: "ComboBox", path: "/DistributionChannelVH", key: "Code", text: "Description" },
                { name: "CustGroup1", label: "Customer Group 1", type: "ComboBox", path: "/CustomerGroup1VH", key: "Code", text: "Description" },
                { name: "CustPriceList", label: "Customer Pricelist", type: "ComboBox", path: "/PricelistVH", key: "Code", text: "Description" },
                { name: "ErpCustomer", label: "Customer Account", type: "Input" },
                { name: "DeliveringPlant", label: "Delivering Plant", type: "ComboBox", path: "/PlantVH", key: "Code", text: "Description" }
            ];
            const mControls = {};

            const oContent = new VBox({
                width: "100%",
                items: aFields.map(function (field) {
                    const oCheckBox = new CheckBox({
                        text: "Change",
                        selected: false
                    });

                    let oInput;

                    if (field.type === "Date") {
                        oInput = new sap.m.DatePicker({
                            width: "14rem",
                            valueFormat: "yyyy-MM-dd",
                            displayFormat: "medium",
                            enabled: false
                        });
                    } else if (field.type === "ComboBox") {
                        oInput = new sap.m.ComboBox({
                            width: "14rem",
                            enabled: false,
                            selectedKey: ""
                        });

                        oInput.setModel(oModel);

                        oInput.bindItems({
                            path: field.path,
                            template: new sap.ui.core.Item({
                                key: `{${field.key}}`,
                                text: field.text === field.key
                                    ? `{${field.text}}`
                                    : `{${field.key}} - {${field.text}}`
                            })
                        });
                    } else {
                        oInput = new sap.m.Input({
                            width: "14rem",
                            enabled: false
                        });
                    }

                    oCheckBox.attachSelect(function (oEvent) {
                        oInput.setEnabled(oEvent.getParameter("selected"));
                    });

                    mControls[field.name] = {
                        checkbox: oCheckBox,
                        input: oInput,
                        type: field.type
                    };

                    return new HBox({
                        alignItems: "Center",
                        justifyContent: "SpaceBetween",
                        width: "100%",
                        items: [
                            new Label({
                                text: field.label,
                                width: "12rem"
                            }),
                            oCheckBox,
                            oInput
                        ]
                    }).addStyleClass("sapUiSmallMarginBottom");
                })
            }).addStyleClass("sapUiSmallMargin");

            const oDialog = new Dialog({
                title: `Mass Edit (${aSelectedContexts.length} Pricelists)`,
                contentWidth: "42rem",
                contentHeight: "36rem",
                verticalScrolling: true,
                content: [oContent],
                beginButton: new Button({
                    text: "Apply",
                    type: "Emphasized",
                    press: async function () {
                        const oChanges = {};

                        for (const field of aFields) {
                            const oEntry = mControls[field.name];

                            if (!oEntry.checkbox.getSelected()) {
                                continue;
                            }

                            let vValue;

                            if (field.type === "ComboBox") {
                                vValue = oEntry.input.getSelectedKey();
                            } else {
                                vValue = oEntry.input.getValue();
                            }

                            oChanges[field.name] = vValue;
                        }

                        if (Object.keys(oChanges).length === 0) {
                            MessageToast.show("Select at least one field to change.");
                            return;
                        }

                        const aIds = aSelectedContexts.map(function (ctx) {
                            return ctx.getProperty("ID");
                        });

                        try {
                            sap.ui.core.BusyIndicator.show(0);

                            const oAction = oModel.bindContext("/massEditPricelists(...)");
                            oAction.setParameter("ids", aIds);
                            oAction.setParameter("changes", JSON.stringify(oChanges));

                            await oAction.execute();
                            oModel.refresh();
                            oDialog.close();

                            const oResult = oAction.getBoundContext().getObject();
                            const aResults = oResult?.value || [];

                            const aErrors = aResults.filter(r => r.status === "ERROR");

                            if (aErrors.length > 0) {
                                MessageBox.error(
                                    "Mass edit completed with errors:\n\n" +
                                    aErrors.map(e => `${e.sourceId}: ${e.message}`).join("\n")
                                );
                                return;
                            }

                            MessageToast.show("Mass edit completed.");
                        } catch (e) {
                            MessageBox.error("Mass edit failed: " + (e.message || e));
                        } finally {
                            sap.ui.core.BusyIndicator.hide();
                        }
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

            oDialog.open();
        }
    };
});