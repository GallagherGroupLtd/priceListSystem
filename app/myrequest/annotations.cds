using PriceListService as service from '../../srv/service';

annotate service.MyRequest with @(

    // Selection Fields for Filtering
    UI.SelectionFields: [ PricelistType,MarketScopeRegion,MarketScopeCountry,ReqStatus,ReqStartDate ],

    UI.HeaderInfo : {
        TypeName       : 'My Request',
        TypeNamePlural : 'My Requests',
    },

    // Header Section at the top
    UI.HeaderInfo                 : {
        ImageUrl      : 'sap-icon://sales-order-item'
    },    
    UI.HeaderFacets               : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'DatesFacet',
            Target: '@UI.FieldGroup#CreateGroup'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'UsersFacet',
            Target: '@UI.FieldGroup#UpdateGroup'
        }
    ],
    UI.FieldGroup #CreateGroup     : {
        Data: [
            {
                Value: createdAt,
                Label: 'Created On'
            },
            {
                Value: createdBy,
                Label: 'Created BY'
            }
        ]
    },
    UI.FieldGroup #UpdateGroup     : {
        Data: [
            {
                Value: modifiedAt,
                Label: 'Updated On'
            },
            {
                Value: modifiedBy,
                Label: 'Updated By'
            }
        ]
    },

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : PricelistType,
            Label : 'Pricelist Type'
        },
        {
            $Type : 'UI.DataField',
            Value : MarketScopeRegion,
            Label : 'Market Region'
        },
        {
            $Type : 'UI.DataField',
            Value : MarketScopeCountry,
            Label : 'Market Country'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqStatus,
            Label : 'Status'
        },
        {
            $Type : 'UI.DataField',
            Value : ReqSubject,
            Label : 'Subject'
        }
    ],

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
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Action Items',
            Target : '@UI.FieldGroup#ActionsGroup'
        }
    ],

    UI.FieldGroup #RequestInfo : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ReqStatus,
                Label : 'Request Status'
            },
            {
                $Type : 'UI.DataField',
                Value : PricelistType,
                Label : 'Pricelist Type'
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeRegion,
                Label : 'Market Region'
            },
            {
                $Type : 'UI.DataField',
                Value : MarketScopeCountry,
                Label : 'Market Country'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqStartDate,
                Label : 'Start Date'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqDueDate,
                Label : 'Due Date'
            },
            {
                $Type : 'UI.DataField',
                Value : ReqStatus,
                Label : 'Request Status'
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

    UI.FieldGroup #ActionsGroup : {
        Data : [
            {
                $Type : 'UI.DataField',
                Value : ReqInfoProvided,
                Label : 'Requestor to Provide Information'
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
                Label : 'Check or Request Tech Admin to add Sec Commerce Flag (Scale Price as Required)'
            }
        ]
    }, 

    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            {
                Property   : ReqStartDate,
                AllowedExpressions : 'SingleRange'
            }
        ]
    }   
);

annotate service.MyRequest with {
    PricelistType @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PricelistTypeVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'PricelistType', ValueListProperty: 'PricelistType' }
            ]
        }
    );

    MarketScopeRegion @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MarketRegionVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeRegion', ValueListProperty: 'MarketScopeRegion' }
            ]
        }
    );

    MarketScopeCountry @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'MarketCountryVH',
            Parameters: [
                { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: 'MarketScopeCountry', ValueListProperty: 'MarketScopeCountry' }
            ]
        }
    );

    ReqStatus @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList: {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'RequestStatusVH',
            Parameters: [
                { 
                    $Type: 'Common.ValueListParameterInOut', 
                    LocalDataProperty: ReqStatus, 
                    ValueListProperty: 'Code' }
            ]
        }
    );

    RequestDetails @(
        UI.MultiLineText,
        Common.FieldControl : #Mandatory
    );

};