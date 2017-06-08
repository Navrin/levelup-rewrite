"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LevelDown = require("leveldown");
const Codec = require('level-codec');
const DeferredLevelDOWN = require('deferred-leveldown');
class ReadError extends Error {
}
exports.ReadError = ReadError;
class WriteError extends Error {
}
exports.WriteError = WriteError;
exports.defaultOptions = {
    createIfMissing: true,
    errorIfExists: false,
    compression: true,
    cacheSize: 8 * 1024 * 1024,
    keyEncoding: 'utf8',
    valueEncoding: 'utf8',
    db: LevelDown,
};
var StatusCodes;
(function (StatusCodes) {
    StatusCodes[StatusCodes["new"] = 0] = "new";
    StatusCodes[StatusCodes["opening"] = 1] = "opening";
    StatusCodes[StatusCodes["open"] = 2] = "open";
    StatusCodes[StatusCodes["closing"] = 3] = "closing";
    StatusCodes[StatusCodes["closed"] = 4] = "closed";
})(StatusCodes || (StatusCodes = {}));
class LevelUp {
    constructor(location, options) {
        const defaultedOptions = Object.assign({}, exports.defaultOptions, options);
        this.options = defaultedOptions;
        this.location = location;
        this.codec = new Codec(defaultedOptions);
        this.status = StatusCodes.new;
        this.open();
        return this;
    }
    open() {
        return new Promise((resolve, reject) => {
            if (this.status === StatusCodes.open || this.status === StatusCodes.opening) {
                reject(new ReadError('Database is being opened / open'));
                return;
            }
            this.status = StatusCodes.opening;
            this.db = new DeferredLevelDOWN(this.location);
            const DBFactory = this.options.db || LevelDown;
            const db = DBFactory(this.location);
            db.open((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.db.setDb(db);
                this.db = db;
                this.status = StatusCodes.open;
                if (this.pendingClose) {
                    this.close();
                }
                resolve(this);
            });
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            if (this.isOpen()) {
                this.status = StatusCodes.closing;
                this.db.close(() => {
                    this.status = StatusCodes.closed;
                    resolve(true);
                });
            }
            if (this.status === StatusCodes.closing
                || this.status === StatusCodes.closed) {
                resolve(true);
            }
            if (this.status === StatusCodes.opening) {
                this.pendingClose = true;
                resolve(true);
            }
        });
    }
    get(key, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            if (key == null) {
                reject(new ReadError(`Get Error: Expected (key: string), got ${key}`));
                return;
            }
            if (this.databaseNotReady()) {
                reject(new ReadError('Awaiting Database...'));
                return;
            }
            const encodedKey = this.codec.encodeKey(key, encoding);
            this.db.get(encodedKey, encoding, (err, value) => {
                if (err) {
                    if (/notfound/i.test(err) || err.notFound) {
                        resolve(undefined);
                        // a key wasn't found, therefore its undefined.
                        // maybe change this to an error? doesn't seem to be right.
                    }
                    reject(err);
                }
                const output = this.codec.decodeValue(value, encoding);
                resolve(output);
            });
        });
    }
    exists(key, encoding = 'utf8') {
        return __awaiter(this, void 0, void 0, function* () {
            if (key == null) {
                throw new ReadError(`Expected (key: string), got ${key}`);
            }
            const result = yield this.get(key);
            return result !== undefined;
        });
    }
    put(key, value, encoding = 'utf8') {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (key == null || value == null) {
                reject(new WriteError(`Expected either inputKey or value to be a string, got ${value} ${key}`));
                return;
            }
            if (this.databaseNotReady()) {
                reject(new ReadError('Awaiting Database...'));
                return;
            }
            const encodedKey = this.codec.encodeKey(key, encoding);
            const encodedValue = this.codec.encodeKey(value, encoding);
            this.db.put(encodedKey, encodedValue, encoding, (err) => {
                if (err) {
                    reject(new WriteError(`Put Error: Tried to write to DB, instead got ${err}`));
                    return;
                }
                resolve([encodedKey, encodedValue]);
            });
        }));
    }
    del(key, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            if (key == null) {
                reject(new Error(`Del Error: Expected (key: string), got ${key}`));
                return;
            }
            if (this.databaseNotReady()) {
                reject(new ReadError('Awaiting Database...'));
                return;
            }
            const encodedKey = this.codec.encodeKey(key, encoding);
            this.db.del(encodedKey, encoding, (err) => {
                if (err) {
                    reject(new WriteError(`Del Error: Tried to delete key, instead got ${err}`));
                }
                resolve(true);
            });
        });
    }
    batch(keys, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(keys)) {
                reject(new WriteError(`Batch Error: Expected (keys: string[]), got ${keys}.`));
                return;
            }
            if (this.databaseNotReady()) {
                reject(new ReadError('Awaiting Database...'));
                return;
            }
            const encodedKeys = (this.codec.encodeBatch(keys, encoding))
                .map((op) => {
                if (!op.type && op.key !== undefined && op.value !== undefined) {
                    op.type = 'put';
                }
                return op;
            });
            this.db.batch(encodedKeys, encoding, (err) => {
                if (err) {
                    reject(new WriteError(`Batch Error: Tried to batch keys, instead got ${err}`));
                    return;
                }
                resolve();
            });
        });
    }
    databaseNotReady() {
        switch (this.status) {
            case StatusCodes.closed:
                return true;
            case StatusCodes.closing:
                return true;
            case StatusCodes.new:
                return true;
            default:
                return false;
        }
    }
    isOpen() {
        return this.status === StatusCodes.open;
    }
    isClosed() {
        return this.status === StatusCodes.closed
            || this.status === StatusCodes.closing;
    }
    isOpening() {
        return this.status === StatusCodes.opening;
    }
}
exports.default = LevelUp;
//# sourceMappingURL=levelup.js.map