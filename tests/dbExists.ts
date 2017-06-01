import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';
import {db} from './database';

const dataValues = {
    hello: {
        key: 'hello',
        content: 'world',
    },
    foo: {
        key: 'foo',
        content: 'bar',
    },
    alpha: {
        key: 'alpha',
        content: 'beta',
    },
};

db.put(dataValues.hello.key, dataValues.hello.content);
db.put(dataValues.foo.key, dataValues.foo.content);
db.put(dataValues.alpha.key, dataValues.alpha.content);

// tslint:disable:function-name
@suite('LevelDB: Exists') class Exists {
    data = dataValues;

    @test async 'check if a key that exists returns true'() {
        assert.ok(await db.get(dataValues.hello.key));
    }

    @test async 'check if a key that does not exist returns false'() {
        assert.notOk(await db.get('THIS SHOULD NOT EXIST.'));
    }
}

export default Exists;
