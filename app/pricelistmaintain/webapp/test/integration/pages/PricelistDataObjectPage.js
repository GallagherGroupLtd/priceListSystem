sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'pricelistapp.pricelistmaintain',
            componentId: 'PricelistDataObjectPage',
            contextPath: '/PricelistData'
        },
        CustomPageDefinitions
    );
});