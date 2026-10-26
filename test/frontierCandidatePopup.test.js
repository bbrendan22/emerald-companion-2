import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {alexasState,swampert,alexasInputs,observe} from './fixtures/alexasAerodactyl.js';
import {battleReducer} from '../src/battle/battleState.js';
import {battleMove} from '../src/battle/reference.js';

const choose=(state,setId)=>battleReducer(state,{type:'selectOpponentSet',setId});

test('actual move popup integrates candidates and retains the standalone scalar path and move policies',async t=>{
 const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
  const {default:Popup}=await server.ssrLoadModule('/src/ui/components/BattleMoveDetails.jsx');
 const {towerSetById}=await server.ssrLoadModule('/src/battle/towerSets.js');
  const render=(name,state=alexasState(),extra={})=>{
   const {player,opponent}=alexasInputs(state);
   return renderToStaticMarkup(React.createElement(Popup,{move:battleMove(name),attacker:player,defender:opponent,
    frontierState:state,frontierPlayer:swampert,frontierDirection:'player',onClose:()=>{},...extra}));
  };
  await t.test('selected canonical matchup displays its exact HP denominator and damage range',()=>{
   for(const format of ['Singles','Doubles'])for(const [setId,percentage] of [
    ['Aerodactyl 1','40.3% – 47.7%'],['Aerodactyl 2','40.3% – 47.7%'],
    ['Aerodactyl 3','45.8% – 54.2%'],['Aerodactyl 4','45.8% – 54.2%'],
   ]) {
    const state=choose(alexasState(format),setId),html=render('Ice Beam',state);
    assert.ok(html.includes(percentage));assert.match(html,/71–84 HP damage/);
    assert.doesNotMatch(html,/Across .* possible sets/);assert.doesNotMatch(html,/battle-damage-unavailable/);
    assert.ok(html.indexOf('battle-core-damage-percent')>=0);
    assert.ok(html.indexOf('battle-core-damage-percent')<html.indexOf('battle-core-damage-hp'));
   }
   for(const format of ['Singles','Doubles'])for(const [setId,percentage,hp] of [
    ['Aerodactyl 2','50.0% – 59.4%','90–107 HP damage'],['Aerodactyl 4','33.3% – 39.4%','60–71 HP damage'],
   ]) {
    const state=choose(alexasState(format),setId),{player,opponent}=alexasInputs(state);
    const html=render('Earthquake',state,{attacker:opponent,defender:player,frontierDirection:'enemy'});
    assert.ok(html.includes(percentage));assert.ok(html.includes(hp));
    assert.doesNotMatch(html,/battle-damage-unavailable/);
   }
  });
  await t.test('applicable incomplete and zero results cannot fall back to scalar numbers',()=>{
   for(const format of ['Singles','Doubles']) {
    const state=choose(alexasState(format),'Aerodactyl 3');
    state.matchupConditions.enemy[0]={currentHp:160,status:'none',stages:{}};
    // Supply a valid standalone defender to catch accidental numerical fallback.
    const defender=alexasInputs(alexasState()).opponent;
    const invalid=render('Ice Beam',state,{defender});
    assert.match(invalid,/Entered HP is invalid/);assert.doesNotMatch(invalid,/battle-core-damage-percent/);
    const zero=render('Ice Beam',{...alexasState(format),opponentObservations:{0:{moves:['Surf','','',''],item:''}}},{defender});
    assert.match(zero,/No matching Frontier sets/);assert.doesNotMatch(zero,/battle-core-damage-percent/);
    const trace=render('Ice Beam',alexasState(format),{defender,frontierPlayer:{...swampert,name:'Gardevoir',dex:282,ability:'Trace'}});
    assert.match(trace,/Select the copied ability for Trace/);assert.doesNotMatch(trace,/battle-core-damage-percent/);
    const selected=choose(alexasState(format),'Aerodactyl 4'),set=towerSetById('Aerodactyl 4'),previous=set.item;
    try {
     set.item=null;
     const corrupt=render('Ice Beam',selected,{defender});
     assert.match(corrupt,/missing or invalid item data/);assert.doesNotMatch(corrupt,/battle-core-damage-percent/);
    } finally {set.item=previous;}
   }
  });
  await t.test('unsupported, status and OHKO presentation remains categorical',()=>{
   assert.match(render('Counter'),/requires special battle-state handling/);
   assert.match(render('Roar'),/Move effect/);assert.doesNotMatch(render('Roar'),/battle-core-damage-percent/);
   assert.match(render('Guillotine',alexasState(),{frontierPlayer:{...swampert,level:50}}),/>OHKO</);
  });
  await t.test('standalone scalar path stays available with no Frontier context',()=>{
   const state=observe(alexasState(),'item','Choice Band');
   const html=render('Ice Beam',state,{frontierState:undefined});
   assert.match(html,/40.3% – 47.7%/);assert.doesNotMatch(html,/Across .* possible sets/);
  });
  await t.test('dynamic metadata comes from candidate branches',()=>{
   const player={...swampert,friendship:255,ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31}};
   assert.match(render('Hidden Power',alexasState(),{frontierPlayer:player}),/<dd>70<\/dd>/);
   assert.match(render('Return',alexasState(),{frontierPlayer:player}),/<dd>102<\/dd>/);
  });
 } finally {await server.close();}
});
