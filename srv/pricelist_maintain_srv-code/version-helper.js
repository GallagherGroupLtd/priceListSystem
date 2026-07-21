// ─── Version Helpers ──────────────────────────────────────────────────────────
// Keeps all version parsing/formatting rules in one place.

const PUBLISHED = "Published";

const getVersionNumber = (versionText) => {
    if (!versionText) return 0.1;

    const text = String(versionText).trim();
    const match = text.match(/(\d+(?:\.\d+)?)$/);

    if (!match) return 0.1;

    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : 0.1;

    //Commented older code as older version of pricelist are not being supported due to not having the same nomenclature after recent changes in pricelist app.
    // const valuePart = String(versionText).includes(":")
    //     ? String(versionText).split(":").pop().trim()
    //     : String(versionText).trim();

    // return parseFloat(valuePart) || 0.1;
};

const formatEffectiveDate = (effectiveDate) => {
    const d = new Date(effectiveDate);
    if (isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();
    const mmm = d.toLocaleString("en-US", { month: "short" });
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mmm}-${dd}`;
};

const formatVersion = (effectiveDate, versionNumber) => {
    const prefix = formatEffectiveDate(effectiveDate);
    return prefix ? `${prefix}:${versionNumber}` : String(versionNumber);
};

const computeVersion = (current, oldStatus, newStatus, effectiveDate) => {
    const currentNumber = getVersionNumber(current);
    const baseInteger = Math.floor(currentNumber);

    let nextNumber = currentNumber;

    if (newStatus === PUBLISHED && oldStatus !== PUBLISHED) {
        nextNumber = baseInteger + 1;
    } else if (oldStatus === PUBLISHED && newStatus !== PUBLISHED) {
        nextNumber = baseInteger + 0.1;
    }

    return formatVersion(effectiveDate, nextNumber);
};

module.exports = {
    PUBLISHED,
    getVersionNumber,
    formatEffectiveDate,
    formatVersion,
    computeVersion
};