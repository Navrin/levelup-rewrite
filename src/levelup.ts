import LevelDown = require('leveldown');
const Codec = require('level-codec');
const DeferredLevelDOWN = require('deferred-leveldown');

export class ReadError extends Error {}
export class WriteError extends Error {}


export interface LevelUpSettings {
    /**
     *  If true, will initialise an empty database at the specified location if one doesn't already exist.
     *  If false and a database doesn't exist you will receive an error in your open() callback and your database won't open.
     *
     * @type {boolean}
     * @memberof LevelUpSettings
     */
    createIfMissing: boolean;
    /**
     *
     * If true, you will receive an error in your open() callback if the database exists at the specified location.
     *
     * @type {boolean}
     * @memberof LevelUpSettings
     */
    errorIfExists: boolean;
    /**
     *
     * If true, all compressible data will be run through the Snappy compression algorithm before being stored.
     * Snappy is very fast and shouldn't gain much speed by disabling so leave this on unless you have good reason to turn it off.
     *
     * @type {boolean}
     * @memberof LevelUpSettings
     */
    compression: boolean;
    /**
     * The size (in bytes) of the in-memory LRU cache with frequently used uncompressed block contents.
     *
     * @type {number}
     * @memberof LevelUpSettings
     */
    cacheSize: number;
    /**
     * The encoding of the keys and values passed through Node.js' Buffer implementation (see Buffer#toString()).
     *
     * @type {string}
     * @memberof LevelUpSettings
     */
    keyEncoding: string;
    valueEncoding: string;
    /**
     * LevelUP is backed by LevelDOWN to provide an interface to LevelDB.
     * You can completely replace the use of LevelDOWN by providing a "factory"
     * function that will return a LevelDOWN API compatible object given a location argument.
     * For further information, see MemDOWN, a fully LevelDOWN API compatible replacement that uses a memory store rather than LevelDB.
     * Also see Abstract LevelDOWN, a partial implementation of the LevelDOWN API
     *  that can be used as a base prototype for a LevelDOWN substitute.
     *
     * @type {object}
     * @memberof LevelUpSettings
     */
    db: (location: string) => LevelDown.LevelDown;
}

export interface BatchObject {
    type: string;
    key: string;
    value: string;
}

export const defaultOptions: LevelUpSettings = {
    createIfMissing: true,
    errorIfExists: false,
    compression: true,
    cacheSize: 8 * 1024 * 1024,
    keyEncoding: 'utf8',
    valueEncoding: 'utf8',
    db: LevelDown,
};

enum StatusCodes {
    new = 0,
    opening,
    open,
    closing,
    closed,

}

export default class LevelUp {
    public db: LevelDown.LevelDown;
    private pendingClose: boolean;
    private location: string;
    private options: LevelUpSettings;
    private codec: any;
    private status: StatusCodes;

    constructor(location: string, options?: LevelUpSettings) {
        const defaultedOptions = Object.assign({}, defaultOptions, options);
        this.options = defaultedOptions;
        this.location = location;
        this.codec = new Codec(defaultedOptions);
        this.status = StatusCodes.new;
        this.open();
        return this;
    }

    public open(): Promise<LevelUp> {
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

                (<any>this.db).setDb(db);

                this.db = db;
                this.status = StatusCodes.open;

                if (this.pendingClose) {
                    this.close();
                }

                resolve(this);
            });
        });
    }

    public close(): Promise<boolean> {
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

    public get(key: string, encoding: string = 'utf8'): Promise<string | object> {
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
                const output: string = this.codec.decodeValue(value, encoding);

                resolve(output);
            });
        });
    }

    public async exists(key: string, encoding: string = 'utf8'): Promise<boolean> {
        if (key == null) {
            throw new ReadError(`Expected (key: string), got ${key}`);
        }

        const result = await this.get(key);
        return result !== undefined;
    }

    public put(key: string, value: string | object, encoding: string = 'utf8'): Promise<string[]> {
        return new Promise(async (resolve, reject) => {
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
        });
    }

    public del(key: string, encoding: string = 'utf8'): Promise<boolean> {
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

    public batch(keys: BatchObject[], encoding: string = 'utf8'): Promise<{}> {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(keys)) {
                reject(new WriteError(`Batch Error: Expected (keys: string[]), got ${keys}.`));
                return;

            }

            if (this.databaseNotReady()) {
                reject(new ReadError('Awaiting Database...'));
                return;

            }

            const encodedKeys = <any[]>(this.codec.encodeBatch(keys, encoding))
                .map((op: { type: string, key: string, value: string }) => {
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

    public databaseNotReady() {
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

    public isOpen() {
        return this.status === StatusCodes.open;
    }

    public isClosed() {
        return this.status === StatusCodes.closed
            || this.status === StatusCodes.closing;
    }

    public isOpening() {
        return this.status === StatusCodes.opening;
    }

}
