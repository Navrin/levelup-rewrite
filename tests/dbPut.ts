import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';
import { times } from 'lodash';

import { db } from './database';

// tslint:disable:function-name
@suite('LevelDB: Put') class Put {

    @test async 'check if a single put returns its expected value'() {
        try {
            const key = this.randomString();
            const value = this.randomString();

            await db.put(key, value);

            assert.equal(value, await db.get(key));
        } catch (e) {
            console.error(e);
        }
    }

    @test async 'check if 100 keys and values return their expected values'() {
        try {
            const tests = times(100, () => {
                return {
                    key: this.randomString(),
                    value: this.randomString(),
                };
            });

            for (const test of tests) {
                await db.put(test.key, test.value);
                const result = await db.get(test.key);

                assert.equal(result, test.value);
            }
        } catch (e) {
            console.error(e);
        }
    }

    randomString(): string {
        return (Math.random() * 10).toString(16);
    }

}

export default Put;
