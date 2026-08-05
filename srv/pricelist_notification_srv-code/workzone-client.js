const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");

const DESTINATION_NAME = "SAP_Notifications";
const NOTIFICATION_TYPE_KEY = "PRICELIST_UPDATE";
const NOTIFICATION_TYPE_VERSION = "1.0";
const ORIGIN_ID = "priceListSystem";

function buildWorkzonePayload({recipientEmail,title,message,navigationTargetObject,navigationTargetAction,navigationTargetParameters,notificationType,eventId}) {
    return {
        OriginId: ORIGIN_ID,
        NotificationTypeKey: NOTIFICATION_TYPE_KEY,
        NotificationTypeVersion: NOTIFICATION_TYPE_VERSION,
        Priority: "Medium",
        // NavigationTargetObject: navigationTargetObject,
        // NavigationTargetAction: navigationTargetAction,
        // NavigationTargetParams: navigationTargetParameters,
        Properties: [
            {
                Key: "title",
                Language: "en",
                Value: title
            },
            {
                Key: "message",
                Language: "en",
                Value: message
            },
            {
                Key: "notificationType",
                Language: "en",
                Value: notificationType
            },
            {
                Key: "eventId",
                Language: "en",
                Value: String(eventId)
            }
        ],
        Recipients: [
            {
                RecipientId: recipientEmail
            }
        ]
    };
}


async function sendNotification(notification) {
    const response = await executeHttpRequest(
        {
            destinationName: DESTINATION_NAME
        },
        {
            method: "POST",
            url: "/v2/Notification.svc/Notifications",
            data: buildWorkzonePayload(notification),
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        }
    );

    return {
        externalNotificationId: response.data?.ID || response.data?.Id || response.data?.NotificationId || ""
    };
}

module.exports = {
    sendNotification,
    buildWorkzonePayload
};