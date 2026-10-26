import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';
import {availableOpponentSpecies} from '../src/battle/opponentSpecies.js';
import {slotConditions} from '../src/battle/matchupConditions.js';
import {analysisMatchupSets,possibleMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {opponentStatRanges} from '../src/battle/opponentStats.js';

test('main matchup renders active condition values and colors only Speed numbers',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try{
  const Matchup=(await vite.ssrLoadModule('/src/ui/components/BattleMatchup.jsx')).default;
  const id=speciesByName.get('ludicolo').internalSpeciesId;
  const player={identity:'kingdra',name:'Kingdra',dex:230,ability:'Swift Swim',item:'Choice Band',level:50,types:['WATER','DRAGON'],stats:{hp:201,attack:101,defense:101,spAttack:101,spDefense:101,speed:120},moves:[]};
  let state={...createBattleState(),selectedTrainer:'Cooltrainer (F):MIRIAM',team:['kingdra'],opponentSpecies:[id],matchup:{player:'kingdra',opponent:id}};
  const render=()=>renderToStaticMarkup(React.createElement(Matchup,{state,records:[player],dispatch:()=>{}}));
  const stat=(html,key,side=0)=>[...html.matchAll(new RegExp(`data-stat="${key}"><dt>[^<]+</dt><dd data-value="([^"]+)"`,'g'))][side]?.[1];
  const before=structuredClone(player);
  let html=render();assert.equal(stat(html,'attack'),'151');assert.equal(stat(html,'speed'),'120');
  assert.equal((html.match(/battle-speed-faster/g)||[]).length,1);assert.equal((html.match(/battle-speed-slower/g)||[]).length,1);
  const change=(field,value,extra={})=>{state=battleReducer(state,{type:'matchupCondition',side:'player',slot:0,field,value,...extra});};
  change('stage',2,{stat:'attack'});change('stage',-1,{stat:'defense'});change('status','burn');change('currentHp',80,{max:201});
  html=render();assert.equal(stat(html,'attack'),'302');assert.equal(stat(html,'defense'),'67');assert.equal(stat(html,'hp'),'201');
  state={...state,field:{...state.field,weather:'rain'}};
  html=render();assert.equal(stat(html,'speed'),'240');
  // Even a possible Swift Swim boost cannot overtake 240 Speed.
  assert.equal((html.match(/battle-speed-faster/g)||[]).length,1);
  change('status','paralysis');html=render();assert.equal(stat(html,'speed'),'60');
  assert.equal((html.match(/battle-speed-faster/g)||[]).length,1);
  change('stage',1,{stat:'speed'});html=render();assert.equal(stat(html,'speed'),'90');
  assert.equal((html.match(/battle-speed-faster/g)||[]).length,0,'overlapping uncertainty removes both colors');
  assert.equal((html.match(/battle-speed-slower/g)||[]).length,0);
  state=battleReducer(state,{type:'resetMatchupConditions'});html=render();assert.equal(stat(html,'attack'),'151');assert.equal(stat(html,'hp'),'201');assert.equal(stat(html,'speed'),'120');
  assert.deepEqual(player,before);
 }finally{await vite.close();}
});

test('rendered Singles and Doubles HP stats and bars ignore current HP for both sides and slots',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
  const Matchup=(await vite.ssrLoadModule('/src/ui/components/BattleMatchup.jsx')).default;
  const records=[214,201].map((hp,index)=>({identity:`player-${index}`,name:'Hariyama',dex:297,ability:'Thick Fat',item:'None',level:50,
   types:['FIGHTING'],stats:{hp,attack:101,defense:101,spAttack:101,spDefense:101,speed:101},moves:[]}));
  for(const format of ['Singles','Doubles']) {
   let state=battleReducer(createBattleState(),{type:'rules',patch:{format}});
   state={...state,selectedTrainer:'Cooltrainer (F):MIRIAM'};
   const species=availableOpponentSpecies(state).slice(0,2).map(mon=>mon.id);
   assert.equal(species.length,2);
   state={...state,team:records.map(mon=>mon.identity),opponentSpecies:species};
   const render=()=>renderToStaticMarkup(React.createElement(Matchup,{state,records,dispatch:()=>{}}));
   const hpCells=html=>[...html.matchAll(/data-stat="hp"><dt>HP<\/dt><dd[\s\S]*?<\/dd>/g)].map(match=>match[0]);
   for(const slot of format==='Doubles'?[0,1]:[0]) {
    state={...state,viewed:{player:slot,opponent:slot},matchup:{player:records[slot].identity,opponent:species[slot]}};
    const baseline=hpCells(render());assert.equal(baseline.length,2);
    assert.ok(baseline[0].includes(`data-value="${records[slot].stats.hp}"`));
    for(const hp of [5,1,37]) {
     for(const side of ['player','enemy'])state=battleReducer(state,{type:'matchupCondition',side,slot,field:'currentHp',value:hp});
     assert.deepEqual(hpCells(render()),baseline,`${format} slot ${slot}: maximum HP values, ranges and bars stay identical`);
     assert.equal(slotConditions(state,'player',slot).currentHp,hp);
     assert.equal(slotConditions(state,'enemy',slot).currentHp,hp);
    }
   }
  }
 } finally {await vite.close();}
});

test('current matchup renders scalar effective stats after ability, Set, condition and Doubles view changes',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
 try {
  const Matchup=(await vite.ssrLoadModule('/src/ui/components/BattleMatchup.jsx')).default;
  const records=[0,1].map(index=>({identity:`kingdra-${index}`,name:'Kingdra',dex:230,ability:'Swift Swim',item:'None',level:50,
   types:['WATER','DRAGON'],stats:{hp:214,attack:100,defense:100,spAttack:100,spDefense:100,speed:120},moves:[]}));
  for(const format of ['Singles','Doubles']) {
   let state={...createBattleState(),rules:{...createBattleState().rules,format,teamSize:format==='Singles'?3:4},selectedTrainer:'Cooltrainer (M):BRADEN'};
   const ludicolo=speciesByName.get('ludicolo').internalSpeciesId;
   const other=availableOpponentSpecies(state).find(mon=>mon.id!==ludicolo).id;
   state={...state,team:records.map(mon=>mon.identity),opponentSpecies:[ludicolo,other],matchup:{player:records[0].identity,opponent:ludicolo}};
   state=battleReducer(state,{type:'conditionField',key:'weather',value:'rain'});
   const values=()=>{
    const html=renderToStaticMarkup(React.createElement(Matchup,{state,records,dispatch:()=>{}}));
    const numbers=[...html.matchAll(/data-value="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(numbers.length,12);assert.ok(numbers.every(value=>/^\d+$/.test(value)||value==='—'));
    return numbers;
   };
   assert.equal(values()[5],'240');
   const rawSpeed=()=>opponentStatRanges(state,analysisMatchupSets(state)).speed.min;
   assert.equal(values()[11],String(rawSpeed()));
   state=battleReducer(state,{type:'observeOpponentAbility',slot:0,speciesId:ludicolo,value:'Swift Swim'});
   assert.equal(values()[11],String(rawSpeed()*2));
   for(const set of possibleMatchupSets(state)) {
    state=battleReducer(state,{type:'selectOpponentSet',slot:0,setId:frontierSetId(set)});
    assert.equal(values()[11],String(rawSpeed()*2));
   }
   state=battleReducer(state,{type:'matchupCondition',side:'player',slot:0,field:'stage',stat:'speed',value:1});
   assert.equal(values()[5],'360');
   state=battleReducer(state,{type:'conditionField',key:'weather',value:'none'});assert.equal(values()[5],'180');
   if(format==='Doubles') {
    state=battleReducer(state,{type:'viewDoublesSlot',side:'player',slot:1});assert.equal(values()[5],'120');
    state=battleReducer(state,{type:'viewDoublesSlot',side:'opponent',slot:1});values();
    state=battleReducer(state,{type:'viewDoublesSlot',side:'opponent',slot:0});assert.equal(values()[11],String(rawSpeed()));
    state=battleReducer(state,{type:'viewDoublesSlot',side:'player',slot:0});assert.equal(values()[5],'180');
   }
  }
 } finally {await vite.close();}
});
