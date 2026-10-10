import test from 'node:test';
import assert from 'node:assert/strict';
import { accountSuffix } from '../src/accountDomain.ts';
test('the original account keeps its existing local history after linking email', () => {
 assert.equal(accountSuffix('original-user', 'original-user'), '');
});
test('switching accounts selects separate storage and returning restores its namespace', () => {
 const first = accountSuffix('other/user', 'original-user');
 const second = accountSuffix('other-user', 'original-user');
 assert.notEqual(first, second);
 assert.match(first, /^-[a-f0-9]+$/);
 assert.equal(first, accountSuffix('other/user', 'original-user'));
 assert.throws(() => accountSuffix('', 'original-user'));
});
