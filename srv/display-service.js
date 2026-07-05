const authorization = require('./pricelist-display_srv-code/authorization');

module.exports = cds.service.impl(async function () {
    this.on('READ', 'PricelistData', async (req) => {
        return authorization.filterPricelistData(req);
    });
});