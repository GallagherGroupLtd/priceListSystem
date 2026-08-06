sap.ui.define([], function () {
    "use strict";

    const DATE_MONTHS = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];

    function formatTreeDate(vDate) {
        if (vDate === null || vDate === undefined || vDate === "") {
            return "";
        }

        if (vDate instanceof Date && !Number.isNaN(vDate.getTime())) {
            return [vDate.getFullYear(),DATE_MONTHS[vDate.getMonth()],String(vDate.getDate()).padStart(2, "0")].join("-");
        }

        const sDate = String(vDate).trim();
        const aMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(sDate);

        if (!aMatch) {
            return sDate;
        }

        const iMonth = Number(aMatch[2]);

        if (iMonth < 1 || iMonth > 12) {
            return sDate;
        }

        return `${aMatch[1]}-${DATE_MONTHS[iMonth - 1]}-${aMatch[3]}`;
    }

    function formatTreeDateRange(vDateFrom, vDateTo) {
        const sDateFrom = formatTreeDate(vDateFrom);
        const sDateTo = formatTreeDate(vDateTo);

        if (sDateFrom && sDateTo) {
            return `${sDateFrom} - ${sDateTo}`;
        }

        return sDateFrom || sDateTo || "";
    }

    return {
        formatTreeDate: formatTreeDate,
        formatTreeDateRange: formatTreeDateRange
    };
});