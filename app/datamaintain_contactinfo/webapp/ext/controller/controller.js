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
            // Strip off the "data:...;base64," prefix
            const base64 = e.target.result.split(",")[1];

            // Get Model
            const oModel = this.getModel();

            try {
              const response = await fetch("/odata/v4/price-list/MassUploadContactInfo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: base64 })
              });

              if (!response.ok) {
                throw new Error(await response.text());
              }

              //Refresh model.
              oModel.refresh();

              MessageToast.show("Upload successful.");
              if (this._oUploadDialog) {
                this._oUploadDialog.close();
              }
            } catch (err) {
              MessageToast.show("Upload failed: " + err.message);
            }
          };
          oReader.readAsDataURL(this._file);
          oDialog.close();
        }
      });

      const oDownloadButton = new Button({
        text: "Download Contact Info Template",
        press: () => {
          const aColumns = [
            { label: "TradeScenario", property: "TradeScenario" },
            { label: "MarketScopeRegion", property: "MarketScopeRegion" },
            { label: "MarketScopeCountry", property: "MarketScopeCountry" },
            { label: "ContactEmail", property: "ContactEmail" },
            { label: "ContactNumber", property: "ContactNumber" }
          ];
          const oSettings = {
            workbook: { columns: aColumns },
            dataSource: [{}],
            fileName: "ContactInfoTemplate.xlsx"
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

      // Call the bound action passing the selected context of the row to copy.
      const oOperation = oModel.bindContext("PriceListService.copyRow(...)", oContext, {
        $$groupId: "$auto" 
      });

      oOperation.execute().then(function () {
        MessageToast.show("Record duplicated.");

        const oBinding = oContext.getBinding();
        if (oBinding) {
            oBinding.refresh();
        } else {
            oModel.refresh();
        }
      }.bind(this)).catch(function (oError) {
        MessageToast.show("Duplicate failed: " + oError.message);
      }.bind(this));
    }
  };
});