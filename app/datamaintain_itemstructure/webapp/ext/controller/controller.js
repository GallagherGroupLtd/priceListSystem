sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/ui/unified/FileUploader",
  "sap/ui/export/Spreadsheet"
], function (Controller, MessageToast, Dialog, Button, FileUploader, Spreadsheet) {
  'use strict';

  return {
    uploadExcel: function () {
      const oFileUploader = new FileUploader({
        width: "100%",
        placeholder: "Choose a file...",
        buttonText: "Browse",
        fileType: ["xlsx", "xls"],
        change: (oEvent) => {
          this._file = oEvent.getParameter("files")[0];
          if (this._file) {
            MessageToast.show("Selected file: " + this._file.name);
            oUploadButton.setEnabled(true);
          }
        }
      });

      const oUploadButton = new Button({
        text: "Upload",
        type: "Emphasized",
        enabled: false,
        press: () => {
          if (!this._file) {
            MessageToast.show("Please select a file first.");
            return;
          }

          const oReader = new FileReader();
          oReader.onload = async (e) => {
            const base64 = e.target.result.split(",")[1];
            const oModel = this.getModel();

            const oOperation = oModel.bindContext("/MassUploadItemStructure(...)");
            oOperation.setParameter("file", base64);

            try {
              await oOperation.execute();
              MessageToast.show("Upload successful.");
              oModel.refresh();
              oDialog.close();

            } catch (err) {
              MessageToast.show("Upload failed: " + err.message);
            } finally {
              sap.ui.core.BusyIndicator.hide();
            }
          };

          oReader.readAsDataURL(this._file);
          oDialog.close();
        }
      });

      const oDownloadButton = new Button({
        text: "Download Item Structure Template",
        press: () => {
          const aColumns = [
            { label: "TradeScenario", property: "TradeScenario" },
            { label: "MarketScopeRegion", property: "MarketScopeRegion" },
            { label: "MarketScopeCountry", property: "MarketScopeCountry" },
            { label: "SalesOrg", property: "SalesOrg" },
            { label: "DistChannel", property: "DistChannel" },
            { label: "CustPriceList", property: "CustPriceList" },
            { label: "CustGroup1", property: "CustGroup1" },
            { label: "ErpCustomer", property: "ErpCustomer" },
            { label: "DeliveringPlant", property: "DeliveringPlant" },
            { label: "MainCategory", property: "MainCategory" },
            { label: "MainCategoryLocal", property: "MainCategoryLocal" },
            { label: "Subcategory1", property: "Subcategory1" },
            { label: "Subcategory1Local", property: "Subcategory1Local" },
            { label: "Subcategory2", property: "Subcategory2" },
            { label: "Subcategory2Local", property: "Subcategory2Local" },
            { label: "Subcategory3", property: "Subcategory3" },
            { label: "Subcategory3Local", property: "Subcategory3Local" },
            { label: "Subcategory4", property: "Subcategory4" },
            { label: "Subcategory4Local", property: "Subcategory4Local" },
            { label: "Subcategory5", property: "Subcategory5" },            
            { label: "Subcategory5Local", property: "Subcategory5Local" }
          ];
          const oSettings = {
            workbook: { columns: aColumns },
            dataSource: [{}],
            fileName: "ItemStructureTemplate.xlsx"
          };
          const oSpreadsheet = new Spreadsheet(oSettings);
          oSpreadsheet.build()
            .then(() => MessageToast.show("Template downloaded."))
            .finally(() => oSpreadsheet.destroy());
        }
      });

      const oDialog = new Dialog({
        title: "Excel Upload",
        content: [oFileUploader],
        beginButton: oUploadButton,
        endButton: new Button({
          text: "Cancel",
          press: () => oDialog.close()
        }),
        customHeader: new sap.m.Bar({
          contentRight: [oDownloadButton]
        })
      });

      oDialog.open();
    },

    onDuplicate: function (oEvent) {
      const aSelectedContexts = this.getSelectedContexts();

      // Get the specific context of the row.
      const oContext = aSelectedContexts[0];
      const oModel = this.getModel();

      const aPromises = aSelectedContexts.map(oContext => {
        const oOperation = oModel.bindContext("PriceListService.copyRow(...)", oContext, {
          $$groupId: "$auto"
        });
        return oOperation.execute().then(() => {
          const oBinding = oContext.getBinding();
          if (oBinding) {
            oBinding.refresh();
          } else {
            oModel.refresh();
          }
        });
      });

      Promise.allSettled(aPromises).then(results => {
        const successCount = results.filter(r => r.status === "fulfilled").length;
        const failCount = results.filter(r => r.status === "rejected").length;

        if (successCount > 0) {
          MessageToast.show(successCount + " record(s) duplicated.");
        }

        if (failCount > 0) {
          MessageToast.show(failCount + " record(s) failed to duplicate.");
        }
      });
    }
  };
});