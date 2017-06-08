import encodings, { IEncoders } from './encodings';

export default
class Codec {
    encoding: IEncoders;
    options: {};

    /**
     * Creates an instance of Codec.
     * @param {*} options - TODO: Add typings for options.
     *
     * @memberof Codec
     */
    constructor(options: any) {
        this.encoding = encodings;
        this.options = options;
    }
}