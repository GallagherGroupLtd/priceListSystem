sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("pricelistapp.pricelistmaintain.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                Component.prototype.init.apply(this, arguments);

                this.getRouter().getRoute("PricelistDataObjectPage").attachPatternMatched(this._onObjectPageMatched, this);
            },

            _onObjectPageMatched: function () {
                // Clear tree model globally whenever Object Page navigation occurs
                const oTreeModel = this.getModel("tree");
                if (oTreeModel) {
                    oTreeModel.setProperty("/nodes", []);
                    oTreeModel.setProperty("/nodesAll", []);
                }
            }
        });
    }
);