import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {createServer} from 'vite';
import {renderToStaticMarkup} from 'react-dom/server';
import {battleMove} from '../src/battle/reference.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';

test('Curse has blank icon space at every existing size without changing underlying data',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try{
  const {default:Icon}=await server.ssrLoadModule('/src/ui/components/MoveTypeIcon.jsx');
  const before=structuredClone(battleMove('Curse'));
  for(const size of [14,16,17,18,20,21,22]){
   for(const props of [{type:'MYSTERY'},{type:'mystery'},{type:'???'},{type:'GHOST',moveId:174},{type:'ghost',moveName:'Curse'}]){
    const html=renderToStaticMarkup(React.createElement(Icon,{...props,size}));
    assert.match(html,/<span/);assert.doesNotMatch(html,/<img|src=/);
    assert.match(html,new RegExp(`width:${size}px;height:${size}px`));assert.match(html,/aria-hidden="true"/);
   }
   const normal=renderToStaticMarkup(React.createElement(Icon,{type:'GHOST',moveName:'Shadow Ball',size}));
   assert.match(normal,/types\/icons\/ghost.png/);assert.match(normal,new RegExp(`width="${size}"`));
  }
  assert.equal(before.type,'MYSTERY');assert.deepEqual(battleMove('Curse'),before);
 }finally{await server.close();}
});
test('trainer display cleanup removes parentheses/gender only, preserving identifiers and Anabel labels',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try{
  const {trainerResultText}=await server.ssrLoadModule('/src/ui/components/BattleOpponentTrainerControl.jsx');
  const before=structuredClone(towerTrainerEntries);
  assert.equal(trainerResultText('Cooltrainer (M)'),'Cooltrainer');
  assert.equal(trainerResultText('Triathlete (F swimmer)'),'Triathlete');
  assert.equal(trainerResultText('Swimmer♀'),'Swimmer');
  for(const entry of towerTrainerEntries)assert.doesNotMatch(trainerResultText(`${entry.name} ${entry.trainerClass}`),/[()♂♀]/);
  assert.deepEqual(towerTrainerEntries,before);
 }finally{await server.close();}
});
