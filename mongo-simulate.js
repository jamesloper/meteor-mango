const {LocalCollection} = require('meteor/minimongo');
const Test = new LocalCollection(null);

const simulateUpdate = (doc, query, modifier) => {
	// Check if the modifier contains a positional operator
	if (Object.keys(modifier).find(k => k.includes('$'))) {
		Test.insert(doc);
		Test.update(query, modifier);
		let res = Test.findOne(doc._id);
		Test.remove(doc._id);
		return res;
	}

	// Use the more efficient route if there is no positional operator
	let clonedDoc = EJSON.clone(doc);
	LocalCollection._modify(doc, modifier);
	return clonedDoc;
};

module.exports = {simulateUpdate};