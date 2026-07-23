const cds = require('@sap/cds');

const { SELECT } = cds.ql;

const { getEntity, getUserEmail, getCurrentAccountAssignment, isInternalAdmin, isInternalUser, isExternalCustomer } = require("../lib/account-assignment-authorization");

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
        { val: 'Published' },
        'and',
        { ref: ['IsVersionActive'] },
        '=',
        { val: true }
    ];

    if (isInternalAdmin(assignment)) {
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

module.exports = {
    filterPricelistData,
    getCurrentAccountAssignment,
    isInternalAdmin,
    isInternalUser,
    isExternalCustomer
};