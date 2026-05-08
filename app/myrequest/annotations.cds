using PriceListService as service from '../../srv/service';

annotate service.MyRequest with @(

    UI.HeaderInfo : {
        TypeName       : 'My Request',
        TypeNamePlural : 'My Requests',
        Title : {
            Value : ReqSubject
        }
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : ReqSubject,
            Label : 'Subject'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqStatus,
            Label : 'Status'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqDate,
            Label : 'Date'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqTime,
            Label : 'Time'
        }
    ],

    UI.FieldGroup #RequestInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ReqAccountName,
                Label : 'Account Name'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqDate,
                Label : 'Date'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqTime,
                Label : 'Time'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqStatus,
                Label : 'Status'
            }
        ]
    },

    UI.FieldGroup #SubjectGroup : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ReqSubject,
                Label : 'Subject'
            }
        ]
    },

    UI.FieldGroup #DetailsGroup : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : RequestDetails,
                Label : 'Request Details'
            }
        ]
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Request Information',
            Target : '@UI.FieldGroup#RequestInfo'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Subject',
            Target : '@UI.FieldGroup#SubjectGroup'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Request Details',
            Target : '@UI.FieldGroup#DetailsGroup'
        }
    ]
);

annotate service.MyRequest with {

    AccountName @Common.FieldControl : #ReadOnly;
    ReqDate        @Common.FieldControl : #ReadOnly;
    ReqTime        @Common.FieldControl : #ReadOnly;
    ReqStatus      @Common.FieldControl : #ReadOnly;

    ReqSubject     @Common.FieldControl : #Mandatory;

    RequestDetails @(
        UI.MultiLineText,
        Common.FieldControl : #Mandatory
    );

};