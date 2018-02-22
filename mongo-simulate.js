const {LocalCollection} = require('meteor/minimongo');
const Test = new LocalCollection(null);

const simulateUpdate = (doc, query, modifier) => {
	Test.insert(doc);
	Test.update(query, modifier);
	let res = Test.findOne(doc._id);
	Test.remove(doc._id);
	return res;
};

const simpleSimulateUpdate = (doc, query, modifier) => {
	let clonedDoc = EJSON.clone(doc);
	LocalCollection._modify(doc, modifier);
	return clonedDoc;
};

module.exports = {simulateUpdate, simpleSimulateUpdate};