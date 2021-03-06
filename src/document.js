import { EventEmitter } from 'events';
import _ from 'lodash';

export default class Document extends EventEmitter {
	constructor(model, properties, options) {
		super();
		
		properties = properties || {};

		this._model = model;
		this._data  = new model.schema.DataClass(properties, model.name); 
		this._options = options || {};

		this._from = null;
		this._to = null;

		this._isNew = true;
	}

	from(value) {
		this._from = value;
		return this;
	}

	to(value) {
		this._to = value;
		return this;
	}

	model(name) {
		return this._model.model(name);
	}

	get(path) {
		return this._data.get(path);
	}

	set(path, value) {
		this._data.set(path, value);
		return this;
	}

	get isNew() {
		return this._isNew;
	}

	isModified(path) {
		return this._data.isModified(path);
	}

	setupData(properties) {
		this._data.setupData(properties);
		this._isNew = false;
		return this;
	}

	toJSON(options) {
		return this._data.toJSON(options);
	}

	toObject(options) {
		return this._data.toObject(options);
	}

	forEach(returnType, fn) {
		return this._data.forEach(returnType, fn);
	}

	save(options, callback) {
		if(typeof options === 'function') {
			callback = options;
			options = {};
		}

		options = options || {};

		var hooks = this._model.schema.hooks;
		hooks.execPre('validate', this, error => {
			if(error) {
				return callback(error);
			}			

			hooks.execPre('save', this, error => {
				if(error) {
					return callback(error);
				}

				if(this.isNew) {
					var properties = this.toObject({
						metadata: true,
						create: true
					});

					console.log(properties);

					this._model.create(properties)
						.from(this._from)
						.to(this._to)
						.options(options)
						.exec((error, user) => {
						if(error) {
							return callback(error);
						}

						this.setupData(user.toJSON({
							metadata: true
						}));

						callback(null, this);
					});

					return;
				} 

				var properties = this.toObject({
					metadata: true,
					modified: true,
					update: true
				});

				console.log(properties);

				//properties = this.prepareUpdateProperties(properties);

				this._model.update(this, properties, options).exec((err, total) => {
					if(err) {
						return callback(err);
					}

					this.setupData(properties);
					callback(null, this);
				});
			});
		});
	}

	prepareUpdateProperties(properties) {
		var props = {};
		Object.keys(properties).forEach(propName => {
			var value = properties[propName];
			if(propName[0] === '@') {
				return;
			}

			if(_.isObject(value) && !_.isArray(value)) {
				var propsInner = this.prepareUpdateProperties(value);
				Object.keys(propsInner).forEach(function(propName2) {
					if(propName2[0] === '@') {
						return;
					}
					props[propName + '.' + propName2] = propsInner[propName2];
				});
				return;
			}

			props[propName] = value;
		});

		return props;
	}

	remove(callback) {
		var model = this._model;
		var hooks = model.schema.hooks;

		if(this.isNew) {
			return callback(null, this);
		}

		hooks.execPre('remove', this, (error) => {
			if(error) {
				return callback(error);
			}

			model.remove(this, callback);
		});
	}

	static findById(id, callback) {
		this.findOne(id, callback);
	}

	static findOne(conditions, callback) {
		return this.currentModel
			.findOne(conditions, callback);
	}

	static find(conditions, callback) {
		return this.currentModel
			.find(conditions, callback);
	}

	static findOneAndUpdate(conditions, doc, options, callback) {
		return this.currentModel
			.findOneAndUpdate(conditions, doc, options, callback);
	}

	static create(properties, options, callback) {
		if(typeof options === 'function') {
			callback = options;
			options = {};
		}

		options = options || {};

		return new this(properties, options)
			.save(callback);
	}

	static update(conditions, doc, options, callback) {
		return this.currentModel
			.update(conditions, doc, options, callback);
	}

	static remove(conditions, callback) {
		return this.currentModel
			.remove(conditions, callback);
	}

	static createClass (model) {
		class DocumentModel extends Document {
			constructor(properties) {
				super(model, properties);
			}

			/**
			Frized api mongoose
			*/
			static model(modelName) {
				return model.model(modelName);
			}

			/**
			Frized api mongoose
			*/
			static get modelName() {
				return model.name;
			}

			static get currentModel() {
				return model;
			}

		};

		var schema = model.schema;

		//add basic data getters and setters
		schema.traverse(function(fieldName, fieldOptions) {
			Object.defineProperty(DocumentModel.prototype, fieldName, {
				enumerable: true,
				configurable: true,
				get: function() {
					return this.get(fieldName);
				},
				set: function(value) {
					this.set(fieldName, value);
					return this;
				}
			});
		});

		//add methods
		for(var methodName in schema.methods) {
			var fn = schema.methods[methodName];
			DocumentModel.prototype[methodName] = fn;
		}

		//add statics
		for(var staticName in schema.statics) {
			var fn = schema.statics[staticName];
			DocumentModel[staticName] = fn;
		}

		return DocumentModel;
	}
}