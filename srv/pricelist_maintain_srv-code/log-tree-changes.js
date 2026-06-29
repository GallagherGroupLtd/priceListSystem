const { TREE_TRACKED_FIELDS, LARGE_TEXT_FIELDS, LARGE_TEXT_CHANGE_MARKER } = require('./constants');

const LARGE_TEXT_FIELD_SET = new Set(LARGE_TEXT_FIELDS);

module.exports = async function logTreeChanges(srv, tx, req, originalRows, newRows, deletedIds) {
    const { PricelistChangeLog } = srv.entities;
    const user = req.user?.id || 'unknown';
    const now  = new Date().toISOString();
    const logs = [];

    const originalById = Object.fromEntries(originalRows.map(r => [r.ID, r]));

    // CREATED rows
    for (const row of newRows.filter(r => !originalById[r.ID])) {
        logs.push({
            ID: cds.utils.uuid(), changedAt: now, changedBy: user,
            source: 'Tree', refId: row.ID,
            changeType: 'CREATE', field: '*',
            oldValue: null, newValue: row.Title
        });
    }

    // UPDATED rows — diff field by field
    for (const row of newRows.filter(r => originalById[r.ID])) {
        const orig = originalById[row.ID];
        // for (const field of TREE_TRACKED_FIELDS) {
        //     const oldVal = String(orig[field] ?? '');
        //     const newVal = String(row[field]  ?? '');
        //     if (oldVal === newVal) continue;
        //     logs.push({
        //         ID: cds.utils.uuid(), changedAt: now, changedBy: user,
        //         source: 'Tree', refId: row.ID,
        //         changeType: 'UPDATE', field,
        //         oldValue: oldVal, newValue: newVal
        //     });
        // }

        for (const field of TREE_TRACKED_FIELDS) {
            const rawOldVal = String(orig[field] ?? '');
            const rawNewVal = String(row[field] ?? '');

            if (rawOldVal === rawNewVal) continue;

            const isLargeTextField = LARGE_TEXT_FIELD_SET.has(field);

            logs.push({
                ID: cds.utils.uuid(),
                changedAt: now,
                changedBy: user,
                source: 'Tree',
                refId: row.ID,
                changeType: 'UPDATE',
                field,
                oldValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : rawOldVal,
                newValue: isLargeTextField ? LARGE_TEXT_CHANGE_MARKER : rawNewVal
            });
        }
    }

    // DELETED rows
    for (const id of deletedIds) {
        const orig = originalById[id];
        logs.push({
            ID: cds.utils.uuid(), changedAt: now, changedBy: user,
            source: 'Tree', refId: id,
            changeType: 'DELETE', field: '*',
            oldValue: orig?.Title ?? id, newValue: null
        });
    }

    if (logs.length) await tx.run(INSERT.into(PricelistChangeLog).entries(logs));
};