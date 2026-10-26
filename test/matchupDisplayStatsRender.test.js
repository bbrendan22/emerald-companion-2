import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {createBattleState,battleReducer} from '../src/battle/battleState.js';
import {speciesByName} from '../src/battle/reference.js';

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
  html=render();assert.equal(stat(html,'attack'),'302');assert.equal(stat(html,'defense'),'67');assert.equal(stat(html,'hp'),'80/201');
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
