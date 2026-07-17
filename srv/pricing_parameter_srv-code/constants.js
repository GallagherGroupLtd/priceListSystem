/**
 * Note from developer:
 * Condition types permitted for discount pricing parameters.
 * Add any future permitted discount condition types to this list.
 */
const DISCOUNT_CONDITION_TYPE_WHITELIST = Object.freeze([
    "K031"
]);

module.exports = {
    DISCOUNT_CONDITION_TYPE_WHITELIST
};