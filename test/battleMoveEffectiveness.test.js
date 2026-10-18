import test from 'node:test'
import assert from 'node:assert/strict'
import {battleMoveEffectiveness} from '../src/battle/battleMoveEffectiveness.js'
const target={types:['PSYCHIC']}
const hidden={type:'NORMAL',power:1,effect:'HIDDEN_POWER'}
test('status and special moves use compact symbols',()=>{
 assert.equal(battleMoveEffectiveness({type:'NORMAL',power:0},target).label,'—')
 const result=battleMoveEffectiveness({type:'FIGHTING',power:1,effect:'LEVEL_DAMAGE'},target)
 assert.equal(result.label,'*')
 assert.match(result.explanation,/level/)
})
test('Hidden Power uses complete IVs and preserves unknown IVs',()=>{
 const ivs=Object.fromEntries(['hp','attack','defense','speed','spAttack','spDefense'].map(key=>[key,31]))
 const result=battleMoveEffectiveness(hidden,target,ivs)
 assert.equal(result.type,'DARK')
 assert.equal(result.label,'2×')
 assert.equal(battleMoveEffectiveness(hidden,target,{hp:31}).label,'*')
 assert.equal(battleMoveEffectiveness(hidden,null,ivs).label,'—')
})
test('normal attacks retain immunity and resistance multipliers',()=>{
 assert.equal(battleMoveEffectiveness({type:'NORMAL',power:80},{types:['GHOST']}).label,'0×')
 assert.equal(battleMoveEffectiveness({type:'FIRE',power:80},{types:['WATER','DRAGON']}).label,'.25×')
})
test('defensive immunities apply to regular attacks and known Hidden Power',()=>{
 for(const [type,ability] of [['GROUND','Levitate'],['WATER','Water Absorb'],['ELECTRIC','Volt Absorb'],['FIRE','Flash Fire']])assert.equal(battleMoveEffectiveness({type,power:80},{types:['NORMAL'],ability}).label,'0×')
 assert.equal(battleMoveEffectiveness({type:'NORMAL',name:'Hyper Voice',power:90},{types:['NORMAL'],ability:'Soundproof'}).label,'0×')
 assert.equal(battleMoveEffectiveness({type:'WATER',power:80},{types:['BUG','GHOST'],ability:'Wonder Guard'}).label,'0×')
 assert.equal(battleMoveEffectiveness({type:'FIRE',power:80},{types:['BUG','GHOST'],ability:'Wonder Guard'}).label,'2×')
})
test('multiple possible abilities retain both outcomes and Thick Fat reduction',()=>{
 const result=battleMoveEffectiveness({type:'WATER',power:80},{types:['WATER','GROUND'],ability:'Damp / Water Absorb'})
 assert.equal(result.label,'0/1×');assert.match(result.explanation,/Water Absorb/)
 assert.equal(battleMoveEffectiveness({type:'ICE',power:80},{types:['NORMAL'],ability:'Thick Fat'}).label,'.5×')
 assert.equal(battleMoveEffectiveness({type:'ELECTRIC',power:80},{types:['NORMAL'],ability:'Lightning Rod'}).label,'1×')
})
test('Flash Fire does not activate while frozen in Emerald',()=>{
 assert.equal(battleMoveEffectiveness({type:'FIRE',power:80},{types:['NORMAL'],ability:'Flash Fire',status:'freeze'}).label,'1×')
})
