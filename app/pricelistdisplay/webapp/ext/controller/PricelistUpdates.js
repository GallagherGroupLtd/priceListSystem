sap.ui.define([], function () {
    "use strict";
    function findTargetControl(oSourceControl,sTargetId) {
        if (!oSourceControl || !sTargetId) {
            return null;
        }

        const aElements = sap.ui.core.Element.registry.all();

        const sExpectedSuffix = `--${sTargetId}`;

        const aMatchingControls = Object.keys(aElements).filter(function (sControlId) {
            return (sControlId === sTargetId || sControlId.endsWith(sExpectedSuffix));
        }).map(function (sControlId) {
            return aElements[sControlId];
        });

        if (!aMatchingControls.length) {
            return null;
        }

        const sSourceId = oSourceControl.getId();

        const oSameSectionTarget = aMatchingControls.find(function (oControl) {
            const sControlId = oControl.getId();
            const iSharedPrefixLength = getSharedPrefixLength(sSourceId,sControlId);
            return (iSharedPrefixLength > 0);
        });

        return (oSameSectionTarget || aMatchingControls[0]);
    }

    function getSharedPrefixLength(sLeft,sRight) {
        const iLength = Math.min(sLeft.length,sRight.length);
        let iIndex = 0;

        while (iIndex < iLength && sLeft[iIndex] === sRight[iIndex]) {
            iIndex += 1;
        }

        return iIndex;
    }

    function applyRowStyles(oTable) {
        if (!oTable || typeof oTable.getRows !== "function") {
            return;
        }

        oTable.getRows().forEach(
            function (oRow) {
                const oContext = oRow.getBindingContext("jsonModel");
                const bChanged = Boolean(oContext && oContext.getProperty("isChanged"));
                const bStructuralOnly = Boolean(oContext && oContext.getProperty("isStructuralOnly"));
                const bAdded = Boolean(oContext && oContext.getProperty("isAdded"));
                const bRemoved = Boolean(oContext && oContext.getProperty("isRemoved"));

                oRow.toggleStyleClass("pricelistVersionHistoryChangedRow",bChanged && !bStructuralOnly);
                oRow.toggleStyleClass("pricelistVersionHistoryAddedRow",bAdded && !bStructuralOnly);
                oRow.toggleStyleClass("pricelistVersionHistoryRemovedRow",bRemoved && !bStructuralOnly);
            }
        );
    }

    return {
        onNavigate: function (oEvent) {
            const oSource = oEvent.getSource();
            const sTargetId = oSource.data("target");
            const oTarget = findTargetControl(oSource,sTargetId);

            if (!oTarget || !oTarget.getDomRef()) {
                return;
            }

            oTarget.getDomRef().scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        },

        onRowsUpdated: function (oEvent) {
            applyRowStyles(oEvent.getSource());
        },

        priceState: function (sDirection) {
            if (sDirection === "INCREASE") {
                return "Error";
            }

            if (sDirection === "DECREASE") {
                return "Success";
            }

            return "None";
        },

        changeState: function (sChangeType) {
            if (sChangeType === "ADDED") {
                return "Success";
            }

            if (sChangeType === "REMOVED") {
                return "Error";
            }

            return "None";
        }
    };
});