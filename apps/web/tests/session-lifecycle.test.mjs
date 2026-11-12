import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionLifecycle } from '../src/lib/session-lifecycle.ts';

test('responses from a prior account are rejected after a change completes', () => {
  const state = new SessionLifecycle();
  const old = state.capture();
  state.begin();
  state.finish();
  assert.throws(() => state.assertCurrent(old));
  assert.doesNotThrow(() => state.assertCurrent(state.capture()));
});
test('requests cannot enter the cache while account cookies are changing', () => {
  const state = new SessionLifecycle();
  state.begin();
  assert.equal(state.available(), false);
  assert.throws(() => state.assertCurrent(state.capture()));
  state.finish();
  assert.equal(state.available(), true);
});
test('overlapping account mutations are refused', () => {
  const state = new SessionLifecycle();
  state.begin();
  assert.throws(() => state.begin());
  state.finish();
  assert.doesNotThrow(() => state.begin());
  state.finish();
});

test('a cross-tab invalidation fences responses without changing mutation state', () => {
  const state = new SessionLifecycle();
  const before = state.capture();
  state.invalidate();
  assert.throws(() => state.assertCurrent(before));
  assert.equal(state.available(), true);
  state.begin();
  state.invalidate();
  assert.equal(state.available(), false);
  state.finish();
});
