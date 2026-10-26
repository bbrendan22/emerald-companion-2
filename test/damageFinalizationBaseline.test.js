import test from 'node:test';
import assert from 'node:assert/strict';
import baseline from './fixtures/damageFinalizationBaseline.json' with {type:'json'};
import {battleMove,reference} from '../src/battle/reference.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';

function summarize(r) {
 if(r===null)return null;
 return {kind:r.kind,...(r.kind==='ohko'?{outcome:r.outcome,reason:r.reason}:{}),...(r.rolls?{rolls:r.rolls}:{}),
  ...(r.min!==undefined?{min:r.min,max:r.max}:{}),
  ...(r.damage!==undefined?{outcome:r.outcome,damage:r.damage}:{}),
  ...(r.conditions?{conditions:r.conditions.map(c=>({id:c.id,kind:c.result?.kind,min:c.result?.min,max:c.result?.max}))}:{})};
}

test('finalization inventory covers each real move once: 152 standard, 64 specialized, 138 status',()=>{
 const rows=baseline.moves;
 assert.deepEqual(rows.map(m=>m.id),Array.from({length:354},(_,i)=>i+1));
 assert.equal(battleMove(0),null);
 assert.deepEqual(Object.keys(reference.moves).map(Number).filter(id=>id>0).sort((a,b)=>a-b),rows.map(m=>m.id));
 const counts=Object.fromEntries([...new Set(rows.map(m=>m.category))].map(c=>[c,rows.filter(m=>m.category===c).length]));
 assert.deepEqual(counts,{standard:152,'variable-multi-hit':12,ohko:4,status:138,'ordinary-hit-only':6,'keep-exact':27,unavailable:7,'triple-kick':1,'rollout-ice-ball':2,'fury-cutter':1,present:1,magnitude:1,pursuit:1,revenge:1});
 for(const row of rows){
  const move=battleMove(row.id);
  for(const key of ['name','type','power','effect'])assert.equal(move[key],row[key],`${row.id}: ${key}`);
  if(row.category==='status'){assert.equal(move.power,0);assert.ok(move.description?.trim(),row.name);}
 }
});

test('all 354 moves match the baseline with the approved Step 4 OHKO additions',()=>{
 for(const row of baseline.moves)
  assert.deepEqual(summarize(calculateCoreDamage(battleMove(row.id),baseline.mon,baseline.mon)),row.baseline,row.name);
});

test('all 152 standard moves match independently computed neutral Gen III rolls through core and ability presentation',()=>{
 // Literal neutral fixture arithmetic: level50, offensive/defensive stats100,
 // no items, weather, stages, screens, critical or modifying abilities.
 // Against Normal: Fighting x2, Ghost x0; all other types x1.
 for(const row of baseline.moves.filter(m=>m.category==='standard')){
  const base=Math.floor(22*row.power/50)+2;
  const stab=row.type==='NORMAL'?Math.floor(base*3/2):base;
  const typed=row.type==='GHOST'?0:row.type==='FIGHTING'?stab*2:stab;
  const expected=Array.from({length:16},(_,i)=>typed===0?0:Math.max(1,Math.floor(typed*(85+i)/100)));
  const move=battleMove(row.id),result=calculateCoreDamage(move,baseline.mon,baseline.mon);
  assert.equal(result.kind,'standard-damage',row.name);
  assert.deepEqual(result.rolls,expected,row.name);
  const scenarios=calculateAbilityScenarios(move,baseline.mon,baseline.mon);
  assert.equal(scenarios.groups.length,1,row.name);
  assert.equal(scenarios.groups[0].availability,'available',row.name);
  assert.deepEqual(scenarios.groups[0].rolls,expected,row.name);
 }
});
