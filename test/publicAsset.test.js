import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAsset} from '../src/assets/publicAsset.js';

test('Public asset paths preserve localhost and work beneath the Pages base', () => {
  const base='/emerald-companion-2/';
  for(const path of ['/pokemon/box/1.png','/pokemon/emerald/normal/386.png','/pokemon/artwork/shiny/25.png','/types/icons/steel.png','/items/314.png','/trainers/frontier/steven.png','/ribbons/champion-ribbon.png','/badges/stone_badge.png','/frontier-symbols/tower-gold.png','/icons/pokeball.png']) {
    assert.equal(publicAsset(path,'/'),path);
    assert.equal(publicAsset(path,base),base+path.slice(1));
    assert.equal(publicAsset(publicAsset(path,base),base),base+path.slice(1));
  }
});

test('External, relative, data/blob URLs and absent sources pass through', () => {
  for(const source of ['https://example.com/a.png','//example.com/a.png','icons/a.png','data:image/png;base64,AA','blob:https://example.com/id','',null,undefined])assert.equal(publicAsset(source,'/emerald-companion-2/'),source);
});
