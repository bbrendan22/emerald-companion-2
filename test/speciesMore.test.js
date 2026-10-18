import test from 'node:test';
import assert from 'node:assert/strict';
import {speciesMore,wildHeldItems} from '../src/resources/speciesMore.js';
import data from '../src/resources/data/more.json' with {type:'json'};
test('More covers all 386 species with complete ordered fields and valid Emerald data',() => {
 const labels=['Height','Weight','Experience growth','Catch rate','Wild held items','Base friendship','Base experience yield','EV yield','Egg groups','Egg cycles','Approx. hatch steps'];
 for(let dex=1;dex<=386;dex++) {
  const rows=speciesMore(dex), info=data.species[dex]; assert.deepEqual(rows.map(r=>r[0]),labels);
  assert.ok(rows.every(([,value])=>value && !value.includes('undefined')));
  assert.ok(info.catchRate>0 && info.catchRate<=255); assert.ok(info.eggCycles>0);
  assert.equal(rows[10][1],(info.eggCycles*256).toLocaleString('en-US'));
 }
 assert.equal(speciesMore(0),null);
});
test('Magneton matches Emerald facts, including Gen 3 EXP and wild item',()=> {
 assert.deepEqual(speciesMore(82).map(r=>r[1]),['1 m','60 kg','medium fast','60 / 255','Metal Coat · 5% (rare)','70','161','2 Sp. Attack','Mineral','20','5,120']);
});
test('held item slots, multiple EV stats, and breeding edge cases remain explicit',()=> {
 assert.equal(wildHeldItems(0,0),'None');
 assert.match(speciesMore(25)[4][1],/50% \(common\).*5% \(rare\)/);
 assert.match(speciesMore(37)[4][1],/100%/);
 assert.equal(speciesMore(150)[8][1],'Undiscovered');
 assert.equal(speciesMore(132)[8][1],'Ditto');
 assert.match(speciesMore(3)[7][1],/Sp. Attack.*Sp. Defense/);
});
