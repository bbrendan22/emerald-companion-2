import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {searchTowerTrainers,selectedTowerTrainer} from '../src/battle/towerTrainers.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {availableTowerSets,eligibleMatchupSets,analysisMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {activeConditionSlot} from '../src/battle/matchupConditions.js';

const pool=[{identity:'a',name:'Ditto',level:40},{identity:'b',name:'Ditto',level:41}];
const trainerState=state=>battleReducer(state,{type:'opponentTrainer',key:searchTowerTrainers('',{state,format:state.rules.format})[0].key});
test('Singles direct choices reuse actual identities and slot-based matchup/condition contracts',()=>{
 let state=createBattleState();
 state=battleReducer(state,{type:'selectSinglesPlayer',identity:'b',pool});
 assert.deepEqual(state.team,['b']);assert.equal(state.matchup.player,'b');assert.equal(activeConditionSlot(state,'player'),0);
 assert.equal(battleReducer(state,{type:'selectSinglesPlayer',identity:'missing',pool}),state);
 state=trainerState(state);
 const species=availableOpponentSpecies(state)[0];
 state=battleReducer(state,{type:'selectSinglesOpponent',speciesId:species.id});
 assert.equal(state.matchup.opponent,species.id);assert.deepEqual(state.opponentSpecies,[species.id]);assert.equal(activeConditionSlot(state,'enemy'),0);
 const expected=new Set(availableTowerSets(state).filter(set=>set.species.toLowerCase()===species.name.toLowerCase()).map(frontierSetId));
 assert.equal(eligibleMatchupSets(state).length,expected.size);
 state=battleReducer(state,{type:'clearOpponentTrainer'});assert.equal(state.matchup.opponent,null);
 state=battleReducer(state,{type:'rules',patch:{format:'Doubles'}});assert.equal(state.matchup.player,null);
 assert.equal(battleReducer(state,{type:'selectSinglesPlayer',identity:'a',pool}),state);
 state=battleReducer(state,{type:'rules',patch:{format:'Singles'}});assert.equal(state.matchup.player,null);
 state=battleReducer(state,{type:'selectSinglesPlayer',identity:null,pool});assert.equal(state.matchup.player,null);assert.deepEqual(state.team,[]);
});

test('Singles UI uses approved species and native Set controls across rounds, levels and Brain restrictions',async()=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {default:Selection}=await server.ssrLoadModule('/src/ui/components/BattlePokemonSelection.jsx');
  let state=trainerState(createBattleState());
  const cases=[state];
  state=battleReducer(state,{type:'round',value:'1'});cases.push(trainerState(state));
  state=battleReducer(createBattleState(),{type:'rules',patch:{levelMode:'open',openLevel:70}});
  assert.equal(state.rules.levelMode,'open');assert.equal(state.rules.opponentLevel,70);cases.push(trainerState(state));
  for(const key of ['Anabel Silver','Anabel Gold','Expert (M):ALEXAS'])cases.push(battleReducer(createBattleState(),{type:'opponentTrainer',key}));
  const control=(html,label)=>{
   const match=html.match(new RegExp('<select\\b[^>]*aria-label="'+label+'"[^>]*>[\\s\\S]*?</select>'));
   assert.ok(match,`native control: ${label}`);return match[0];
  };
  const render=selected=>renderToStaticMarkup(React.createElement(Selection,{state:selected,frontierPool:pool}));
  const fresh=createBattleState(),gated=control(render(fresh),'Select opponent Pokémon');
  assert.match(gated,/disabled=""/);assert.equal((gated.match(/<option\b/g)??[]).length,1);
  assert.ok(availableOpponentSpecies(fresh).length>0,'helper candidates remain available while UI is gated');
  assert.equal(battleReducer(fresh,{type:'selectSinglesOpponent',speciesId:availableOpponentSpecies(fresh)[0].id}),fresh);
  const covered={multiple:false,singleton:false,brain:false,noMatching:false};
  for(const state of cases) {
   const html=renderToStaticMarkup(React.createElement(Selection,{state,frontierPool:pool,playerTrainer:{name:'Trainer',gender:'female'}}));
   assert.match(html,/may-emerald.png/);assert.doesNotMatch(html,/battle-player-slots|battle-compact-slot|opacity|dialog/);
   assert.match(html,/Ditto · Lv. 40/);assert.match(html,/Ditto · Lv. 41/);
   for(const mon of availableOpponentSpecies(state)) {
    assert.ok(html.includes(`value="${mon.id}">${mon.name}</option>`));
    const selected=battleReducer(state,{type:'selectSinglesOpponent',speciesId:mon.id});
    const candidates=eligibleMatchupSets(selected);
    const selectedHtml=render(selected);
    const speciesControl=control(selectedHtml,'Select opponent Pokémon');
    assert.doesNotMatch(speciesControl,/disabled=""/);
    assert.ok(speciesControl.includes(`value="${mon.id}" selected=""`));
    assert.equal(selected.rules.opponentLevel,state.rules.opponentLevel);
    const trainer=selectedTowerTrainer(selected),selectedSet=analysisMatchupSets(selected)[0];
    assert.ok(selectedSet);assert.equal(selected.selectedOpponentSetId,frontierSetId(candidates[0]));
    if(trainer.symbol) {
     covered.brain=true;assert.equal(candidates.length,1);
     assert.equal(selectedSet.brainSet,`Anabel ${trainer.symbol}`);
     assert.doesNotMatch(selectedHtml,/aria-label="Select opponent set"|aria-label="Opponent set"/);
    } else if(candidates.length===1) {
     covered.singleton=true;
     assert.ok(selectedHtml.includes(`aria-label="Opponent set">Set ${candidates[0].instance}</span>`));
     assert.match(selectedHtml,/battle-set-static/);assert.doesNotMatch(selectedHtml,/aria-label="Select opponent set"/);
    } else {
     covered.multiple=true;
     const setControl=control(selectedHtml,'Select opponent set');assert.doesNotMatch(setControl,/disabled=""/);
     assert.equal((setControl.match(/<option\b/g)??[]).length,candidates.length);
     for(const set of candidates)assert.ok(setControl.includes(`value="${frontierSetId(set)}"`));
     const last=candidates.at(-1),changed=battleReducer(selected,{type:'selectOpponentSet',setId:frontierSetId(last)});
     assert.equal(changed.selectedOpponentSetId,frontierSetId(last));
     assert.ok(control(render(changed),'Select opponent set').includes(`value="${frontierSetId(last)}" selected=""`));
    }
    const impossible={...selected,opponentObservations:{0:{item:'Nonexistent item',moves:['','','','']}}};
    assert.deepEqual(analysisMatchupSets(impossible),[]);
    if(trainer.symbol)assert.doesNotMatch(render(impossible),/aria-label="Select opponent set"|aria-label="Opponent set"/);
    else {
     covered.noMatching=true;
     const noSets=control(render(impossible),'Select opponent set');
     assert.match(noSets,/disabled=""/);assert.match(noSets,/>No matching sets<\/option>/);
     assert.equal((noSets.match(/<option\b/g)??[]).length,1);
     assert.equal(battleReducer(impossible,{type:'selectOpponentSet',setId:frontierSetId(candidates[0])}),impossible);
    }

   }
  }
  assert.deepEqual(covered,{multiple:true,singleton:true,brain:true,noMatching:true});
 } finally {await server.close();}
});
