import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {createBattleState} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';
import {observationChoices,possibleMatchupSets} from '../src/battle/towerSets.js';
test('Observations distinguishes Add item from selected item names without changing evidence or candidates',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {default:Observations}=await server.ssrLoadModule('/src/ui/components/BattleObservations.jsx');
  const id=speciesByName.get('gardevoir').internalSpeciesId;
  for(const format of ['Singles','Doubles']) {
   const base=createBattleState(),state={...base,rules:{...base.rules,format},selectedTrainer:'Cooltrainer (M):VINCE',opponentSpecies:[id],matchup:{player:null,opponent:id}};
   const choices=observationChoices(state,'item',{replace:false}),candidates=possibleMatchupSets(state),before=structuredClone(state);
   const render=s=>renderToStaticMarkup(React.createElement(Observations,{state:s,dispatch:()=>{throw new Error('render must not change evidence');}}));
   const html=render(state);
   assert.match(html,/>Add item<\/span>/);assert.match(html,/<option value=""[^>]*>Add item<\/option>/);
   assert.match(html,/>Add move<\/span>/);assert.doesNotMatch(html,/<option value=""[^>]*>None<\/option>/);
   for(const name of [choices[0],'None','No Item']) {
    const selected={...state,opponentObservations:{0:{moves:['','','',''],item:name}}},selectedBefore=structuredClone(selected);
    const filtered=possibleMatchupSets(selected),result=render(selected);
    assert.ok(result.includes(`>${name}</span>`),name);
    assert.match(result,new RegExp(`<option value="${name}"[^>]*selected=""[^>]*>${name}</option>`));
    assert.deepEqual(selected,selectedBefore);assert.deepEqual(possibleMatchupSets(selected),filtered);
   }
   assert.deepEqual(state,before);assert.deepEqual(observationChoices(state,'item',{replace:false}),choices);assert.deepEqual(possibleMatchupSets(state),candidates);
  }
 } finally {await server.close();}
});
