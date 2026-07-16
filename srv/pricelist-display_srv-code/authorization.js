const cds = require('@sap/cds');

const { SELECT } = cds.ql;

const DB_NAMESPACE = 'com.sap.pricelistsystem';
const ERROR_MESSAGE = 'Cannot display pricelist app to you.';

async function filterPricelistData(req) {
    const db = cds.transaction(req);

    const PricelistData = getEntity('PricelistData');
    const AccountAssignment = getEntity('AccountAssignment');
    const AccountAssignmentScope = getEntity('AccountAssignmentScope');

    const email = getUserEmail(req);

    if (!email) {
        return req.reject(403, ERROR_MESSAGE);
    }

    const assignment = await db.run(
        SELECT.one
            .from(AccountAssignment)
            .where`lower(Email) = ${email}`
    );

    if (!assignment) {
        return req.reject(403, ERROR_MESSAGE);
    }

    const publishedWhere = [
        { ref: ['Status'] },
        '=',
        { val: 'Published' }
    ];

    if (assignment.AccountType === 'Internal' && assignment.AccountScope === 'Admin') {
        req.query.SELECT.where = mergeWhere(req.query.SELECT.where, publishedWhere);
        return db.run(req.query);
    }

    const scopes = await db.run(
        SELECT
            .from(AccountAssignmentScope)
            .where({ parent_ID: assignment.ID })
    );

    if (!scopes || scopes.length === 0) {
        return req.reject(403, ERROR_MESSAGE);
    }

    const scopeWhere = buildScopeWhere(assignment, scopes);

    if (!scopeWhere || scopeWhere.length === 0) {
        return req.reject(403, ERROR_MESSAGE);
    }

    req.query.SELECT.where = mergeWhere(req.query.SELECT.where, [
        ...publishedWhere,
        'and',
        '(',
        ...scopeWhere,
        ')'
    ]);

    return db.run(req.query);
}

function getEntity(entityName) {
    const fullName = `${DB_NAMESPACE}.${entityName}`;
    const entity = cds.model.definitions[fullName];

    if (!entity) {
        throw new Error(`Entity not found in CDS model: ${fullName}`);
    }

    return entity;
}

function getUserEmail(req) {
    const attr = req.user?.attr || {};

    const email =
        firstValue(attr.email) ||
        firstValue(attr.mail) ||
        firstValue(attr.user_name) ||
        firstValue(attr.userName) ||
        req.user?.id;

    if (!email || typeof email !== 'string') {
        return null;
    }

    return email.trim().toLowerCase();
}

function firstValue(value) {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
}

function buildScopeWhere(assignment, scopes) {
    const conditions = [];

    for (const scope of scopes) {
        const rowCondition = buildRowCondition(assignment, scope);

        if (!rowCondition || rowCondition.length === 0) {
            continue;
        }

        if (conditions.length > 0) {
            conditions.push('or');
        }

        conditions.push('(', ...rowCondition, ')');
    }

    return conditions;
}

function buildRowCondition(assignment, scope) {
    if (assignment.AccountType === 'Internal' && assignment.AccountScope === 'Regional') {
        if (
            !scope.PricelistType ||
            !scope.MarketScopeRegion ||
            !scope.MarketScopeCountry
        ) {
            return [];
        }

        return [
            { ref: ['PricelistType'] }, '=', { val: scope.PricelistType },
            'and',
            { ref: ['MarketScopeRegion'] }, '=', { val: scope.MarketScopeRegion },
            'and',
            { ref: ['MarketScopeCountry'] }, '=', { val: scope.MarketScopeCountry }
        ];
    }

    if (assignment.AccountType === 'External' && assignment.AccountScope === 'Customer') {
        if (
            !scope.SalesOrg ||
            !scope.PricelistType ||
            !scope.MarketScopeRegion ||
            !scope.MarketScopeCountry
        ) {
            return [];
        }

        return [
            { ref: ['SalesOrg'] }, '=', { val: scope.SalesOrg },
            'and',
            { ref: ['PricelistType'] }, '=', { val: scope.PricelistType },
            'and',
            { ref: ['MarketScopeRegion'] }, '=', { val: scope.MarketScopeRegion },
            'and',
            { ref: ['MarketScopeCountry'] }, '=', { val: scope.MarketScopeCountry }
        ];
    }

    return [];
}

function mergeWhere(existingWhere, additionalWhere) {
    if (!existingWhere || existingWhere.length === 0) {
        return additionalWhere;
    }

    return [
        '(',
        ...existingWhere,
        ')',
        'and',
        '(',
        ...additionalWhere,
        ')'
    ];
}

async function getCurrentAccountAssignment(req) {
    const db = cds.transaction(req);

    const AccountAssignment = getEntity('AccountAssignment');
    const AccountAssignmentScope = getEntity('AccountAssignmentScope');

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
            .where({ parent_ID: assignment.ID })
    );

    return {
        assignment,
        scopes: scopes || []
    };
}

function isInternalUser(assignment) {
    return Boolean(
        assignment &&
        assignment.AccountType === 'Internal' &&
        (
            assignment.AccountScope === 'Admin' ||
            assignment.AccountScope === 'Regional'
        )
    );
}

function isExternalCustomer(assignment) {
    return Boolean(
        assignment &&
        assignment.AccountType === 'External' &&
        assignment.AccountScope === 'Customer'
    );
}

module.exports = {
    filterPricelistData,
    getCurrentAccountAssignment,
    isInternalUser,
    isExternalCustomer
};