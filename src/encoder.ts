import encodings, { IEncoders, EncodingObject } from './encodings';
import { BatchObject } from './levelup';

export interface EncoderOptions {
    keyEncoding?: string;
    valueEncoding?: string;
    encoding?: string;
}

type encoder = string | EncodingObject | undefined;
export type ExtendedBatchEncoding = BatchObject & { prefix?: string };

interface BatchBuilderEntity {
    type: 'del' | 'put';
    key: any;
    keyEncoding?: string;
    valueEncoding?: string;
    prefix?: string;
    value?: string;
}

export default class Codec {
    specialCharacters = ['lt', 'gt', 'lte', 'gte', 'start', 'end'];
    encoding: IEncoders;
    options: EncoderOptions;

    /**
     * Creates an instance of Codec.
     * @param {EncoderOptions} options - Default options for the encoding object, to prevent nil encodings.
     *
     * @memberof Codec
     */
    constructor(options: EncoderOptions) {
        this.encoding = encodings;
        this.options = options;
    }

    // public encode(value: any, encodingType?: 'value' | 'key', encoding?: EncoderOptions | string) {
    //     constt encoder = this.getEncoder(encoding, encodingType);
    //     this.getEncoded()
    // }

    // public decode(value: any, encoding?: EncoderOptions | string) {

    // }

    // private getEncoded(value: any, encoder: string) {
    //     return this.encoding[encoder].encode(value);
    // }

    // private getEncoder(encoding?: EncoderOptions | string, encodingType?: 'value' | 'key') {

    // }
    /**
     * Encodes a key with the specified encoding type, else the default encoding.
     *
     * @template K
     * @param {K} key
     * @param {EncoderOptions} options
     * @param {EncoderOptions} batchOptions
     * @returns
     *
     * @memberof Codec
     */
    public encodeKey<K>(key: K, options?: EncoderOptions | string, batchOptions?: EncoderOptions) {
        return this.keyEncoding(this.createEncoderObject(options), batchOptions).encode(key);
    }

    /**
     * Performs the same action as encodeKey, but with a value instead.
     *
     * @template V
     * @param {V} value
     * @param {EncoderOptions} options
     * @param {EncoderOptions} batchOptions
     * @returns
     *
     * @memberof Codec
     */
    public encodeValue<V>(value: V, options?: EncoderOptions, batchOptions?: EncoderOptions) {
        return this.valueEncoding(this.createEncoderObject(options), batchOptions).encode(value);
    }

    /**
     * Decodes a key with the specified encoding options.
     *
     * @template K
     * @param {K} key
     * @param {EncoderOptions} options
     * @returns
     *
     * @memberof Codec
     */
    public decodeKey<K>(key: K, options?: EncoderOptions) {
        return this.keyEncoding(this.createEncoderObject(options)).decode(key);
    }

    /**
     * Same as decodeKey, but uses a value instead.
     *
     * @template V
     * @param {V} value
     * @param {EncoderOptions} [options]
     *
     * @memberof Codec
     */
    public decodeValue<V>(value: V, options?: EncoderOptions) {
        return this.valueEncoding(this.createEncoderObject(options)).decode(value);
    }

    createEncoderObject(encoder: EncoderOptions | string | undefined): EncoderOptions | undefined {
        if (typeof encoder === 'string') {
            return { keyEncoding: encoder, valueEncoding: encoder };
        }
        return encoder;
    }

    /**
     * Bulk encodes a batch of keys and sets the correct responses for each operation.
     *
     * @param {BatchObject[]} operations
     * @param {EncoderOptions} options
     * @returns {ExtendedBatchEncoding[]}
     *
     * @memberof Codec
     */
    public encodeBatch(operations: BatchObject[], options: EncoderOptions): ExtendedBatchEncoding[] {
        return operations.map((operatorObject: BatchObject & { prefix?: string, type: 'del' | 'put' }) => {
            const newOperator: BatchBuilderEntity = {
                type: operatorObject.type,
                key: this.decodeKey(operatorObject.key, options || operatorObject),
            };

            if (this.keyAsBuffer(options)) {
                newOperator.keyEncoding = 'binary';
            }

            if (operatorObject.prefix) {
                newOperator.prefix = operatorObject.prefix;
            }

            if (operatorObject.value) {
                newOperator.value = this.encodeValue(operatorObject.value, options);
                if (this.valueAsBuffer(options)) {
                    newOperator.valueEncoding = 'binary';
                }
            }
            return operatorObject;
        });
    }

    /**
     * Encodes characters like `<` and `>` to be represented in alphanumeric
     *
     * @param {{ [key: string]: string }} specials
     * @returns
     *
     * @memberof Codec
     */
    public encodeSpecials(specials: { [key: string]: string }) {
        const encodedSpecials: { [key: string]: string } = {};

        for (const special of Object.keys(specials)) {
            encodedSpecials[special] =
                this.specialCharacters.includes(special)
                    ? this.encodeKey(specials[special], special)
                    : specials[special];
        }

        return encodedSpecials;
    }

    createSteamDecoder(options: BatchObject) {
        if (options.key && options.value) {
            return <K, V>(key: K, value: V) => {
                return {
                    key: this.decodeKey(key, options),
                    value: this.decodeValue(value, options),
                };
            };
        } else if (options.key) {
            return <K, V>(key: K, value: V) => {
                return this.decodeKey(key, options);
            };
        } else if (options.value) {
            return <K, V>(_: K, value: V) => {
                return this.decodeValue(value, options);
            };
        } else {
            return () => null;
        }
    }

    /**
     * Returns if a encoder uses a buffer for keys.
     *
     * @param {EncoderOptions} options
     * @returns {boolean}
     *
     * @memberof Codec
     */
    keyAsBuffer(options: EncoderOptions): boolean {
        return this.keyEncoding(options).buffer;
    }

    /**
     * Returns if a encoder uses a buffer for values.
     *
     * @param {EncoderOptions} options
     * @returns {boolean}
     *
     * @memberof Codec
     */
    public valueAsBuffer(options: EncoderOptions): boolean {
        return this.valueEncoding(options).buffer;
    }

    /***********
     * PRIVATE *
     ***********/

    /**
     * Gets the correct encoding type for an object entity or string.
     *
     * @private
     * @param {(string | EncodingObject)} [encoding]
     * @returns {EncodingObject}
     *
     * @memberof Codec
     */
    private getEncoding(encoding?: encoder): EncodingObject {
        switch (typeof encoding) {
            case 'string': {
                return this.encoding[(encoding as string)];
            }
            case 'undefined':
                return this.encoding.id;
            default:
                return (encoding as EncodingObject);
        }
    }

    /**
     * Encodes the key to match the options provided in the parameter.
     * If the key isn't provided, fall back to the default options.
     *
     * @private
     * @param {EncoderOptions} [options]
     * @param {EncoderOptions} [batchOptions]
     * @returns {EncodingObject}
     *
     * @memberof Codec
     */
    private keyEncoding(options?: EncoderOptions, batchOptions?: EncoderOptions): EncodingObject {
        const encoding =
            batchOptions && batchOptions.keyEncoding
            || options && options.keyEncoding
            || this.options.keyEncoding;

        return this.getEncoding(encoding);
    }

    /**
     * Does the same as keyEncoding, but takes body values instead.
     *
     * @private
     * @param {EncoderOptions} [options]
     * @param {EncoderOptions} [batchOptions]
     * @returns {EncodingObject}
     *
     * @memberof Codec
     */
    private valueEncoding(options?: EncoderOptions, batchOptions?: EncoderOptions): EncodingObject {
        const encoding =
            batchOptions && (batchOptions.valueEncoding || batchOptions.encoding)
            || options && (options.valueEncoding || options.encoding)
            || (this.options.valueEncoding || this.options.encoding);

        return this.getEncoding(encoding);
    }
}


