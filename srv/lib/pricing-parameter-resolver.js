const cds = require('@sap/cds');

const ACCESS_MATCH_FIELDS = [
    {
        sourceField: 'SalesOrg',
        suffix: 'SALES_ORGANIZATION'
    },
    {
        sourceField: 'DistChannel',
        suffix: 'DISTRIBUTION_CHANNEL'
    },
    {
        sourceField: 'CustPriceList',
        suffix: 'PRICELIST_TYPE',
        matchBlank: true
    },
    {
        sourceField: 'CustGroup1',
        suffix: 'CUSTOMER_GROUP_1',
        matchBlank: true
    }
];

function escapeSql(value) {
    return String(value ?? '').replace(/'/g, "''");
}

function notEmpty(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
}

function normalize(value) {
    return notEmpty(value) ? String(value).trim() : '';
}

function toDateOnlyTimestamp(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
}

function getPricingReferenceDate(effectiveDate) {
    const today = new Date();

    const currentDateTimestamp = Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate());

    const effectiveDateTimestamp = toDateOnlyTimestamp(effectiveDate);

    if (effectiveDateTimestamp !== null && effectiveDateTimestamp > currentDateTimestamp) {
        return effectiveDateTimestamp;
    }

    return currentDateTimestamp;
}

function getAccessColumns(accessSequence) {
    return {
        conditionType: `${accessSequence}_CONDITION_TYPE`,
        validFrom: `${accessSequence}_VALID_FROM_DATE`,
        validTo: `${accessSequence}_VALID_TO_DATE`,
        material: `${accessSequence}_MATERIAL`,
        matchFields: ACCESS_MATCH_FIELDS.map(f => ({
            ...f,
            column: `${accessSequence}_${f.suffix}`
        }))
    };
}

function scoreHeader(row, context) {
    let score = 0;

    for (const field of [
        'PricelistType',
        'MarketScopeRegion',
        'MarketScopeCountry',
        'SalesOrg',
        'DistChannel',
        'CustPriceList',
        'CustGroup1',
        'ErpCustomer',
        'DeliveringPlant'
    ]) {
        const rowValue = normalize(row[field]);
        const contextValue = normalize(context[field]);

        if (!rowValue) continue;
        if (rowValue !== contextValue) return -1;

        score += 1;
    }

    return score;
}

function pickBestHeader(headers, context) {
    return (headers || [])
        .map(row => ({ row, score: scoreHeader(row, context) }))
        .filter(x => x.score >= 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return new Date(b.row.createdAt || 0) - new Date(a.row.createdAt || 0);
        })[0]?.row || null;
}

function pickBestByDate(records, targetDate) {
    if (!records?.length) return null;
    const targetTimestamp = typeof targetDate === 'number' ? targetDate : toDateOnlyTimestamp(targetDate);
    if (targetTimestamp === null) {
        return records[0];
    }

    return records.filter(record => {
        const validFromTimestamp = record.VALID_FROM ? toDateOnlyTimestamp(record.VALID_FROM) : -Infinity;
        const validToTimestamp = record.VALID_TO ? toDateOnlyTimestamp(record.VALID_TO) : Infinity;

        return (validFromTimestamp !== null && validToTimestamp !== null && validFromTimestamp <= targetTimestamp && targetTimestamp <= validToTimestamp);
    }).sort((a, b) => Number(a.PRIORITY || 999) - Number(b.PRIORITY || 999))[0] || null;
}

function pickNextAfterCurrent(records, currentRecord) {
    if (!records?.length || !currentRecord?.ValidTo) {
        return null;
    }

    const currentValidTo = new Date(currentRecord.ValidTo).getTime();

    if (Number.isNaN(currentValidTo)) {
        return null;
    }

    const nextValidFrom = records
        .map(record => {
            if (!record.VALID_FROM) {
                return null;
            }

            const validFrom = new Date(record.VALID_FROM).getTime();

            return Number.isNaN(validFrom) ? null : validFrom;
        })
        .filter(validFrom => validFrom !== null && validFrom > currentValidTo).sort((a, b) => a - b)[0];

    if (nextValidFrom === undefined) {
        return null;
    }

    return pickBestByDate(
        records,
        new Date(nextValidFrom)
    );
}

async function resolvePricingParameters({db,extdb,context,materialIds = [],parameterType,effectiveDate,resolutionMode = 'effectiveDate',currentRowsByMaterial = null}) {
    const headers = await db.run(
        SELECT.from("PricingParameterDetermination")
            .columns(
                "*",
                {
                    ref: ["entries"],
                    expand: [
                        { ref: ["ID"] },
                        { ref: ["ParameterType"] },
                        { ref: ["ConditionType"] },
                        { ref: ["AccessSequence"] },
                        { ref: ["Priority"] }
                    ]
                }
            )
            .orderBy({ createdAt: "desc" })
    );

    const selectedHeader = pickBestHeader(headers, context || {});
    if (!selectedHeader) return [];

    const entries = (selectedHeader.entries || [])
        .filter(e => e.ParameterType === parameterType && e.ConditionType && e.AccessSequence)
        .sort((a, b) => Number(a.Priority || 999) - Number(b.Priority || 999));

    if (!entries.length) return [];

    const colRows = await extdb.run(`
        SELECT COLUMN_NAME
        FROM SYS.TABLE_COLUMNS
        WHERE SCHEMA_NAME = 'SAPECC'
          AND TABLE_NAME = 'T_PRICELIST_MASTER_DATA'
    `);

    const availableCols = new Set((colRows || []).map(r => r.COLUMN_NAME));

    const sqlParts = entries.map(entry => {
        const accessSequence = entry.AccessSequence;
        const cols = getAccessColumns(accessSequence);

        if (!availableCols.has(cols.conditionType)) return null;

        const quoted = col => `"${col}"`;
        const where = [
            `${quoted(cols.conditionType)} = '${escapeSql(entry.ConditionType)}'`
        ];

        if (parameterType === 'P' && materialIds.length && availableCols.has(cols.material)) {
            const matSql = [...new Set(materialIds)]
                .filter(Boolean)
                .map(m => `'${escapeSql(m)}'`)
                .join(', ');

            if (matSql) {
                where.push(`${quoted(cols.material)} IN (${matSql})`);
            }
        }

        for (const match of cols.matchFields) {
            if (!availableCols.has(match.column)) continue;
            const contextValue = normalize(context?.[match.sourceField]);

            // if (notEmpty(contextValue) && availableCols.has(match.column)) {
            //     where.push(`${quoted(match.column)} = '${escapeSql(contextValue)}'`);
            // }
            if (contextValue) {
                where.push(`${quoted(match.column)} = '${escapeSql(contextValue)}'`);
            } else if (match.matchBlank) {
                where.push(`(${quoted(match.column)} IS NULL OR TRIM(${quoted(match.column)}) = '')`);
            }
        }

        const materialExpr = availableCols.has(cols.material) ? quoted(cols.material) : 'CAST(NULL AS NVARCHAR(100))';
        const validFromExpr = availableCols.has(cols.validFrom) ? quoted(cols.validFrom) : 'CAST(NULL AS NVARCHAR(50))';
        const validToExpr = availableCols.has(cols.validTo) ? quoted(cols.validTo) : 'CAST(NULL AS NVARCHAR(50))';

        return `
            SELECT
                '${escapeSql(accessSequence)}' AS "ACCESS_SEQUENCE",
                '${escapeSql(entry.ConditionType)}' AS "CONDITION_TYPE",
                ${Number(entry.Priority || 999)} AS "PRIORITY",
                ${materialExpr} AS "MATERIAL",
                "KONP_RATE" AS "RATE",
                "KONP_RATE_UNIT" AS "RATE_UNIT",
                ${validFromExpr} AS "VALID_FROM",
                ${validToExpr} AS "VALID_TO"
            FROM "SAPECC"."T_PRICELIST_MASTER_DATA"
            WHERE ${where.join(' AND ')}
        `;
    }).filter(Boolean);

    const records = sqlParts.length ? await extdb.run(sqlParts.join(' UNION ALL ')) : [];

    const grouped = new Map();

    for (const record of records || []) {
        const key = parameterType === 'P' ? normalize(record.MATERIAL) : '__DISCOUNT__';

        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(record);
    }

    const result = [];
    const pricingReferenceDate = parameterType === 'P' ? getPricingReferenceDate(effectiveDate) : effectiveDate;
    for (const [key, recordsForKey] of grouped.entries()) {
        let best = null;
        // const best = pickBestByDate(recordsForKey, effectiveDate);
        // if (!best) continue;
        if (resolutionMode === 'nextAfterCurrent') {
            const currentRecord = currentRowsByMaterial?.get(key) || null;
            best = pickNextAfterCurrent(recordsForKey,currentRecord);
        } else {
            best = pickBestByDate(recordsForKey,pricingReferenceDate);
        }

        if (!best) {
            continue;
        }

        result.push({
            Material: key === '__DISCOUNT__' ? null : key,
            Rate: best.RATE,
            RateUnit: best.RATE_UNIT,
            RateDisplay: [best.RATE, best.RATE_UNIT].filter(notEmpty).join(' '),
            ValidFrom: best.VALID_FROM,
            ValidTo: best.VALID_TO,
            AccessSequence: best.ACCESS_SEQUENCE,
            ConditionType: best.CONDITION_TYPE,
            Priority: best.PRIORITY
        });
    }

    return result;
}

module.exports = {
    resolvePricingParameters
};