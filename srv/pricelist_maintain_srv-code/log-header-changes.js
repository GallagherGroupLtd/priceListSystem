const { HEADER_TRACKED_FIELDS } = require('./constants');

module.exports = async function logHeaderChanges(srv, tx, req, originalHeader, newHeader, headerId) {
    const { PricelistChangeLog } = srv.entities;
    const user = req.user?.id || 'unknown';
    const now  = new Date().toISOString();
    const logs = [];

    for (const field of HEADER_TRACKED_FIELDS) {
        const oldVal = String(originalHeader[field] ?? '');
        const newVal = String(newHeader[field]       ?? '');
        if (oldVal === newVal) continue;
        logs.push({
            ID: cds.utils.uuid(), changedAt: now, changedBy: user,
            source: 'Header', refId: headerId,
            changeType: 'UPDATE', field,
            oldValue: oldVal, newValue: newVal
        });
    }

    if (logs.length) await tx.run(INSERT.into(PricelistChangeLog).entries(logs));
};