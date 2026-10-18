import test from 'node:test';
import assert from 'node:assert/strict';
import {damageDisplayParts,damagePercentageColor} from '../src/battle/damagePresentation.js';
import {basicDamageScenarios,calculateBasicDamage} from '../src/battle/basicDamage.js';
import {battleMove} from '../src/battle/reference.js';
test('raw maximum50/minimum100 boundaries and zero damage select exactly four colors',()=>{
 for(const [min,max,maximumHp,color] of [[0,0,200,'red'],[1,99,200,'white'],[85,100,200,'amber'],[190,210,200,'amber'],[200,200,200,'green'],[201,230,200,'green'],[0,1,200,'white']]){
  assert.equal(damagePercentageColor({min,max,maximumHp,currentHp:1}),color);
 }
});
test('rounded percentages never determine color; presentation preserves exact text/order',()=>{
 // Larger synthetic display-only HP denominators isolate one-decimal rounding.
 assert.deepEqual(damageDisplayParts({min:900,max:1000,maximumHp:2001}),{percentage:'45.0–50.0%',hp:'900–1000 HP',color:'white'});
 assert.deepEqual(damageDisplayParts({min:2000,max:2100,maximumHp:2001}),{percentage:'100.0–104.9%',hp:'2000–2100 HP',color:'amber'});
 assert.deepEqual(damageDisplayParts({min:0,max:0,maximumHp:151}),{percentage:'0.0%',hp:'0 HP',color:'red'});
 assert.deepEqual(damageDisplayParts({fixed:true,min:50,max:50,maximumHp:100}),{percentage:'50.0%',hp:'50 HP',color:'amber'});
});
test('ability scenarios classify independently; Focus Band does not change raw damage or imply KO',()=>{
 const a={level:50,types:['NORMAL'],stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
 const d={...a,stats:{...a.stats,hp:120},ability:'Thick Fat / Immunity'};
 const groups=basicDamageScenarios(battleMove('Flamethrower'),a,d);
 assert.deepEqual(groups.map(g=>[g.label,damagePercentageColor(g.result)]),[['Thick Fat','white'],['Immunity','white']]);
 const hp50={...d,stats:{...d.stats,hp:50}};
 assert.deepEqual(basicDamageScenarios(battleMove('Flamethrower'),a,hp50).map(g=>[g.label,damagePercentageColor(g.result)]),[['Thick Fat','white'],['Immunity','amber']]);
 const target={...a,types:['ROCK','GROUND'],item:'Focus Band',stats:{...a.stats,hp:100}};
 const r=calculateBasicDamage(battleMove('Surf'),{...a,types:['WATER']},target);
 assert.equal(damagePercentageColor(r),'green');assert.deepEqual(Object.keys(damageDisplayParts(r)).sort(),['color','hp','percentage']);
});
