import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesBattleWords} from '../src/battle/searchWords.js';
import {searchTowerTrainers} from '../src/battle/towerTrainers.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';

test('Battle search matches case-insensitive word beginnings, with literal punctuation',()=>{
 for(const [text,query,expected] of [
  ['Metagross','meta',true],['Metagross','gross',false],['Metagross','tag',false],
  ['Ace Trainer','ACE',true],['Ace Trainer','trainer',true],['Ace Trainer','rain',false],
  ['Mr. Mime','mime',true],['Mr. Mime','Mr.',true],['Ho-Oh','oh',true],
  ['Ace Trainer',' tr ace ',true],['Élodie Trainer','lod',false],['Élodie Trainer','élo',true],
  ['Metagross','.*',false],['Metagross','[',false],['Metagross','',true],
 ]) assert.equal(matchesBattleWords(text,query),expected,`${text}: ${query}`);
});
test('Battle trainer and species searches retain filtering/sorting while rejecting substrings',()=>{
 const entries=[{key:'a',name:'Ace Trainer',trainerClass:'Example'},{key:'b',name:'Metagross',trainerClass:'Example'}];
 assert.deepEqual(searchTowerTrainers('trainer',{entries,nameOnly:true}).map(t=>t.key),['a']);
 assert.deepEqual(searchTowerTrainers('rain',{entries,nameOnly:true}),[]);
 const state=createBattleState();
 const matches=availableOpponentSpecies(state,'meta');
 assert.deepEqual(matches.map(s=>s.name),['Metagross','Metang','Metapod']);
 assert.equal(state.selectedTrainer,null,'canonical prefix matches do not require a trainer');
 assert.equal(battleReducer(state,{type:'selectSinglesOpponent',speciesId:matches[0].id}),state,'selecting an opponent still requires a trainer');
 assert.deepEqual(availableOpponentSpecies(createBattleState(),'gross'),[]);
 assert.deepEqual(availableOpponentSpecies(createBattleState(),'tag'),[]);
 assert.deepEqual(availableOpponentSpecies(createBattleState(),'mime').map(s=>s.name),['Mr. Mime']);
});
