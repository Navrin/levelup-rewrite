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
@suite('LevelDB: Get') class Get {
    data = dataValues;

    @test async 'check if a key returns the putted value'() {
        const result = await db.get(this.data.hello.key);
        assert.equal(result, this.data.hello.content);
    }

    @test async 'check if multiple keys and values can be stored'() {
        const hello = await db.get(this.data.hello.key);
        const alpha = await db.get(this.data.alpha.key);
        const foo = await db.get(this.data.foo.key);

        assert.equal(hello, this.data.hello.content);
        assert.equal(alpha, this.data.alpha.content);
        assert.equal(foo, this.data.foo.content);
    }

}

export default Get;
