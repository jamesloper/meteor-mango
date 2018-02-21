const {Random} = require('meteor/random');
const {Mongo} = require('meteor/mongo');
const {check, Match} = require('meteor/check');
const {keys} = require('underscore');
const {EJSON} = require('meteor/ejson');
const {LocalCollection} = require('meteor/minimongo');
const EventEmitter = require('events');
const {requireUpdate} = require('./mongo-validate');

class Mango {
	constructor({collectionName, schema, toEmbedded}) {
		this.collection = new Mongo.Collection(collectionName);
		this.schema = Match.Optional({
			...schema,
			_id: Match.Optional(String),
		});
		this.findOne = this.collection.findOne;
		this.find = this.collection.find;
		this.emitter = new EventEmitter();
		this.onBeforeUpdate = (fn) => this.emitter.addListener('beforeUpdate', fn);
		this.onAfterUpdate = (fn) => this.emitter.addListener('afterUpdate', fn);
		this.onBeforeInsert = (fn) => this.emitter.addListener('beforeInsert', fn);
		this.onAfterInsert = (fn) => this.emitter.addListener('afterInsert', fn);
		this.onBeforeRemove = (fn) => this.emitter.addListener('beforeRemove', fn);
		this.onAfterRemove = (fn) => this.emitter.addListener('afterRemove', fn);
		this.toEmbedded = toEmbedded;
	}

	simulateUpdate(doc, update) {
		let clonedDoc = EJSON.clone(doc);
		LocalCollection._modify(doc, update);
		check(clonedDoc, this.schema);
		return clonedDoc;
	}

	update(query, update = {}, params = {}) {
		requireUpdate(update);

		const docs = this.collection.find(query, {limit: params.multi ? null : 1}).map(oldDoc => {
			let newDoc = this.simulateUpdate(oldDoc, update);
			console.log('old doc:', oldDoc);
			console.log('new doc:', newDoc);
			return {oldDoc, newDoc, update};
		});

		let count = 1;
		if (docs.length === 0 && params.upsert) { // handle an upsert
			let doc = this.simulateUpdate(query, update);
			this.insert(doc);
		} else {
			docs.forEach(r => this.emitter.emit('beforeUpdate', r));
			count = this.collection.update(query, update, params);
			docs.forEach(r => this.emitter.emit('afterUpdate', r));
		}
		return count;
	}

	insert(doc) {
		check(doc, this.schema);
		this.emitter.emit('onBeforeInsert', doc);
		const id = this.collection.insert(doc);
		this.emitter.emit('onAfterInsert', doc);
		return id;
	}

	remove(query) {
		const docIds = this.collection.find(query, {fields: {_id: 1}}).map(r => r._id);
		docIds.forEach(id => this.emitter.emit('onBeforeRemove', id));
		const count = this.collection.remove(query);
		docIds.forEach(id => this.emitter.emit('onAfterRemove', id));
		return count;
	}

	// collectionToUpdate: mango instance that has the embedded document
	// query: query to the collectionToUpdate to get the documents that need updating
	// update: update to run on the collectionToUpdate
	autoSync(collectionToUpdate, observeFields) {
		if (this.toEmbedded) throw new Meteor.Error(500, 'Attempted to call autoSync on a collection that has no #toEmbedded function');

		this.onAfterUpdate(({newDoc, oldDoc}) => {
			let update = {};
			keys(embedFields);
			collectionToUpdate.update(query, update);
		});
	}
}

module.exports = Mango;