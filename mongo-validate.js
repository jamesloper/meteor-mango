const {keys, isEmpty} = require('underscore');

const requireUpdate = (update) => {
	if (isEmpty(update)) throw new Meteor.Error(500, 'Invlid update modifier');
	let badKey = keys(update).find(r => r[0] !== '$');
	if (badKey) throw new Meteor.Error(500, `Invalid key [${badKey}] in update, must be an operator like $set`);
};

module.exports = {requireUpdate};