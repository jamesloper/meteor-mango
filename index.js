const {Mongo} = require('meteor/mongo');
const {keys} = require('underscore');
const {EJSON} = require('meteor/ejson');
const {LocalCollection} = require('meteor/minimongo');
const EventEmitter = require('events');
const {requireUpdate} = require('./mongo-validate');
const traverse = require('./mongo-traverse');

class Mango {
	constructor(collectionName, {toEmbedded, triggerFields, comparisonFn}) {
		this.collection = new Mongo.Collection(collectionName);
		this.findOne = this.collection.findOne;
		this.find = this.collection.find;
		this._emitter = new EventEmitter();
		this.onBeforeUpdate = (fn) => this._emitter.addListener('beforeUpdate', fn);
		this.onAfterUpdate = (fn) => this._emitter.addListener('afterUpdate', fn);
		this.onBeforeInsert = (fn) => this._emitter.addListener('beforeInsert', fn);
		this.onAfterInsert = (fn) => this._emitter.addListener('afterInsert', fn);
		this.onBeforeRemove = (fn) => this._emitter.addListener('beforeRemove', fn);
		this.onAfterRemove = (fn) => this._emitter.addListener('afterRemove', fn);
		this.toEmbedded = toEmbedded;
		this.triggerFields = triggerFields || [];
	}

	simulateUpdate(doc, update) {
		let clonedDoc = EJSON.clone(doc);
		LocalCollection._modify(doc, update);
		return clonedDoc;
	}

	update(query, update = {}, params = {}) {
		requireUpdate(update);

		const docs = this.collection.find(query, {limit: params.multi ? null : 1}).map(oldDoc => {
			let newDoc = this.simulateUpdate(oldDoc, update);
			return {oldDoc, newDoc, update};
		});

		if (docs.length === 0 && params.upsert) { // handle an upsert
			this.insert(this.simulateUpdate(query, update));
			return 1;
		}

		docs.forEach(r => this._emitter.emit('beforeUpdate', r));
		let count = this.collection.update(query, update, params);
		docs.forEach(r => {
			this._emitter.emit('afterUpdate', r);

			// Trigger relational update if any of the trigger fields's value has changed
			let triggersRelationalUpdate = this.triggerFields.find(field => {
				let oldValue = traverse(r.oldDoc, field);
				let newValue = traverse(r.newDoc, field);
				return EJSON.equals(oldValue, newValue);
			});
			if (triggersRelationalUpdate) {
				let embedded = this.toEmbedded(r.newDoc);
				this._emitter.emit('onChange', r.newDoc._id, embedded);
			}
		});
		return count;
	}

	insert(doc) {
		if (!doc._id) doc._id = this.collection._makeNewID();

		this._emitter.emit('onBeforeInsert', doc);
		const id = this.collection.insert(doc);
		this._emitter.emit('onAfterInsert', doc);

		let res = {id, doc};
		if (this.toEmbedded) res.embedded = this.toEmbedded(doc);

		return res;
	}

	remove(query) {
		const docIds = this.collection.find(query, {fields: {_id: 1}}).map(r => r._id);
		docIds.forEach(id => this._emitter.emit('onBeforeRemove', id));
		const count = this.collection.remove(query);
		docIds.forEach(id => this._emitter.emit('onAfterRemove', id));
		return count;
	}

	autorun({onChange, onRemove}) {
		if (!this.toEmbedded) throw new Meteor.Error(500, 'Attempted to attach autorun on a Mango that has no #toEmbedded function');
		if (!this.triggerFields.length) throw new Meteor.Error(500, 'Attempted to attach autorun on a Mango that has no trigger fields');

		this._emitter.addListener('onChange', onChange);
		this.onAfterRemove(onRemove);
	}
}

module.exports = Mango;