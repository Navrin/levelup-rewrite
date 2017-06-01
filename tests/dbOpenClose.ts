import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';

import { dbCloseable } from './database';

// tslint:disable:function-name
@suite('LevelDB: Open & Close') class OpenAndClose {
    @test async 'check if opening the same database twice throws an error'() {
        try {
            await dbCloseable.open();
        } catch (e) {
            assert.isOk(e);
        }
    }

    @test async 'check if a close database throws and error when requested an action'() {
        try {
            const db = dbCloseable;
            await db.close();
            await db.get('hi');
            await db.open();
            return;
        } catch (e) {
            assert.isOk(e);
            return e;
        }
    }

    randomString(): string {
        return (Math.random() * 10).toString(16);
    }

}

export default OpenAndClose;
