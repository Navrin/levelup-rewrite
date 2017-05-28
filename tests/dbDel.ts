import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';
import { times } from 'lodash';

import {db} from './database';

// tslint:disable:function-name
@suite('LevelDB: Del') class Del {
    @test async 'check if a single key is deleted and returns undefined'() {
        const key = this.randomString();
        const value = this.randomString();

        await db.put(key, value);
        await db.del(key);
        const result = await db.get(key);
        assert.notOk(result);
    }

    @test async 'check if multiple deleted keys return undefined'() {
        const tests = times(100, () => {
            return {
                key: this.randomString(),
                value: this.randomString(),
            };
        });

        for (const test of tests) {
            await db.put(test.key, test.value);
            await db.del(test.key);
            const result = await db.get(test.key);

            assert.notOk(result);
        }
    }

    randomString(): string {
        return (Math.random() * 10).toString(16);
    }

}

export default Del;
