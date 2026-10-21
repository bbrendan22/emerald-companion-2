import test from 'node:test';
import assert from 'node:assert/strict';
import {blockUpdates, updatesBlocked, onUpdatesUnblocked} from '../src/pwa/updateSafety.js';
test('overlapping import/draft guards only permit updates after every operation finishes', () => {
  let notifications=0;
  const unsubscribe=onUpdatesUnblocked(()=>notifications++);
  const releaseImport=blockUpdates(), releaseDraft=blockUpdates();
  assert.equal(updatesBlocked(),true);
  releaseImport();releaseImport();
  assert.equal(updatesBlocked(),true);
  assert.equal(notifications,1);
  releaseDraft();
  assert.equal(updatesBlocked(),false);
  assert.equal(notifications,2);
  unsubscribe();
});
