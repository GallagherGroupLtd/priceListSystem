// ─── Version Helpers ──────────────────────────────────────────────────────────
// Keeps all version parsing/formatting rules in one place.

const PUBLISHED = "Published";

const getVersionNumber = (versionText) => {
    if (!versionText) return 0.1;

    const valuePart = String(versionText).includes(":")
        ? String(versionText).split(":").pop().trim()
        : String(versionText).trim();

    return parseFloat(valuePart) || 0.1;
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