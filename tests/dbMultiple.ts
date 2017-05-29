import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';
import { times } from 'lodash';
import LevelUp from '../src/levelup';
import * as fs from 'fs-extra';

const firstDatabase = new LevelUp('testdb/db_test_one');
const secondDatabase = new LevelUp('testdb/db_test_second');

// tslint:disable:function-name
@suite('LevelDB: Multiple Databases') class Multiple {

    @test async 'check if multiple databases can work at once'() {
        const data = {
            value1: this.randomEntry(),
            value2: this.randomEntry(),
        };

        await firstDatabase.put(data.value1.key, data.value1.value);
        await secondDatabase.put(data.value2.key, data.value2.value);

        const firstResult = await firstDatabase.get(data.value1.key);
        const secondResult = await secondDatabase.get(data.value2.key);

        assert.equal(firstResult, data.value1.value);
        assert.equal(secondResult, data.value2.value);
    }

    @test async 'check if dynamicly generated databases are valid'() {
        times(5, async () => {
            const name = `testdb/db_test_${this.randomString()}`;
            const db = new LevelUp(name);

            const entry = this.randomEntry();

            await db.put(entry.key, entry.value);
            const result = await db.get(entry.key);

            assert.equal(result, entry.value);
            await fs.remove(name);
        });
    }

    randomString(): string {
        return (Math.random() * 10).toString(16);
    }

    randomEntry(): { key: string, value: string } {
        return { key: this.randomString(), value: this.randomString() };
    }

}

export default Multiple;
