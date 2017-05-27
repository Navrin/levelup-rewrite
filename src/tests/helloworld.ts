import { suite, test } from 'mocha-typescript';
import { assert } from 'chai';

@suite class Hello {
    @test world() {
        assert.equal(1, 1, 'Expected one to equal one');
    }
}

export default Hello;