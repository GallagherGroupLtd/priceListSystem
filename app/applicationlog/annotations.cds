using PriceListService as service from '../../srv/service';
annotate service.ApplicationLog with @(
    // Selection Fields for Filtering
    UI.SelectionFields: [ FirstName,LastName,EmailAddress,AccountType,AccountScope ],

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : FirstName,
            },
            {
                $Type : 'UI.DataField',
                Value : LastName,
            },
            {
                $Type : 'UI.DataField',
                Value : EmailAddress,
            },
            {
                $Type : 'UI.DataField',
                Value : AccountType,
            },
            {
                $Type : 'UI.DataField',
                Value : AccountScope,
            },
            {
                $Type : 'UI.DataField',
                Value : LoggedInDate,
            },
            {
                $Type : 'UI.DataField',
                Value : LoggedInTime,
            },
            {
                $Type : 'UI.DataField',
                Value : LoggedOffDate,
            },
            {
                $Type : 'UI.DataField',
                Value : LoggedOffTime,
            },
            {
                $Type : 'UI.DataField',
                Value : AccessedTile,
            },
            {
                $Type : 'UI.DataField',
                Value : AccessedPricelist,
            },
            {
                $Type : 'UI.DataField',
                Value : PricelistDownloadDate,
            },
            {
                $Type : 'UI.DataField',
                Value : PricelistDownloadTime,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : FirstName,
        },
        {
            $Type : 'UI.DataField',
            Value : LastName,
        },
        {
            $Type : 'UI.DataField',
            Value : EmailAddress,
        },
        {
            $Type : 'UI.DataField',
            Value : LoggedInDate,
        },
        {
            $Type : 'UI.DataField',
            Value : LoggedInTime,
        },
    ],
);

annotate PriceListService.ApplicationLog with @(
    Capabilities.DeleteRestrictions : {
        Deletable : false
    }
);