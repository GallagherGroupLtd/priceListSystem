sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/ui/layout/form/SimpleForm"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, Button, Label, Input, SimpleForm) {
    "use strict";

    return Controller.extend("pricelistapp.pricelistmaintain.ext.controller.TermsandConditions", {
        onInit: function () {
            const component = this.getOwnerComponent();

            // Shared model for the Terms section
            if (!component.getModel("terms")) {
                component.setModel(new JSONModel({
                    headerTerms: [],
                    detailTerms: [],
                    hasTerms: false
                }), "terms");
            }

            // Reload whenever the FE Object Page context changes (navigate to another Pricelist)
            this.getView().attachEvent("modelContextChange", () => {
                this._loadTermsForCurrentHeader();
            });

            this._lastHeaderSignature = null;
        },

        // -----------------------------
        // Context helpers
        // -----------------------------
        _findPricelistRootContext: function () {
            let control = this.getView();
            while (control) {
                const context = control.getBindingContext && control.getBindingContext();
                if (context && context.getPath && context.getPath().includes("PricelistData")) {
                    return context;
                }
                control = control.getParent && control.getParent();
            }
            return null;
        },

        _getHeaderCriteria: function () {
            const rootContext = this._findPricelistRootContext();
            if (!rootContext || !rootContext.getObject) return null;

            const headerObject = rootContext.getObject();
            if (!headerObject) return null;

            return {
                TradeScenario: headerObject.TradeScenario,
                MarketScopeRegion: headerObject.MarketScopeRegion,
                MarketScopeCountry: headerObject.MarketScopeCountry,
                SalesOrg: headerObject.SalesOrg,
                DistChannel: headerObject.DistChannel,
                CustPriceList: headerObject.CustPriceList,
                CustGroup1: headerObject.CustGroup1,
                ErpCustomer: headerObject.ErpCustomer,
                DeliveringPlant: headerObject.DeliveringPlant
            };
        },

        _makeHeaderSignature: function (criteria) {
            return [
                criteria.TradeScenario,
                criteria.MarketScopeRegion,
                criteria.MarketScopeCountry,
                criteria.SalesOrg,
                criteria.DistChannel,
                criteria.CustPriceList,
                criteria.CustGroup1,
                criteria.ErpCustomer,
                criteria.DeliveringPlant
            ].map(v => String(v ?? "")).join("|");
        },

        // -----------------------------
        // Wildcard + priority logic
        // -----------------------------
        _escapeODataValue: function (value) {
            return String(value ?? "").replace(/'/g, "''").trim();
        },

        _buildWildcardCondition: function (fieldName, fieldValue) {
            const escapedValue = this._escapeODataValue(fieldValue);

            // If header field is blank -> only wildcard rows can match
            if (!escapedValue) {
                return `(${fieldName} eq '*')`;
            }
            return `(${fieldName} eq '${escapedValue}' or ${fieldName} eq '*')`;
        },

        _computeSpecificityScore: function (termRecord, headerCriteria) {
            const matchFields = [
                "TradeScenario",
                "MarketScopeRegion",
                "MarketScopeCountry",
                "SalesOrg",
                "DistChannel",
                "CustPriceList",
                "CustGroup1",
                "ErpCustomer",
                "DeliveringPlant"
            ];

            let score = 0;

            for (const field of matchFields) {
                const termValue = String(termRecord[field] ?? "").trim();
                const headerValue = String(headerCriteria[field] ?? "").trim();

                if (termValue === "*") {
                    score += 0;          // wildcard is least specific
                } else if (termValue === headerValue) {
                    score += 10;         // exact match is most specific
                } else {
                    score -= 1000;       // mismatch (should not pass filter, but keep safe)
                }
            }

            return score;
        },

        _levelRank: function (level) {
            if (level === "Header") return 0;
            if (level === "Detail") return 1;
            return 2;
        },

        // -----------------------------
        // Main loader
        // -----------------------------
        _loadTermsForCurrentHeader: async function () {
            const headerCriteria = this._getHeaderCriteria();
            const termsModel = this.getOwnerComponent().getModel("terms");
            const odataModel = this.getView().getModel(); // default OData V4 model

            if (!headerCriteria) {
                termsModel.setProperty("/headerTerms", []);
                termsModel.setProperty("/detailTerms", []);
                termsModel.setProperty("/hasTerms", false);
                return;
            }

            // Avoid reloading if same header values
            const currentSignature = this._makeHeaderSignature(headerCriteria);
            if (currentSignature === this._lastHeaderSignature) {
                return;
            }
            this._lastHeaderSignature = currentSignature;

            // Build wildcard-aware $filter
            const cond = this._buildWildcardCondition.bind(this);
            const filterExpression = [
                cond("TradeScenario", headerCriteria.TradeScenario),
                cond("MarketScopeRegion", headerCriteria.MarketScopeRegion),
                cond("MarketScopeCountry", headerCriteria.MarketScopeCountry),
                cond("SalesOrg", headerCriteria.SalesOrg),
                cond("DistChannel", headerCriteria.DistChannel),
                cond("CustPriceList", headerCriteria.CustPriceList),
                cond("CustGroup1", headerCriteria.CustGroup1),
                cond("ErpCustomer", headerCriteria.ErpCustomer),
                cond("DeliveringPlant", headerCriteria.DeliveringPlant)
            ].join(" and ");

            // Fetch candidate terms
            const listBinding = odataModel.bindList("/TermsAndConditions", null, null, null, {
                $filter: filterExpression
            });

            try {
                const contexts = await listBinding.requestContexts(0, 5000);
                const candidates = contexts.map(ctx => ctx.getObject()).filter(Boolean);

                // Score specificity
                candidates.forEach(record => {
                    record.__score = this._computeSpecificityScore(record, headerCriteria);
                });

                // Specific > wildcard override per (Level + FieldName)
                const bestByKey = new Map();
                for (const record of candidates) {
                    const key = `${record.PricelistDataLevel || ""}|${record.PricelistFieldName || ""}`;
                    const previous = bestByKey.get(key);
                    if (!previous || record.__score > previous.__score) {
                        bestByKey.set(key, record);
                    }
                }

                const resolved = Array.from(bestByKey.values());

                // Sort: Header then Detail, then specificity, then name
                resolved.sort((a, b) => {
                    const levelCompare = this._levelRank(a.PricelistDataLevel) - this._levelRank(b.PricelistDataLevel);
                    if (levelCompare !== 0) return levelCompare;

                    if (b.__score !== a.__score) return b.__score - a.__score;

                    return String(a.PricelistFieldName || "").localeCompare(String(b.PricelistFieldName || ""));
                });

                // Group visually
                const headerTerms = resolved.filter(r => r.PricelistDataLevel === "Header");
                const detailTerms = resolved.filter(r => r.PricelistDataLevel === "Detail");

                termsModel.setProperty("/headerTerms", headerTerms);
                termsModel.setProperty("/detailTerms", detailTerms);
                termsModel.setProperty("/hasTerms", (headerTerms.length + detailTerms.length) > 0);

            } catch (err) {
                termsModel.setProperty("/headerTerms", []);
                termsModel.setProperty("/detailTerms", []);
                termsModel.setProperty("/hasTerms", false);
            }
        },

        // Export to PDF
        onExportTermsToPDF: async function () {
            try {
                const header = this._getHeaderCriteria();
                if (!header) {
                    MessageToast.show("Header criteria not available.");
                    return;
                }

                const rootContext = this._findPricelistRootContext();
                const headerObject = rootContext?.getObject();
                if (!headerObject) {
                    MessageToast.show("Header criteria not available.");
                    return;
                }
                const payload = {
                    ID: headerObject.ID,   // <-- include the key
                    TradeScenario: headerObject.TradeScenario,
                    MarketScopeRegion: headerObject.MarketScopeRegion,
                    MarketScopeCountry: headerObject.MarketScopeCountry,
                    SalesOrg: headerObject.SalesOrg,
                    DistChannel: headerObject.DistChannel,
                    CustPriceList: headerObject.CustPriceList,
                    CustGroup1: headerObject.CustGroup1,
                    ErpCustomer: headerObject.ErpCustomer,
                    DeliveringPlant: headerObject.DeliveringPlant
                };


                // Call CAP Action to generate PDF
                const pdfResponse = await fetch("/odata/v4/price-list/exportTermsPdf", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/pdf"
                    },
                    body: JSON.stringify(payload) //header
                });

                if (!pdfResponse.ok) {
                    const errText = await pdfResponse.text();
                    throw new Error(errText);
                }

                // Always read as bytes first
                const arrayBuffer = await pdfResponse.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);

                // Helper: read first 4 chars
                const sig = String.fromCharCode(...bytes.slice(0, 4));

                let pdfBytes = bytes;

                // Case 1: Valid PDF stream
                if (sig !== "%PDF") {
                // Not a PDF. Try to interpret as text
                const text = new TextDecoder("utf-8").decode(bytes).trim();

                // Case 2: OData JSON response with base64 payload: { "value": "JVBERi0x..." }
                if (text.startsWith("{")) {
                    const obj = JSON.parse(text);
                    const b64 = obj && obj.value;
                    if (!b64) {
                    throw new Error("JSON response had no 'value' field for PDF.");
                    }
                    pdfBytes = this._base64ToUint8Array(b64);
                }
                // Case 3: raw base64 string (starts with JVBER...)
                else if (text.startsWith("JVBER")) {
                    pdfBytes = this._base64ToUint8Array(text);
                }
                // Case 4: HTML error page or something else
                else {
                    console.error("Not a PDF. First 200 chars:", text.slice(0, 200));
                    throw new Error("Response is not a valid PDF stream.");
                }

                // Re-check signature after decoding
                const sig2 = String.fromCharCode(...pdfBytes.slice(0, 4));
                if (sig2 !== "%PDF") {
                    throw new Error("Decoded content is still not a PDF.");
                }
                }

                // Download
                const blob = new Blob([pdfBytes], { type: "application/pdf" });

                // Get filename from Content-Disposition if provided
                const cd = pdfResponse.headers.get("content-disposition") || "";
                const match = /filename="?([^"]+)"?/i.exec(cd);
                const filename = match ? match[1] : `Terms_Conditions_${new Date().toISOString().slice(0, 10)}.pdf`;

                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                MessageToast.show("PDF downloaded.");
            } catch (e) {
                console.error("PDF export failed:", e);
                MessageToast.show("PDF export failed: " + (e.message || e));
            }
        },
        
        _base64ToUint8Array: function (base64) {
            const cleaned = String(base64 || "").replace(/^data:.*;base64,/, "");
            const binary = atob(cleaned);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }

    });
});