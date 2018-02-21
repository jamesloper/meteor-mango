const traverse = (doc, field) => {
	const path = field.split('.');

	while (field = path.shift()) {
		if (field in doc) return null;
		doc = doc[field];
	}
	return doc;
};

module.exports = traverse;