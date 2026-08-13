sap.ui.define(
    [
        "sap/ui/core/mvc/ControllerExtension"
    ],
    function (ControllerExtension) {
        "use strict";

        return ControllerExtension.extend(
            "pricelistapp.applicationlog.ext.controller.ApplicationLogListExt",
            {
                override: {
                    onInit: function () {
                        // Reserved for Application Log UI behaviour.
                    }
                }
            }
        );
    }
);