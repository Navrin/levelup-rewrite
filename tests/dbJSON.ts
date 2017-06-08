import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';

import { db } from './database';

// tslint:disable:function-name
@suite('LevelDB: JSON') class JSONEncoding {
    @test async 'check if json store passes a shallow object test'() {
        const data = { hello: 'world', alpha: 'beta', foo: 'bar' };
        const key = this.randomString();

        await db.put(key, data, 'json');

        const result = await db.get(key, 'json');

        assert.deepEqual(result, data);
    }
    randomString(): string {
        return (Math.random() * 10).toString(16);
    }

    randomEntry(): { key: string, value: string } {
        return { key: this.randomString(), value: this.randomString() };
    }

}

export default JSONEncoding;
