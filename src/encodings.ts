const identity = <T>(value: T) => value;
const isBinary = <T>(data: T) => data == null || Buffer.isBuffer(data);

const utf8 = {
    encode<T>(data: T) {
        return isBinary(data) ? data : String(data);
    },

    decode<T>(data: T) {
        return typeof data === 'string'
            ? data
            : String(data);
    },

    buffer: false,
    type: 'utf8',
};

const json = {
    encode: (JSON.stringify as <T>(data: T) => T | any),
    decode: (JSON.parse as <T>(data: T) => T | any),
    buffer: false,
    type: 'json',
};

const binary = {
    encode<T>(data: T) {
        return isBinary(data)
            ? data
            : new Buffer(data.toString());
    },
    decode: identity,
    buffer: true,
    type: 'binary',
};

const none = {
    encode: identity,
    decode: identity,
    buffer: false,
    type: 'id',
};

const id = Object.assign({}, none);

const bufferEncodings = [
    'hex',
    'ascii',
    'base64',
    'ucs2',
    'ucs-2',
    'utf16le',
    'utf-16le',
];

const bufferTypes: IEncoders = {};

for (const type of bufferEncodings) {
    bufferTypes[type] = {
        encode<T>(data: T) {
            return isBinary(data)
                ? data
                : new Buffer(data.toString(), type);
        },
        decode(buffer: Buffer) {
            return buffer.toString(type);
        },
        buffer: true,
        type,
    };
}

export interface EncodingObject {
    encode: <T>(data: T) => any;
    decode: <T>(data: T) => any;
    buffer: boolean;
    type: string;
}

export interface IEncoders {
    [key: string]: EncodingObject;
}

const encoders: IEncoders = {
    ...bufferTypes,
    id,
    none,
    binary,
    json,
    utf8,
};


export default encoders;
