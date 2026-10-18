import test from 'node:test';
import assert from 'node:assert/strict';
import {fields,hiddenPowerTypes,recommendedIVs,emptyIVs,validIV,liveHiddenPower} from '../src/resources/calculators/hiddenPowerCalculator.js';
import {calculateHiddenPower} from '../src/battle/hiddenPower.js';
test('blank, partial, complete, and invalid live inputs',()=>{
 assert.equal(liveHiddenPower(emptyIVs()),null);
 assert.deepEqual(liveHiddenPower({...emptyIVs(),hp:'0'}),{type:'Fighting',power:30,preview:true});
 assert.deepEqual(liveHiddenPower({...emptyIVs(),speed:'1'}),{type:'Flying',power:30,preview:true});
 assert.deepEqual(liveHiddenPower(Object.fromEntries(fields.map(([k])=>[k,'31']))),{type:'Dark',power:70,preview:false});
 for(const value of ['-1','32','1.5','abc',' ','1e1']) {assert.equal(validIV(value),false);assert.equal(liveHiddenPower({...emptyIVs(),hp:value}),null);}
 for(const value of ['', '0','31']) assert.equal(validIV(value),true);
});
test('exact supplied reference values in application display order and independently checked type/power',()=>{
 const expected={bug:[31,31,31,31,30,30],dark:[31,31,31,31,31,31],dragon:[30,31,31,31,31,31],electric:[31,31,31,30,31,31],fighting:[31,31,30,30,30,30],fire:[31,30,31,30,31,30],flying:[31,31,31,30,30,30],ghost:[31,30,31,31,30,31],grass:[30,31,31,30,31,31],ground:[31,31,31,30,30,31],ice:[31,31,31,31,31,30],poison:[31,31,30,30,30,31],psychic:[30,31,31,31,31,30],rock:[31,31,30,31,30,30],steel:[31,31,31,31,30,31],water:[31,31,31,30,31,30]};
 assert.deepEqual(fields.map(([k])=>k),['hp','attack','defense','spAttack','spDefense','speed']);
 assert.deepEqual(hiddenPowerTypes,['fighting','flying','poison','ground','rock','bug','steel','ghost','fire','water','grass','electric','psychic','ice','dragon','dark']);
 assert.equal(Object.keys(recommendedIVs).length,16);
 for(const [type,values] of Object.entries(expected)) {
  assert.deepEqual(fields.map(([k])=>recommendedIVs[type][k]),values,type);
  assert.deepEqual(calculateHiddenPower(recommendedIVs[type]),{type:type[0].toUpperCase()+type.slice(1),power:70});
 }
});
