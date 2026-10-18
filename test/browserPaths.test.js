import test from 'node:test';
import assert from 'node:assert/strict';
import {assetPath, browserTestUrl} from './helpers/browserPaths.js';

test('browser asset expectations retain exact filenames under root and Pages bases', () => {
  for (const url of ['http://localhost:5194/', 'http://localhost:5194']) {
    assert.equal(assetPath('/pokemon/emerald/normal/25.png', url), '/pokemon/emerald/normal/25.png');
  }
  assert.equal(assetPath('/types/icons/water.png', 'http://localhost:5193/emerald-companion-2/'), '/emerald-companion-2/types/icons/water.png');
  assert.equal(assetPath('/items/13.png?failure-check', 'http://localhost:5193/emerald-companion-2'), '/emerald-companion-2/items/13.png?failure-check');
  assert.throws(() => assetPath('//example.com/image.png'));
  assert.throws(() => assetPath('image.png'));
});

test('browser path configuration supports the runner and existing script URL variables', () => {
  for (const key of ['BROWSER_URL', 'BATTLE_URL', 'SHOWCASE_URL', 'PAGES_URL']) {
    assert.equal(browserTestUrl({[key]: 'http://localhost:1234/custom/'}), 'http://localhost:1234/custom/');
  }
  assert.equal(browserTestUrl({BROWSER_URL:'http://localhost:1/pages/', BATTLE_URL:'http://localhost:2/'}), 'http://localhost:1/pages/');
});
