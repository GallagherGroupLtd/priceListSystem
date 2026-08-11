const cds = require("@sap/cds");

const { SELECT, INSERT } = cds.ql;

const APPLICATION_CHANGE_LOG_ENTITY = "com.sap.pricelistsystem.ApplicationChangeLog";

function getRequestId(req, result = null) {
    return (result?.ID || req.data?.ID || req.params?.[0]?.ID || req.params?.[0] || null);
}

function getObjectDescription(config, record, fallbackId) {
    if (!record) {
        return fallbackId || "";
    }

    if (typeof config.getObjectDescription === "function") {
        return (config.getObjectDescription(record) || fallbackId || "");
    }

    return fallbackId || "";
}

async function readChildren(tx, parentId, childConfig) {
    if (!parentId) {
        return [];
    }

    return tx.run(SELECT.from(childConfig.dbEntity).where({
            [childConfig.parentField || "parent_ID"]: parentId
        })
    );
}

async function readAggregate(tx, parentId, config) {
    if (!parentId) {
        return null;
    }

    const parent = await tx.run(SELECT.one.from(config.dbEntity).where({ ID: parentId }));

    if (!parent) {
        return null;
    }

    const children = {};

    for (const childConfig of config.children || []) {
        children[childConfig.name] = await readChildren(tx, parentId, childConfig);
    }

    return {
        parent,
        children
    };
}

async function logChildChanges({
    req,
    oldChildren = [],
    newChildren = [],
    application,
    functionalArea,
    childConfig
}) {
    let loggedCount = 0;

    const oldById = new Map(oldChildren.filter(row => row?.ID).map(row => [row.ID, row]));

    const newById = new Map(newChildren.filter(row => row?.ID).map(row => [row.ID, row]));

    const allIds = new Set([
        ...oldById.keys(),
        ...newById.keys()
    ]);

    for (const ID of allIds) {
        const oldRow = oldById.get(ID);
        const newRow = newById.get(ID);

        let changeType;

        if (!oldRow && newRow) {
            changeType = "CREATE";
        } else if (oldRow && !newRow) {
            changeType = "DELETE";
        } else {
            changeType = "UPDATE";
        }

        const descriptionSource = newRow || oldRow;

        const objectDescription = getObjectDescription(childConfig,descriptionSource,ID);

        loggedCount += await logApplicationChanges({
            req,
            oldData: oldRow || null,
            newData: newRow || null,
            changeType,
            application,
            functionalArea,
            objectType: childConfig.objectType,
            objectId: ID,
            objectDescription,
            trackedFields: childConfig.trackedFields,
            fieldLabels: childConfig.fieldLabels || {}
        });
    }

    return loggedCount;
}

async function logAggregateChanges({
    req,
    oldAggregate,
    newAggregate,
    config
}) {
    let loggedCount = 0;

    const oldParent = oldAggregate?.parent || null;
    const newParent = newAggregate?.parent || null;

    let parentChangeType = null;

    if (!oldParent && newParent) {
        parentChangeType = "CREATE";
    } else if (oldParent && !newParent) {
        parentChangeType = "DELETE";
    } else if (oldParent && newParent) {
        parentChangeType = "UPDATE";
    }

    if (parentChangeType) {
        const parentRecord = newParent || oldParent;
        const parentId = parentRecord?.ID;

        const objectDescription = getObjectDescription(config,parentRecord,parentId);

        loggedCount += await logApplicationChanges({
            req,
            oldData: oldParent,
            newData: newParent,
            changeType: parentChangeType,
            application: config.application,
            functionalArea: config.functionalArea,
            objectType: config.objectType,
            objectId: parentId,
            objectDescription,
            trackedFields: config.trackedFields,
            fieldLabels: config.fieldLabels || {}
        });
    }

    for (const childConfig of config.children || []) {
        loggedCount += await logChildChanges({
            req,
            oldChildren: oldAggregate?.children?.[childConfig.name] || [],
            newChildren: newAggregate?.children?.[childConfig.name] || [],
            application: config.application,
            functionalArea: config.functionalArea,
            childConfig
        });
    }

    return loggedCount;
}

function registerApplicationChangeLogging(service, config) {
    const entity = config.entity;
    const auditKey = config.auditKey || config.objectType || config.functionalArea;

    const oldStateKey = `_${auditKey}_auditOldState`;
    const idKey = `_${auditKey}_auditId`;
    const deleteStateKey = `_${auditKey}_auditDeleteState`;

    service.before("SAVE", entity, async req => {
        try {
            const ID = getRequestId(req);

            if (!ID) {
                return;
            }

            const tx = cds.tx(req);

            req[oldStateKey] = await readAggregate(tx, ID, config);

            req[idKey] = ID;
        } catch (error) {
            console.error(`[ApplicationChangeLog][${auditKey}] Failed to capture pre-SAVE state:`,error);

            throw error;
        }
    });

    service.after("SAVE", entity, async (result, req) => {
        try {
            const ID = getRequestId(req, result) || req[idKey];

            if (!ID) {
                return;
            }

            const tx = cds.tx(req);

            const newAggregate = await readAggregate(tx, ID, config);

            if (!newAggregate) {
                console.warn(`[ApplicationChangeLog][${auditKey}] Saved record not found:`,ID);

                return;
            }

            const loggedCount = await logAggregateChanges({
                req,
                oldAggregate: req[oldStateKey],
                newAggregate,
                config
            });

            console.log(`[ApplicationChangeLog][${auditKey}] SAVE ${ID}: ${loggedCount} audit record(s)`);
        } catch (error) {
            console.error(`[ApplicationChangeLog][${auditKey}] Failed to log SAVE:`,error);

            throw error;
        }
    });

    service.before("DELETE", entity, async req => {
        try {
            const isActiveEntity = req.data?.IsActiveEntity ?? req.params?.[0]?.IsActiveEntity;

            if (isActiveEntity === false) {
                return;
            }

            const ID = getRequestId(req);

            if (!ID) {
                return;
            }

            const tx = cds.tx(req);

            const existingAggregate = await readAggregate(tx, ID, config);

            if (!existingAggregate) {
                return;
            }

            req[deleteStateKey] = existingAggregate;
        } catch (error) {
            console.error(`[ApplicationChangeLog][${auditKey}] Failed to capture pre-DELETE state:`,error);

            throw error;
        }
    });

    service.after("DELETE", entity, async (result, req) => {
        try {
            const oldAggregate = req[deleteStateKey];

            if (!oldAggregate) {
                return;
            }

            const loggedCount = await logAggregateChanges({
                req,
                oldAggregate,
                newAggregate: null,
                config
            });

            console.log(`[ApplicationChangeLog][${auditKey}] DELETE: ${loggedCount} audit record(s)`);
        } catch (error) {
            console.error(`[ApplicationChangeLog][${auditKey}] Failed to log DELETE:`,error);

            throw error;
        }
    });
}

function toAuditValue(value) {
    if (value === undefined || value === null) {
        return "";
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

function valuesEqual(oldValue, newValue) {
    return toAuditValue(oldValue) === toAuditValue(newValue);
}

function buildRecordSnapshot(record, trackedFields) {
    if (!record) {
        return "";
    }

    const snapshot = {};

    for (const field of trackedFields) {
        const value = record[field];

        if (value !== undefined && value !== null && value !== "") {
            snapshot[field] = value;
        }
    }

    return JSON.stringify(snapshot);
}

async function logApplicationChanges({
    req,
    oldData,
    newData,
    changeType,
    application,
    functionalArea,
    objectType,
    objectId,
    objectDescription,
    trackedFields,
    fieldLabels = {}
}) {
    const entries = [];

    const now = new Date();
    const changedBy = req.user?.id || req.user?.email || "unknown";

    if (changeType === "CREATE") {
        entries.push({
            ID: cds.utils.uuid(),
            changedAt: now,
            changedBy,
            application,
            functionalArea,
            objectType,
            objectId,
            objectDescription,
            changeType: "CREATE",
            field: "*",
            fieldLabel: "Record",
            oldValue: "",
            newValue: buildRecordSnapshot(newData, trackedFields)
        });
    }

    if (changeType === "UPDATE") {
        for (const field of trackedFields) {
            const oldValue = oldData?.[field];
            const newValue = newData?.[field];

            if (valuesEqual(oldValue, newValue)) {
                continue;
            }

            entries.push({
                ID: cds.utils.uuid(),
                changedAt: now,
                changedBy,
                application,
                functionalArea,
                objectType,
                objectId,
                objectDescription,
                changeType: "UPDATE",
                field,
                fieldLabel: fieldLabels[field] || field,
                oldValue: toAuditValue(oldValue),
                newValue: toAuditValue(newValue)
            });
        }
    }

    if (changeType === "DELETE") {
        entries.push({
            ID: cds.utils.uuid(),
            changedAt: now,
            changedBy,
            application,
            functionalArea,
            objectType,
            objectId,
            objectDescription,
            changeType: "DELETE",
            field: "*",
            fieldLabel: "Record",
            oldValue: buildRecordSnapshot(oldData, trackedFields),
            newValue: ""
        });
    }

    if (!entries.length) {
        return 0;
    }

    const tx = cds.tx(req);

    await tx.run(INSERT.into(APPLICATION_CHANGE_LOG_ENTITY).entries(entries));

    return entries.length;
}

module.exports = {
    logApplicationChanges,
    registerApplicationChangeLogging
};