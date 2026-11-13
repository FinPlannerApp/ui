import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCommit, bumpVersion } from './release.mjs';

const c = (subject, body = '') => ({ subject, body });

test('feat is a minor bump, fix a patch bump, breaking a major bump', () => {
  assert.equal(bumpVersion('6.1.4', [c('feat: x')]), '6.2.0');
  assert.equal(bumpVersion('6.1.4', [c('fix: x')]), '6.1.5');
  assert.equal(bumpVersion('6.1.4', [c('feat!: x')]), '7.0.0');
  assert.equal(bumpVersion('6.1.4', [c('refactor: x', 'BREAKING CHANGE: gone')]), '7.0.0');
  assert.equal(bumpVersion('6.1.4', [c('fix: a'), c('feat: b')]), '6.2.0');
});

test('a push with only housekeeping still gets a patch version', () => {
  assert.equal(bumpVersion('6.1.4', [c('chore: bump deps'), c('docs: readme')]), '6.1.5');
  assert.equal(bumpVersion('6.1.4', [c('no conventional prefix')]), '6.1.5');
});

test('scoped and breaking prefixes are parsed', () => {
  assert.deepEqual(parseCommit(c('feat(auth)!: x')), { type: 'feat', breaking: true });
  assert.deepEqual(parseCommit(c('Fix: x')), { type: 'fix', breaking: false });
  assert.deepEqual(parseCommit(c('whatever')), { type: 'other', breaking: false });
});

test('minor and patch numbers go past 9 numerically', () => {
  assert.equal(bumpVersion('6.9.9', [c('feat: x')]), '6.10.0');
  assert.equal(bumpVersion('6.9.9', [c('fix: x')]), '6.9.10');
});
