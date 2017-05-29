import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';
import { times } from 'lodash';

import {db} from './database';

// tslint:disable:function-name
@suite('LevelDB: Batch') class Batch {
    @test async 'check if 100 items in a batch put returns their expected values'() {
        const tests = times(100, () => {
            return {
                type: 'put',
                key: this.randomString(),
                value: this.randomString(),
            };
        });

        await db.batch(tests);

        for (const test of tests) {
            assert.equal(test.value, await db.get(test.key));
        }
    }

    @test async 'check if 100 batch deleted keys return undefined when searched for'() {
        const tests = times(100, () => {
            return {
                type: 'put',
                key: this.randomString(),
                value: this.randomString(),
            };
        });

        await db.batch(tests);

        await db.batch(tests.map((test) => {
            return {
                ...test,
                type: 'del',
            };
        }));

        for (const test of tests) {
            assert.notOk(await db.get(test.key));
        }
    }

    randomString(): string {
        return (Math.random() * 10).toString(16);
    }

}

export default Batch;
