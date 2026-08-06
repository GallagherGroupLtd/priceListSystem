const cds = require("@sap/cds");

const { SELECT } = cds.ql;

const DB_NAMESPACE = "com.sap.pricelistsystem";

function getEntity(entityName) {
    const fullName = `${DB_NAMESPACE}.${entityName}`;
    const entity = cds.model.definitions[fullName];

    if (!entity) {
        throw new Error(`Entity not found in CDS model: ${fullName}`);
    }

    return entity;
}

function firstValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function getUserEmail(req) {
    const attr = req.user?.attr || {};

    const email = firstValue(attr.email) || firstValue(attr.mail) || firstValue(attr.user_name) || firstValue(attr.userName) || req.user?.email || req.user?.id;

    if (!email || typeof email !== "string") {
        return null;
    }

    return email.trim().toLowerCase();
}

async function getCurrentAccountAssignment(req) {
    const db = cds.transaction(req);

    const AccountAssignment = getEntity("AccountAssignment");
    const AccountAssignmentScope = getEntity("AccountAssignmentScope");

    const email = getUserEmail(req);

    if (!email) {
        return null;
    }

    const assignment = await db.run(
        SELECT.one
            .from(AccountAssignment)
            .where`lower(Email) = ${email}`
    );

    if (!assignment) {
        return null;
    }

    const scopes = await db.run(
        SELECT
            .from(AccountAssignmentScope)
            .where({
                parent_ID: assignment.ID
            })
    );

    return {
        email,
        assignment,
        scopes: scopes || []
    };
}

function isInternalAdmin(assignment) {
    return Boolean(assignment && assignment.AccountType === "Internal" && assignment.AccountScope === "Admin");
}

function isInternalUser(assignment) {
    return Boolean(assignment && assignment.AccountType === "Internal" && (assignment.AccountScope === "Admin" || assignment.AccountScope === "Regional"));
}

function isExternalCustomer(assignment) {
    return Boolean(assignment && assignment.AccountType === "External" && assignment.AccountScope === "Customer");
}

module.exports = {
    getEntity,
    getUserEmail,
    getCurrentAccountAssignment,
    isInternalAdmin,
    isInternalUser,
    isExternalCustomer
};