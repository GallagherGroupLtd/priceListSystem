const cds = require("@sap/cds");

const { SELECT } = cds.ql;

function normalize(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function equalsNormalized(left, right) {
    return normalize(left) === normalize(right);
}

function isInternalAdmin(assignment) {
    return (assignment?.AccountType === "Internal" && assignment?.AccountScope === "Admin");
}

function isInternalRegional(assignment) {
    return (assignment?.AccountType === "Internal" && assignment?.AccountScope === "Regional");
}

function isExternalCustomer(assignment) {
    return (assignment?.AccountType === "External" && assignment?.AccountScope === "Customer");
}

/**
 * Existing display-app rules:
 * Regional:
 * PricelistType + Region + Country
 * External:
 * SalesOrg + PricelistType + Region + Country
 */
function matchesPublishedRecipientScope(assignment, scope, pricelist) {
    if (isInternalAdmin(assignment) || isInternalRegional(assignment)) {
        return (!!normalize(scope.PricelistType) && !!normalize(scope.MarketScopeRegion) && !!normalize(scope.MarketScopeCountry) && equalsNormalized(scope.PricelistType,pricelist.PricelistType) &&
            equalsNormalized(scope.MarketScopeRegion,pricelist.MarketScopeRegion) && equalsNormalized(scope.MarketScopeCountry,pricelist.MarketScopeCountry));
    }

    if (isExternalCustomer(assignment)) {
        return (!!normalize(scope.SalesOrg) && !!normalize(scope.PricelistType) && !!normalize(scope.MarketScopeRegion) && !!normalize(scope.MarketScopeCountry) &&
            equalsNormalized(scope.SalesOrg,pricelist.SalesOrg) && equalsNormalized(scope.PricelistType,pricelist.PricelistType) && 
            equalsNormalized(scope.MarketScopeRegion,pricelist.MarketScopeRegion) && equalsNormalized(scope.MarketScopeCountry,pricelist.MarketScopeCountry));
    }

    return false;
}

async function resolveInternalAdminRecipients(tx,pricelist) {
    const {
        AccountAssignment,
        AccountAssignmentScope
    } = cds.entities(
        "com.sap.pricelistsystem"
    );

    const assignments = await tx.run(
        SELECT.from(AccountAssignment)
            .columns(
                "ID",
                "Email",
                "AccountType",
                "AccountScope"
            )
            .where({
                AccountType: "Internal",
                AccountScope: "Admin"
            })
    );

    if (!assignments.length) {
        return [];
    }

    const assignmentIds = assignments.map((assignment) => assignment.ID);

    const scopes = await tx.run(
        SELECT.from(AccountAssignmentScope)
            .columns(
                "ID",
                "parent_ID",
                "PricelistType",
                "MarketScopeRegion",
                "MarketScopeCountry",
                "SalesOrg",
                "DistChannel"
            )
            .where({
                parent_ID: {
                    in: assignmentIds
                }
            })
    );

    const scopesByAssignmentId = new Map();

    for (const scope of scopes) {
        const assignmentId = String(scope.parent_ID);

        if (!scopesByAssignmentId.has(assignmentId)) {
            scopesByAssignmentId.set(assignmentId,[]);
        }

        scopesByAssignmentId.get(assignmentId).push(scope);
    }

    const recipientsByEmail = new Map();

    for (const assignment of assignments) {
        const email = normalize(assignment.Email).toLowerCase();

        if (!email) {
            continue;
        }

        const assignmentScopes = scopesByAssignmentId.get(String(assignment.ID)) || [];

        const hasMatchingScope = assignmentScopes.some((scope) => matchesPublishedRecipientScope(assignment,scope,pricelist));

        if (!hasMatchingScope) {
            continue;
        }

        recipientsByEmail.set(email, {
            Email: email,
            AccountType: assignment.AccountType,
            AccountScope: assignment.AccountScope
        });
    }

    return [
        ...recipientsByEmail.values()
    ];
}

async function resolvePublishedRecipients(tx, pricelist) {
    const {
        AccountAssignment,
        AccountAssignmentScope
    } = cds.entities("com.sap.pricelistsystem");

    const assignments = await tx.run(
        SELECT.from(AccountAssignment).columns(
            "ID",
            "Email",
            "AccountType",
            "AccountScope"
        ).where([
            "(",
            { ref: ["AccountType"] }, "=", { val: "Internal" },
            "and",
            { ref: ["AccountScope"] }, "=", { val: "Regional" },
            ")",
            "or",
            "(",
            { ref: ["AccountType"] }, "=", { val: "External" },
            "and",
            { ref: ["AccountScope"] }, "=", { val: "Customer" },
            ")"
        ])
    );

    if (!assignments.length) {
        return [];
    }

    const assignmentIds = assignments.map(
        (assignment) => assignment.ID
    );

    const scopes = await tx.run(
        SELECT.from(AccountAssignmentScope).columns(
            "ID",
            "parent_ID",
            "PricelistType",
            "MarketScopeRegion",
            "MarketScopeCountry",
            "SalesOrg",
            "DistChannel"
        ).where({
            parent_ID: {
                in: assignmentIds
            }
        })
    );

    const scopesByAssignmentId = new Map();

    for (const scope of scopes) {
        const assignmentId = String(scope.parent_ID);

        if (!scopesByAssignmentId.has(assignmentId)) {
            scopesByAssignmentId.set(assignmentId, []);
        }

        scopesByAssignmentId.get(assignmentId).push(scope);
    }

    const recipientsByEmail = new Map();

    for (const assignment of assignments) {
        const email = normalize(assignment.Email).toLowerCase();

        if (!email) {
            continue;
        }

        const assignmentScopes = scopesByAssignmentId.get(String(assignment.ID)) || [];

        const hasMatchingScope = assignmentScopes.some((scope) => matchesPublishedRecipientScope(assignment,scope,pricelist));

        if (!hasMatchingScope) {
            continue;
        }

        recipientsByEmail.set(email, {
            Email: email,
            AccountType: assignment.AccountType,
            AccountScope: assignment.AccountScope
        });
    }

    return [
        ...recipientsByEmail.values()
    ];
}

module.exports = {
    resolveInternalAdminRecipients,
    resolvePublishedRecipients,
    matchesPublishedRecipientScope,
    isInternalAdmin,
    isInternalRegional,
    isExternalCustomer
};