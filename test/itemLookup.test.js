import test from 'node:test';
import assert from 'node:assert/strict';
import {battleItemId} from '../src/battle/itemLookup.js';

test('Battle item lookup preserves IDs, punctuation/case aliases and absent-item results',()=>{
 for(const [name,id] of [['Potion','13'],['choice-band','186'],['CHOICE BAND','186'],['BrightPowder','179']])assert.equal(battleItemId(name),id);
 for(const name of ['','None','?????','Unknown item'])assert.equal(battleItemId(name),undefined);
});
test('Battle item callers retain strict Sets input and tolerant Matchup null handling',()=>{
 for(const name of [null,undefined]){
  assert.throws(()=>battleItemId(name),TypeError);
  assert.equal(battleItemId(String(name??'')),undefined);
 }
});
