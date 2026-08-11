const cds = require("@sap/cds");

const { SELECT, INSERT } = cds.ql;

const APPLICATION_LOG_ENTITY = "com.sap.pricelistsystem.ApplicationLog";

const ACCOUNT_ASSIGNMENT_ENTITY = "com.sap.pricelistsystem.AccountAssignment";

const EVENT_TYPES = {
    LOGIN: "LOGIN",
    TILE_ACCESS: "TILE_ACCESS",
    PRICELIST_ACCESS: "PRICELIST_ACCESS",
    PRICELIST_DOWNLOAD: "PRICELIST_DOWNLOAD"
};

function getDateTimeParts(date = new Date()) {
    const iso = date.toISOString();

    return {
        date: iso.substring(0, 10),
        time: iso.substring(11, 19)
    };
}

async function getUserAccount(req) {
    const email = req.user?.id || req.user?.email || "";

    if (!email) {
        return null;
    }

    const tx = cds.tx(req);

    return tx.run(SELECT.one.from(ACCOUNT_ASSIGNMENT_ENTITY).where({ Email: email }));
}

async function logUserEngagement({
    req,
    eventType,
    accessedTile = "",
    accessedPricelist = ""
}) {
    if (!Object.values(EVENT_TYPES).includes(eventType)) {
        throw new Error(`Unsupported user engagement event type: ${eventType}`);
    }

    const account = await getUserAccount(req);

    if (!account) {
        console.warn("[ApplicationLog] Account Assignment not found for user:",req.user?.id || req.user?.email);

        return false;
    }

    const now = new Date();
    const timestamp = getDateTimeParts(now);

    const entry = {
        ID: cds.utils.uuid(),
        FirstName: account.FirstName || "",
        LastName: account.LastName || "",
        EmailAddress: account.Email || req.user?.id || req.user?.email || "",
        AccountType: account.AccountType || "",
        AccountScope: account.AccountScope || "",
        LoggedInDate: null,
        LoggedInTime: null,
        AccessedTile: "",
        AccessedPricelist: "",
        AccessedDate: null,
        AccessedTime: null,
        PricelistDownloadDate: null,
        PricelistDownloadTime: null
    };

    switch (eventType) {
        case EVENT_TYPES.LOGIN:
            entry.LoggedInDate = timestamp.date;
            entry.LoggedInTime = timestamp.time;
            break;

        case EVENT_TYPES.TILE_ACCESS:
            entry.AccessedTile = accessedTile || "";
            entry.AccessedDate = timestamp.date;
            entry.AccessedTime = timestamp.time;
            break;

        case EVENT_TYPES.PRICELIST_ACCESS:
            entry.AccessedTile = accessedTile || "Pricelist";
            entry.AccessedPricelist = accessedPricelist || "";
            entry.AccessedDate = timestamp.date;
            entry.AccessedTime = timestamp.time;
            break;

        case EVENT_TYPES.PRICELIST_DOWNLOAD:
            entry.AccessedTile = accessedTile || "Pricelist";
            entry.AccessedPricelist = accessedPricelist || "";
            entry.PricelistDownloadDate = timestamp.date;
            entry.PricelistDownloadTime = timestamp.time;
            break;
    }

    const tx = cds.tx(req);

    await tx.run(INSERT.into(APPLICATION_LOG_ENTITY).entries(entry));

    return true;
}

module.exports = {
    EVENT_TYPES,
    logUserEngagement
};