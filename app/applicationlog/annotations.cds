using PriceListService as service from '../../srv/service';

// -----------------------------------------------------------------------------
// Application Log - User Engagement
// -----------------------------------------------------------------------------

annotate service.ApplicationLog with @(
    UI.HeaderInfo : {
        TypeName       : 'User Engagement Log',
        TypeNamePlural : 'User Engagement Logs',
        Title          : {
            $Type : 'UI.DataField',
            Value : EmailAddress
        }
    },

    UI.SelectionFields : [
        FirstName,
        LastName,
        EmailAddress,
        AccountType,
        AccountScope,
        LoggedInDate,
        AccessedTile,
        AccessedPricelist,
        AccessedDate,
        PricelistDownloadDate
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : FirstName,
            Label : 'User First Name'
        },
        {
            $Type : 'UI.DataField',
            Value : LastName,
            Label : 'User Last Name'
        },
        {
            $Type : 'UI.DataField',
            Value : EmailAddress,
            Label : 'User Email'
        },
        {
            $Type : 'UI.DataField',
            Value : AccountType,
            Label : 'User Account Type'
        },
        {
            $Type : 'UI.DataField',
            Value : AccountScope,
            Label : 'User Account Scope'
        },
        {
            $Type : 'UI.DataField',
            Value : LoggedInDate,
            Label : 'Log In Date'
        },
        {
            $Type : 'UI.DataField',
            Value : LoggedInTime,
            Label : 'Log In Time'
        },
        {
            $Type : 'UI.DataField',
            Value : AccessedTile,
            Label : 'Accessed Tile'
        },
        {
            $Type : 'UI.DataField',
            Value : AccessedPricelist,
            Label : 'Accessed Pricelist'
        },
        {
            $Type : 'UI.DataField',
            Value : AccessedDate,
            Label : 'Accessed Date'
        },
        {
            $Type : 'UI.DataField',
            Value : AccessedTime,
            Label : 'Accessed Time'
        },
        {
            $Type : 'UI.DataField',
            Value : PricelistDownloadDate,
            Label : 'Download Date'
        },
        {
            $Type : 'UI.DataField',
            Value : PricelistDownloadTime,
            Label : 'Download Time'
        }
    ]
);

annotate service.ApplicationLog with @(
    Capabilities.InsertRestrictions : {
        Insertable : false
    },
    Capabilities.UpdateRestrictions : {
        Updatable : false
    },
    Capabilities.DeleteRestrictions : {
        Deletable : false
    }
);

// -----------------------------------------------------------------------------
// Application Log - Application Changes
// -----------------------------------------------------------------------------

annotate service.ApplicationChangeLog with @(
    UI.HeaderInfo : {
        TypeName       : 'Application Change',
        TypeNamePlural : 'Application Changes',
        Title          : {
            $Type : 'UI.DataField',
            Value : objectDescription
        }
    },

    UI.PresentationVariant : {
        SortOrder : [
            {
                Property   : changedAt,
                Descending : true
            }
        ]
    },

    UI.SelectionFields : [
        changedAt,
        changedBy,
        application,
        functionalArea,
        objectType,
        changeType,
        fieldLabel
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : changedAt,
            Label : 'Changed At'
        },
        {
            $Type : 'UI.DataField',
            Value : changedBy,
            Label : 'Changed By'
        },
        {
            $Type : 'UI.DataField',
            Value : application,
            Label : 'Application'
        },
        {
            $Type : 'UI.DataField',
            Value : functionalArea,
            Label : 'Functional Area'
        },
        {
            $Type : 'UI.DataField',
            Value : objectType,
            Label : 'Object Type'
        },
        {
            $Type : 'UI.DataField',
            Value : objectDescription,
            Label : 'Object'
        },
        {
            $Type : 'UI.DataField',
            Value : changeType,
            Label : 'Change Type'
        },
        {
            $Type : 'UI.DataField',
            Value : fieldLabel,
            Label : 'Field'
        },
        {
            $Type : 'UI.DataField',
            Value : oldValue,
            Label : 'Old Value'
        },
        {
            $Type : 'UI.DataField',
            Value : newValue,
            Label : 'New Value'
        }
    ]
);

annotate service.ApplicationChangeLog with @(
    Capabilities.InsertRestrictions : {
        Insertable : false
    },
    Capabilities.UpdateRestrictions : {
        Updatable : false
    },
    Capabilities.DeleteRestrictions : {
        Deletable : false
    }
);

annotate service.ApplicationLog with @(
    UI.FieldGroup #General : {
        Data : [
            { $Type : 'UI.DataField', Value : FirstName, Label : 'User First Name' },
            { $Type : 'UI.DataField', Value : LastName, Label : 'User Last Name' },
            { $Type : 'UI.DataField', Value : EmailAddress, Label : 'User Email' },
            { $Type : 'UI.DataField', Value : AccountType, Label : 'User Account Type' },
            { $Type : 'UI.DataField', Value : AccountScope, Label : 'User Account Scope' },
            { $Type : 'UI.DataField', Value : LoggedInDate, Label : 'Log In Date' },
            { $Type : 'UI.DataField', Value : LoggedInTime, Label : 'Log In Time' },
            { $Type : 'UI.DataField', Value : AccessedTile, Label : 'Accessed Tile' },
            { $Type : 'UI.DataField', Value : AccessedPricelist, Label : 'Accessed Pricelist' },
            { $Type : 'UI.DataField', Value : AccessedDate, Label : 'Accessed Date' },
            { $Type : 'UI.DataField', Value : AccessedTime, Label : 'Accessed Time' },
            { $Type : 'UI.DataField', Value : PricelistDownloadDate, Label : 'Download Date' },
            { $Type : 'UI.DataField', Value : PricelistDownloadTime, Label : 'Download Time' }
        ]
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'User Engagement Details',
            Target : '@UI.FieldGroup#General'
        }
    ]
);

annotate service.ApplicationChangeLog with @(
    UI.FieldGroup #General : {
        Data : [
            { $Type : 'UI.DataField', Value : changedAt, Label : 'Changed At' },
            { $Type : 'UI.DataField', Value : changedBy, Label : 'Changed By' },
            { $Type : 'UI.DataField', Value : application, Label : 'Application' },
            { $Type : 'UI.DataField', Value : functionalArea, Label : 'Functional Area' },
            { $Type : 'UI.DataField', Value : objectType, Label : 'Object Type' },
            { $Type : 'UI.DataField', Value : objectDescription, Label : 'Object' },
            { $Type : 'UI.DataField', Value : changeType, Label : 'Change Type' },
            { $Type : 'UI.DataField', Value : fieldLabel, Label : 'Field' }
        ]
    },

    UI.FieldGroup #Values : {
        Data : [
            { $Type : 'UI.DataField', Value : oldValueDisplay, Label : 'Old Value' },
            { $Type : 'UI.DataField', Value : newValueDisplay, Label : 'New Value' }
        ]
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Change Details',
            Target : '@UI.FieldGroup#General'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Before / After',
            Target : '@UI.FieldGroup#Values'
        }
    ]
);

annotate service.ApplicationChangeLog with {
    oldValueDisplay @UI.MultiLineText;
    newValueDisplay @UI.MultiLineText;
};

// -----------------------------------------------------------------------------
// Application Log - Pricelist Changes
// -----------------------------------------------------------------------------

annotate service.PricelistNotificationEvent with @(
    UI.HeaderInfo : {
        TypeName       : 'Pricelist Change',
        TypeNamePlural : 'Pricelist Changes',
        Title          : {
            $Type : 'UI.DataField',
            Value : Title
        },
        Description    : {
            $Type : 'UI.DataField',
            Value : PricelistVersion
        }
    },

    UI.PresentationVariant : {
        SortOrder : [
            {
                Property   : EventCreatedAt,
                Descending : true
            }
        ]
    },

    UI.SelectionFields : [
        EventCreatedAt,
        EventCreatedBy,
        EventSource,
        NotificationType,
        PricelistVersion,
        PricelistType,
        MarketScopeRegion,
        MarketScopeCountry,
        PublishedAt
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : EventCreatedAt,
            Label : 'Event Date'
        },
        {
            $Type : 'UI.DataField',
            Value : EventCreatedBy,
            Label : 'Changed By'
        },
        {
            $Type : 'UI.DataField',
            Value : Title,
            Label : 'Pricelist Change'
        },
        {
            $Type : 'UI.DataField',
            Value : PricelistVersion,
            Label : 'Version'
        },
        {
            $Type : 'UI.DataField',
            Value : EventSource,
            Label : 'Event Source'
        },
        {
            $Type : 'UI.DataField',
            Value : NotificationType,
            Label : 'Change Category'
        },
        {
            $Type : 'UI.DataField',
            Value : ChangeCount,
            Label : 'Changes'
        },
        {
            $Type : 'UI.DataField',
            Value : PricelistType,
            Label : 'Pricelist Type'
        },
        {
            $Type : 'UI.DataField',
            Value : MarketScopeRegion,
            Label : 'Region'
        },
        {
            $Type : 'UI.DataField',
            Value : MarketScopeCountry,
            Label : 'Country'
        },
        {
            $Type : 'UI.DataField',
            Value : PublishedAt,
            Label : 'Published At'
        }
    ]
);

annotate service.PricelistNotificationEvent with @(
    Capabilities.InsertRestrictions : {
        Insertable : false
    },
    Capabilities.UpdateRestrictions : {
        Updatable : false
    },
    Capabilities.DeleteRestrictions : {
        Deletable : false
    }
);

annotate service.PricelistNotificationEvent with @(
    UI.FieldGroup #EventInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : EventCreatedAt,
                Label : 'Event Created At'
            },
            {
                $Type : 'UI.DataField',
                Value : EventCreatedBy,
                Label : 'Changed By'
            },
            {
                $Type : 'UI.DataField',
                Value : EventSource,
                Label : 'Event Source'
            },
            {
                $Type : 'UI.DataField',
                Value : NotificationType,
                Label : 'Change Category'
            },
            {
                $Type : 'UI.DataField',
                Value : ChangeCount,
                Label : 'Change Count'
            },
            {
                $Type : 'UI.DataField',
                Value : Message,
                Label : 'Description'
            }
        ]
    },

    UI.FieldGroup #PricelistInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : PricelistVersion,
                Label : 'Version'
            },
            {
                $Type : 'UI.DataField',
                Value : PricelistType,
                Label : 'Pricelist Type'
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeRegion,
                Label : 'Region'
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeCountry,
                Label : 'Country'
            },
            {
                $Type : 'UI.DataField',
                Value : SalesOrg,
                Label : 'Sales Organization'
            },
            {
                $Type : 'UI.DataField',
                Value : DistChannel,
                Label : 'Distribution Channel'
            },
            {
                $Type : 'UI.DataField',
                Value : PublishedAt,
                Label : 'Published At'
            }
        ]
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Change Event',
            Target : '@UI.FieldGroup#EventInfo'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Pricelist',
            Target : '@UI.FieldGroup#PricelistInfo'
        }
    ]
);

annotate service.PricelistNotificationEvent with {
    Message @UI.MultiLineText;
};