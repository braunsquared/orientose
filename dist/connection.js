"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var EventEmitter = require("events").EventEmitter;

var Oriento = _interopRequire(require("oriento"));

var Model = _interopRequire(require("./model"));

var ReadyState = _interopRequire(require("./constants/readystate"));

var SchemaV = _interopRequire(require("./schemas/orient/v"));

var SchemaE = _interopRequire(require("./schemas/orient/e"));

var Connection = (function (_EventEmitter) {
	function Connection(options, dbOptions) {
		var _this = this;

		_classCallCheck(this, Connection);

		_get(Object.getPrototypeOf(Connection.prototype), "constructor", this).call(this);

		options = options || {};
		dbOptions = dbOptions || {};

		if (typeof dbOptions === "string") {
			var dbName = dbOptions;
			dbOptions = {
				name: dbName
			};
		}

		this._options = options;
		this._dbOptions = dbOptions;

		this._models = new Map();

		this._server = Oriento(options);
		this._db = this._server.use(dbOptions);
		this._status = null;
		this._readyState = ReadyState.DISCONNECTED;

		this.db.open().then(function (status) {
			_this._status = status;
			_this._readyState = ReadyState.CONNECTED;
		}, function (err) {
			_this._readyState = ReadyState.DISCONNECTED;
		});

		this._registerBasicModels();
	}

	_inherits(Connection, _EventEmitter);

	_createClass(Connection, {
		db: {
			get: function () {
				return this._db;
			}
		},
		server: {
			get: function () {
				return this._server;
			}
		},
		model: {
			value: function model(name, schema, options, callback) {
				if (typeof options === "function") {
					callback = options;
					options = {};
				}

				options = options || {};
				callback = callback || function () {};

				if (typeof schema === "undefined") {
					if (!this._models.has(name)) {
						throw new Error("Model " + name + " does not exists");
					}

					return this._models.get(name).DocumentClass;
				}

				if (this._models.has(name)) {
					throw new Error("Model already exists");
				}

				this._models.set(name, new Model(name, schema, this, options, function (err, model) {
					if (err) {
						return callback(err);
					}

					callback(null, model.DocumentClass);
				}));

				return this._models.get(name).DocumentClass;
			}
		},
		modelNames: {

			/*
   Returns an array of model names created on this connection.
   */

			value: function modelNames() {
				return this._models.keys();
			}
		},
		readyState: {
			get: function () {
				return this._readyState;
			}
		},
		_registerBasicModels: {
			value: function _registerBasicModels() {
				this.model("V", new SchemaV(), { ensure: false });
				this.model("E", new SchemaE(), { ensure: false });
			}
		}
	});

	return Connection;
})(EventEmitter);

module.exports = Connection;