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
            Label : 'Progress'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqPriority,
            Label : 'Priority'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqDate,
            Label : 'Start Date'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqTime,
            Label : 'Time'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqDueDate,
            Label : 'Due Date'
        }
    ],

    UI.FieldGroup #RequestInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : AccountName,
                Label : 'Bucket'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqStatus,
                Label : 'Progress'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqPriority,
                Label : 'Priority'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqDate,
                Label : 'Start Date'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqTime,
                Label : 'Time'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqDueDate,
                Label : 'Due Date'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqRepeat,
                Label : 'Repeat'
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
                Label : 'Notes'
            }
        ]
    },

    UI.FieldGroup #ChecklistGroup : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ReqInfoProvided,
                Label : 'Requestor to Provide Info - Part #s, Pricing, Regions, Section on PL, eCommerce?'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqCatalogUpdated,
                Label : 'PPR Team Adds Part/s to Relevant Catalogs'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqMasterPLUpdated,
                Label : 'PPR Team Updates Master PL'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqSecCommerceChecked,
                Label : 'Check or Request Tech Admin to add Sec Commerce Flag'
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
            Label  : 'Notes',
            Target : '@UI.FieldGroup#DetailsGroup'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Checklist',
            Target : '@UI.FieldGroup#ChecklistGroup'
        }
    ]
);

annotate service.MyRequest with {

    AccountName @Common.FieldControl : #ReadOnly;
    ReqDate     @Common.FieldControl : #ReadOnly;
    ReqTime     @Common.FieldControl : #ReadOnly;
    ReqStatus   @Common.FieldControl : #ReadOnly;

    ReqSubject @Common.FieldControl : #Mandatory;

    RequestDetails @(
        UI.MultiLineText,
        Common.FieldControl : #Mandatory
    );

    ReqPriority @(
    Common.ValueListWithFixedValues : true,
    Common.ValueList : {
        CollectionPath : 'MyRequestPriorityVH',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : ReqPriority,
                ValueListProperty : 'Priority'
            }
            ]
        }
    );

    ReqRepeat @(
    Common.ValueListWithFixedValues : true,
    Common.ValueList : {
        CollectionPath : 'MyRequestRepeatVH',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : ReqRepeat,
                ValueListProperty : 'Repeat'
            }
            ]
        }
    );

};
