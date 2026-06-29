const { HEADER_TRACKED_FIELDS, LARGE_TEXT_FIELDS, LARGE_TEXT_CHANGE_MARKER } = require('./constants');

const LARGE_TEXT_FIELD_SET = new Set(LARGE_TEXT_FIELDS);

module.exports = async function logHeaderChanges(srv, tx, req, originalHeader, newHeader, headerId) {
    const { PricelistChangeLog } = srv.entities;
    const user = req.user?.id || 'unknown';
    const now  = new Date().toISOString();
    const logs = [];

    // for (const field of HEADER_TRACKED_FIELDS) {
    //     const oldVal = String(originalHeader[field] ?? '');
    //     const newVal = String(newHeader[field]       ?? '');
    //     if (oldVal === newVal) continue;
    //     logs.push({
    //         ID: cds.utils.uuid(), changedAt: now, changedBy: user,
    //         source: 'Header', refId: headerId,
    //         changeType: 'UPDATE', field,
    //         oldValue: oldVal, newValue: newVal
    //     });
    // }

    //changed the loop so that it is only logged that large text changed, but actual large text change is not logged. This is to optmize space in HANA DB.
    for (const field of HEADER_TRACKED_FIELDS) {
        const rawOldVal = String(originalHeader[field] ?? '');
        const rawNewVal = String(newHeader[field] ?? '');

        if (rawOldVal === rawNewVal) continue;

        const isLargeTextField = LARGE_TEXT_FIELD_SET.has(field);

        logs.push({
            ID: cds.utils.uuid(),
            changedAt: now,
            changedBy: user,
            source: 'Header',
            refId: headerId,
            changeType: 'UPDATE',
            field,
            oldValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : rawOldVal,
            newValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : rawNewVal
        });
    }

    if (logs.length) await tx.run(INSERT.into(PricelistChangeLog).entries(logs));
};