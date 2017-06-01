/// <reference types="leveldown" />
import LevelDown = require('leveldown');
export declare class ReadError extends Error {
}
export declare class WriteError extends Error {
}
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
export declare const defaultOptions: LevelUpSettings;
export default class LevelUp {
    db: LevelDown.LevelDown;
    private pendingClose;
    private location;
    private options;
    private codec;
    private status;
    constructor(location: string, options?: LevelUpSettings);
    open(): Promise<LevelUp>;
    close(): Promise<boolean>;
    get(key: string, encoding?: string): Promise<string | object>;
    exists(key: string, encoding?: string): Promise<boolean>;
    put(key: string, value: string | object, encoding?: string): Promise<string[]>;
    del(key: string, encoding?: string): Promise<boolean>;
    batch(keys: BatchObject[], encoding?: string): Promise<{}>;
    databaseNotReady(): boolean;
    isOpen(): boolean;
    isClosed(): boolean;
    isOpening(): boolean;
}
