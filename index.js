const {Mongo} = require('meteor/mongo');
const {EJSON} = require('meteor/ejson');
const EventEmitter = require('events');
const {requireUpdate} = require('./mongo-validate');
const {simulateUpdate} = require('./mongo-simulate');


class Mango {
	constructor(collectionName, {toEmbedded}) {
		this.collection = new Mongo.Collection(collectionName);
		this._ensureIndex = this.collection._ensureIndex.bind(this.collection);
		this.findOne = this.collection.findOne.bind(this.collection);
		this.find = this.collection.find.bind(this.collection);
		this._emitter = new EventEmitter();
		this.onBeforeUpdate = (fn) => this._emitter.addListener('beforeUpdate', fn);
		this.onAfterUpdate = (fn) => this._emitter.addListener('afterUpdate', fn);
		this.onBeforeInsert = (fn) => this._emitter.addListener('beforeInsert', fn);
		this.onAfterInsert = (fn) => this._emitter.addListener('afterInsert', fn);
		this.onBeforeRemove = (fn) => this._emitter.addListener('beforeRemove', fn);
		this.onAfterRemove = (fn) => this._emitter.addListener('afterRemove', fn);
		this.toEmbedded = toEmbedded;
	}

	update(query, modifier = {}, params = {}) {
		if (typeof query === 'string') query = {_id: query};
		requireUpdate(modifier);

		const docs = this.collection.find(query, {limit: params.multi ? null : 1}).map(oldDoc => {
			let newDoc = simulateUpdate(oldDoc, query, modifier);
			let res = {oldDoc, newDoc, modifier};
			if (this.toEmbedded) Object.assign(res, {
				oldEmbeddedDoc: this.toEmbedded(oldDoc),
				newEmbeddedDoc: this.toEmbedded(newDoc),
			});
			return res;
		});

		if (docs.length === 0 && params.upsert) { // handle an upsert
			this.insert(simulateUpdate(query, query, modifier));
			return 1;
		}

		docs.forEach(r => this._emitter.emit('beforeUpdate', r));
		let count = this.collection.update(query, modifier, params);
		docs.forEach(r => {
			this._emitter.emit('afterUpdate', r);

			// Trigger relational update if any of the trigger fields's value has changed
			if (this.toEmbededd && !EJSON.equals(r.oldEmbeddedDoc, r.newEmbeddedDoc)) {
				this._emitter.emit('embeddedChange', r.newDoc._id, r.newEmbeddedDoc);
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
		if (this.toEmbedded) res.embeddedDoc = this.toEmbedded(doc);

		return res;
	}

	remove(query) {
		const docIds = this.collection.find(query, {fields: {_id: 1}}).map(r => r._id);
		docIds.forEach(id => this._emitter.emit('onBeforeRemove', id));
		const count = this.collection.remove(query);
		docIds.forEach(id => this._emitter.emit('onAfterRemove', id));
		return count;
	}

	onEmbeddedChange(fn) {
		if (!this.toEmbedded) throw new Meteor.Error(500, 'Attempted to attach onEmbeddedChange on a mango that has no toEmbedded configured');
		this._emitter.addListener('embeddedChange', fn);
	}
}

module.exports = Mango;