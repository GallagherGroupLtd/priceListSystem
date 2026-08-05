const cds = require("@sap/cds");

const {
    INSERT,
    SELECT,
    UPDATE
} = cds.ql;

const {
    EVENT_SOURCE,
    NOTIFICATION_TYPE,
    TARGET_SECTION,
    DELIVERY_CHANNEL,
    DELIVERY_STATUS
} = require("./constants");

const {
    resolveInternalAdminRecipients,
    resolvePublishedRecipients
} = require("./recipient-resolver");

const {
    sendNotification
} = require("./workzone-client");

const buildVersionHistoryComparison = require(
    "../pricelist-display_srv-code/" +
    "version-history-comparison"
);

function normalize(value) {
    return value === null || value === undefined ? "" : String(value).trim();
}

function getChangedBy(req) {
    return (req.user?.id || req.user?.email || "unknown");
}

function getDeliveryError(error) {
    const responseData = error?.response?.data;

    if (responseData !== undefined) {
        return typeof responseData === "string" ? responseData : JSON.stringify(responseData);
    }

    return String(error?.message || error);
}

function buildNavigationTarget({pricelistId,targetSection}) {
    return {
        navigationTargetObject: "PriceMaintain",
        navigationTargetAction: "display",
        navigationTargetParameters: [
            `ID=${encodeURIComponent(String(pricelistId))}`,
            `section=${encodeURIComponent(targetSection)}`
        ].join("&")
    };
}

async function readPricelist(tx,PricelistData,pricelistId) {
    const pricelist = await tx.run(
        SELECT.one.from(PricelistData)
            .columns(
                "ID",
                "PricelistTitle",
                "PricelistGroupID",
                "Version",
                "Status",
                "PublishedDate",
                "PricelistType",
                "MarketScopeRegion",
                "MarketScopeCountry",
                "SalesOrg",
                "DistChannel"
            )
            .where({
                ID: pricelistId
            })
    );

    if (!pricelist) {
        throw new Error(`Pricelist ${pricelistId} ` + "was not found.");
    }

    return pricelist;
}

function createEventEntry({pricelist,eventBatchId,eventSource,notificationType,title,message,targetSection,changeCount,changedBy,publishedAt}) {
    return {
        ID: cds.utils.uuid(),
        Pricelist_ID: pricelist.ID,
        PricelistGroupID: pricelist.PricelistGroupID || pricelist.ID,
        PricelistVersion: pricelist.Version || "",
        PublishedAt: publishedAt || null,
        PricelistType: pricelist.PricelistType || "",
        MarketScopeRegion: pricelist.MarketScopeRegion || "",
        MarketScopeCountry: pricelist.MarketScopeCountry || "",
        SalesOrg: pricelist.SalesOrg || "",
        DistChannel: pricelist.DistChannel || "",

        EventSource: eventSource,
        NotificationType: notificationType,
        EventBatchID: eventBatchId,
        Title: title,
        Message: message,
        TargetSection: targetSection,
        ChangeCount: changeCount,
        EventCreatedBy: changedBy,
        EventCreatedAt: new Date()
    };
}

async function insertDeliveryRows({tx,PricelistNotificationDelivery,notificationEvent,recipients}) {
    if (!recipients.length) {
        return [];
    }

    const rows = recipients.map(
        (recipient) => ({
            ID: cds.utils.uuid(),
            NotificationEvent_ID: notificationEvent.ID,
            RecipientEmail: normalize(recipient.Email).toLowerCase(),
            RecipientAccountType: recipient.AccountType || "",
            RecipientAccountScope: recipient.AccountScope || "",
            DeliveryChannel: DELIVERY_CHANNEL.WORKZONE,
            DeliveryStatus: DELIVERY_STATUS.PENDING,
            DeliveryAttempts: 0,
            IsRead: false
        })
    );

    await tx.run(INSERT.into(PricelistNotificationDelivery).entries(rows));

    return rows;
}

async function createAdminSaveNotification({service,req,pricelistId,changeLogs}) {
    if (!Array.isArray(changeLogs) || changeLogs.length === 0) {
        return null;
    }

    const {
        PricelistData,
        PricelistNotificationEvent,
        PricelistNotificationDelivery
    } = service.entities;

    const tx = cds.tx(req);

    const pricelist = await readPricelist(tx,PricelistData,pricelistId);
    const changedBy = getChangedBy(req);

    const event = createEventEntry({
        pricelist,
        eventBatchId: cds.utils.uuid(),
        eventSource: EVENT_SOURCE.SAVE_EVENT,
        notificationType: NOTIFICATION_TYPE.SAVE_CHANGES,
        title: `${pricelist.PricelistTitle || "Pricelist"} ` + `Version ${pricelist.Version || ""} ` + "was changed",
        message: `${changeLogs.length} change(s) ` + `were saved by ${changedBy}.`,
        targetSection: TARGET_SECTION.CHANGES_SECTION,
        changeCount: changeLogs.length,
        changedBy
    });

    await tx.run(INSERT.into(PricelistNotificationEvent).entries(event));

    const recipients = await resolveInternalAdminRecipients(tx,pricelist);

    await insertDeliveryRows({tx,PricelistNotificationDelivery,notificationEvent: event,recipients});

    return event;
}

function buildPublishedEventDefinitions(comparison,pricelist) {
    if (!comparison.hasPreviousVersion) {
        return [
            {
                notificationType: NOTIFICATION_TYPE.NEW_PUBLISH,
                changeCount: 1,
                title: `${pricelist.PricelistTitle || "Pricelist"} ` + "published",
                message: `Version ${comparison.currentVersion || pricelist.Version || ""} ` + "has been published.",
                targetSection: TARGET_SECTION.CHANGES_SECTION
            }
        ];
    }

    const definitions = [];

    if (comparison.summary.updatesCount > 0) {
        definitions.push({
            notificationType: NOTIFICATION_TYPE.PRICELIST_UPDATE,
            changeCount: comparison.summary.updatesCount,
            title: `${pricelist.PricelistTitle || "Pricelist"} updated`,
            message: `${comparison.summary.updatesCount} ` + "Price List update(s) were published " + `in Version ${comparison.currentVersion}.`,
            targetSection: TARGET_SECTION.PRICELIST_UPDATES
        });
    }

    if (comparison.summary.upcomingPriceCount > 0) {
        definitions.push({
            notificationType: NOTIFICATION_TYPE.UPCOMING_PRICE,
            changeCount: comparison.summary.upcomingPriceCount,
            title: "Upcoming prices published for " + `${pricelist.PricelistTitle || "Pricelist"}`,
            message: `${comparison.summary.upcomingPriceCount} ` + "upcoming-price item(s) were published " + `in Version ${comparison.currentVersion}.`,
            targetSection: TARGET_SECTION.UPCOMING_PRICES
        });
    }

    if (comparison.summary.addedRemovedCount > 0) {
        definitions.push({
            notificationType: NOTIFICATION_TYPE.PRODUCT_CHANGE,
            changeCount: comparison.summary.addedRemovedCount,
            title: "Product changes published for " + `${pricelist.PricelistTitle || "Pricelist"}`,
            message: `${comparison.summary.addedRemovedCount} ` + "added or removed product item(s) " + `were published in Version ${comparison.currentVersion}.`,
            targetSection: TARGET_SECTION.PRODUCT_CHANGES
        });
    }

    if (comparison.summary.termsNotesCount > 0) {
        definitions.push({
            notificationType: NOTIFICATION_TYPE.TERMS_NOTES,
            changeCount: comparison.summary.termsNotesCount,
            title: "Terms or Notes updated for " + `${pricelist.PricelistTitle || "Pricelist"}`,
            message: `${comparison.summary.termsNotesCount} ` + "Terms and Conditions or Notes update(s) " + `were published in Version ${comparison.currentVersion}.`,
            targetSection: TARGET_SECTION.TERMS_NOTES
        });
    }

    return definitions;
}

async function createPublishedNotifications({service,req,pricelistId}) {
    const {
        PricelistData,
        PricelistNotificationEvent,
        PricelistNotificationDelivery
    } = service.entities;

    const tx = cds.tx(req);

    const pricelist = await readPricelist(tx,PricelistData,pricelistId);

    if (pricelist.Status !== "Published") {
        throw new Error("Published notifications can only be generated for a Published pricelist.");
    }

    const existingPublicationEvent = await tx.run(
        SELECT.one.from(PricelistNotificationEvent)
        .columns("ID")
        .where([
            {
                ref: ["Pricelist_ID"]
            },
            "=",
            {
                val: pricelistId
            },
            "and",
            {
                ref: ["PricelistVersion"]
            },
            "=",
            {
                val:
                    pricelist.Version || ""
            },
            "and",
            "(",
            {
                ref: ["EventSource"]
            },
            "=",
            {
                val: EVENT_SOURCE.PUBLISH_COMPARISON
            },
            "or",
            {
                ref: ["EventSource"]
            },
            "=",
            {
                val: EVENT_SOURCE.FIRST_PUBLISH
            },
            ")"
        ])
    );

    if (existingPublicationEvent) {
        return [];
    }

    const comparison = await buildVersionHistoryComparison(service,req,pricelistId);
    const definitions = buildPublishedEventDefinitions(comparison,pricelist);

    if (!definitions.length) {
        return [];
    }

    const recipients = await resolvePublishedRecipients(tx,pricelist);
    const eventBatchId = cds.utils.uuid();

    const events = [];

    for (const definition of definitions) {
        const event = createEventEntry({
            pricelist,
            eventBatchId,
            eventSource: comparison.hasPreviousVersion ? EVENT_SOURCE.PUBLISH_COMPARISON : EVENT_SOURCE.FIRST_PUBLISH,
            notificationType: definition.notificationType,
            title: definition.title,
            message: definition.message,
            targetSection: definition.targetSection,
            changeCount: definition.changeCount,
            changedBy: getChangedBy(req),
            publishedAt: pricelist.PublishedDate || new Date()
        });

        await tx.run(INSERT.into(PricelistNotificationEvent).entries(event));
        await insertDeliveryRows({tx,PricelistNotificationDelivery,notificationEvent: event,recipients});

        events.push(event);
    }

    return events;
}

async function deliverPendingNotifications({service,eventIds}) {
    if (!eventIds?.length) {
        return;
    }

    const {
        PricelistNotificationEvent,
        PricelistNotificationDelivery
    } = service.entities;

    const tx = cds.tx();

    try {
        const events = await tx.run(
            SELECT.from(PricelistNotificationEvent).where({
                ID: {
                    in: eventIds
                }
            })
        );

        const eventsById = new Map(events.map((event) => [String(event.ID),event]));

        const deliveries = await tx.run(
            SELECT.from(PricelistNotificationDelivery).where({
                NotificationEvent_ID: {
                    in: eventIds
                },
                DeliveryStatus: DELIVERY_STATUS.PENDING
            })
        );

        for (const delivery of deliveries) {
            const event = eventsById.get(String(delivery.NotificationEvent_ID));

            if (!event) {
                continue;
            }

            const attemptAt = new Date();

            try {
                const navigationTarget = buildNavigationTarget({
                    pricelistId: event.Pricelist_ID,
                    targetSection: event.TargetSection
                });
                const deliveryResult = await sendNotification({
                    recipientEmail: delivery.RecipientEmail,
                    title: event.Title,
                    message: event.Message,
                    navigationTargetObject: navigationTarget.navigationTargetObject,
                    navigationTargetAction: navigationTarget.navigationTargetAction,
                    navigationTargetParameters: navigationTarget.navigationTargetParameters,
                    notificationType: event.NotificationType,
                    eventId: event.ID
                });

                await tx.run(UPDATE(PricelistNotificationDelivery)
                    .set({
                        DeliveryStatus: DELIVERY_STATUS.SENT,
                        DeliveryAttempts: Number(delivery.DeliveryAttempts || 0) + 1,
                        LastDeliveryAttemptAt: attemptAt,
                        DeliveredAt: attemptAt,
                        ExternalNotificationID: deliveryResult.externalNotificationId || "",
                        DeliveryError: null
                    })
                    .where({
                        ID: delivery.ID
                    })
                );
            } catch (error) {
                await tx.run(UPDATE(PricelistNotificationDelivery)
                    .set({
                        DeliveryStatus: DELIVERY_STATUS.FAILED,
                        DeliveryAttempts: Number(delivery.DeliveryAttempts || 0) + 1,
                        LastDeliveryAttemptAt: attemptAt,
                        DeliveryError: getDeliveryError(error)
                    })
                    .where({
                        ID: delivery.ID
                    })
                );

                console.error("[PricelistNotification] Delivery failed:",{
                    deliveryId: delivery.ID,
                    status: error?.response?.status,
                    responseData: error?.response?.data,
                    message: error?.message
                });
            }
        }

        await tx.commit();
    } catch (error) {
        await tx.rollback();
        throw error;
    }
}

module.exports = {
    createAdminSaveNotification,
    createPublishedNotifications,
    deliverPendingNotifications,
    buildPublishedEventDefinitions,
    buildNavigationTarget
};