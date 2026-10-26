import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage,neutralBaseDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';
const mon={level:50,dex:143,types:['NORMAL'],ability:'Immunity',item:'None',currentHp:50,
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const both={...mon,currentHp:150,screens:{reflect:true,lightScreen:true}};
const calc=(name,a=mon,d=mon,w='none',c=false,ctx={})=>calculateCoreDamage(battleMove(name),a,d,w,c,ctx);
const options=values=>({status:values.length===1?'known':'uncertain',source:'species',values});
test('Singles Reflect halves physical subtotal before+2/STAB; Light Screen halves special subtotal',()=>{
 //Strength80:subtotal35;Reflect17;+2=19;STAB28 (not half final55).
 assert.deepEqual([calc('Strength').base,calc('Strength').max],[37,55]);
 assert.deepEqual([calc('Strength',mon,both).base,calc('Strength',mon,both).min,calc('Strength',mon,both).max],[19,23,28]);
 //Surf95:subtotal41;Light Screen20;+2=22.
 assert.deepEqual([calc('Surf').base,calc('Surf',mon,both).base],[43,22]);
 assert.deepEqual(calc('Surf',mon,both).rolls,[18,18,19,19,19,19,20,20,20,20,20,21,21,21,21,22]);
 assert.deepEqual(calc('Strength',mon,{...mon,screens:{lightScreen:true}}),calc('Strength'));
 assert.deepEqual(calc('Surf',mon,{...mon,screens:{reflect:true}}),calc('Surf'));
 assert.deepEqual(calc('Surf',mon,{...mon,screens:{lightScreen:false}}),calc('Surf'));
 for(const value of [null,'true',1])assert.equal(calc('Surf',mon,{...mon,screens:{lightScreen:value}}),null);
});
test('Gen III type categories select matching screens after dynamic move resolution',()=>{
 assert.equal(calc('Shadow Ball',mon,both).category,'Physical');assert.equal(calc('Shadow Ball',mon,both).base,19);
 assert.equal(calc('Bite',mon,both).category,'Special');assert.equal(calc('Bite',mon,both).base,15);
 const ivs=n=>Object.fromEntries(['hp','attack','defense','speed','spAttack','spDefense'].map(k=>[k,n]));
 assert.equal(calc('Hidden Power',{...mon,ivs:ivs(0)},both).base,8); //Fighting30;13/2+2.
 assert.equal(calc('Hidden Power',{...mon,ivs:ivs(31)},both).base,17); //Dark70;30/2+2.
 assert.equal(calc('Weather Ball',mon,both,'sand').max,26); //Normal formula50 ->screen11+2;Rock script2.
 assert.equal(calc('Weather Ball',mon,both,'sun').max,36); //screen11;sun16;+2;script2.
 assert.equal(calc('Weather Ball',mon,both,'hail').max,26);
});
test('critical hits ignore screens regardless of stage signs, format or unknown active defender count',()=>{
 for(const [aStage,dStage] of [[-2,2],[1,-1],[2,2],[-1,-1]])for(const name of ['Strength','Flamethrower']) {
  const a={...mon,stages:{attack:aStage,spAttack:aStage}},d={...mon,stages:{defense:dStage,spDefense:dStage}};
  assert.deepEqual(calc(name,a,{...d,screens:both.screens},'none',true,{format:'Doubles'}),calc(name,a,d,'none',true));
 }
 assert.equal(calc('Strength',mon,both,'none',true).max,111); //base37;crit74;STAB111.
 assert.equal(calc('Strength',{...mon,stages:{attack:1}},{...both,stages:{defense:-1}},'none',true).base,82);
 assert.equal(calc('Strength',mon,both,'none',false).max,28);
});
test('exact Doubles ordering is2*floor(subtotal/3); one active defender retains Singles halving',()=>{
 //Strength subtotal35:two active =>2*11+2=24;STAB36. floor(2*35/3)+2 would be25.
 const two=calc('Strength',mon,both,'none',false,{format:'Doubles',defenderSideAlive:2});
 assert.deepEqual([two.base,two.max],[24,36]);
 assert.deepEqual(calc('Strength',mon,both,'none',false,{format:'Doubles',defenderSideAlive:1}),calc('Strength',mon,both));
 assert.equal(calc('Surf',mon,both,'none',false,{format:'Doubles',defenderSideAlive:2}).base,15); //41 -> screen26 -> spread13 -> +2.
 for(const defenderSideAlive of [undefined,null,0,3,1.5,'2'])
  assert.deepEqual(calc('Strength',mon,both,'none',false,{format:'Doubles',defenderSideAlive}),{availability:'unsupported',reason:'unknown-defender-side-count'});
 assert.deepEqual(calc('Strength',mon,mon,'none',false,{format:'Doubles'}),calc('Strength'));
 assert.deepEqual(calc('Strength',mon,{...mon,screens:{lightScreen:true}},'none',false,{format:'Doubles'}),calc('Strength'));
 for(const format of [null,'Unknown'])assert.equal(calc('Strength',mon,both,'none',false,{format}),null);
});
test('screen ordering preserves burn/Guts, weather flooring, defensive abilities and items',()=>{
 assert.equal(calc('Strength',{...mon,status:'burn'},both).base,10); //35->burn17->screen8;+2.
 assert.equal(calc('Strength',{...mon,status:'burn'},both,'none',false,{format:'Doubles',defenderSideAlive:2}).base,12); //35->17->2*floor17/3=10;+2.
 assert.equal(calc('Strength',{...mon,status:'burn',ability:'Guts'},both).base,28); //Atk150 subtotal52;screen26;+2.
 assert.equal(calc('Facade',{...mon,status:'burn'},both).base,9); //subtotal30->burn15->screen7;+2;script2 is later.
 assert.equal(calc('Facade',{...mon,status:'burn'},both).max,27); //9*2*STAB1.5.
 assert.equal(calc('Flamethrower',{...mon,stats:{...mon.stats,spAttack:105}},both,'sun').base,33); //43->screen21->sun31;+2 (weather first would34).
 assert.equal(calc('Surf',mon,both,'rain').base,32);
 assert.equal(calc('SolarBeam',mon,both,'rain').base,15); //52->26->13;+2.
 assert.equal(calc('Strength',mon,{...both,ability:'Marvel Scale',status:'poison'}).base,13); //Defense150 subtotal23->11;+2.
 assert.equal(calc('Strength',mon,{...both,dex:132,ability:'Limber',item:'Metal Powder',transformed:false}).base,10); //Def200 subtotal17->8;+2.
 assert.equal(calc('Surf',mon,{...both,dex:366,ability:'Shell Armor',item:'DeepSeaScale'}).base,12); //SpD200 subtotal20->10;+2.
 assert.equal(calc('Flamethrower',mon,{...both,ability:'Thick Fat'},'sun').base,17); //SpA50 subtotal20->screen10->sun15;+2.
 //Physical minimum-one rule follows the screen, Special subtotal may remain0.
 const tiny={...mon,level:1,stats:{...mon.stats,attack:1,spAttack:1}};
 assert.equal(calc('Strength',tiny,both).base,3);assert.equal(calc('Surf',tiny,both).base,2);
});
test('fixed and HP-based deterministic outcomes never use screens or unknown Doubles counts',()=>{
 for(const name of ['Seismic Toss','Night Shade','Dragon Rage','SonicBoom','Super Fang','Endeavor']) {
  const target={...mon,types:['WATER'],currentHp:150};
  assert.deepEqual(calc(name,mon,{...target,screens:both.screens},'sun',true,{format:'Doubles'}),calc(name,mon,target));
 }
});
test('screens are evaluated per hit before fixed/variable/triple-hit convolution, preserving exact weights',()=>{
 const targets={...both,types:['NORMAL']};
 assert.deepEqual([calc('Double Kick',mon,targets).min,calc('Double Kick',mon,targets).max],[26,32]);
 assert.deepEqual([calc('DoubleSlap',mon,targets).min,calc('DoubleSlap',mon,targets).max],[10,35]);
 assert.deepEqual([calc('Triple Kick',mon,targets).min,calc('Triple Kick',mon,targets).max],[29,36]);
 assert.deepEqual([calc('Icicle Spear',mon,targets).min,calc('Icicle Spear',mon,targets).max],[6,20]);
 for(const name of ['Double Kick','DoubleSlap','Triple Kick','Icicle Spear']) {
  const result=calc(name,mon,targets);
  assert.equal(result.totalOutcomes,calc(name).totalOutcomes);
  assert.equal(result.distribution.reduce((sum,e)=>sum+e.count,0),result.totalOutcomes);
  assert.notDeepEqual(result.distribution,calc(name).distribution);
  assert.deepEqual(calc(name,mon,targets,'none',true).distribution,calc(name,mon,mon,'none',true).distribution);
  assert.equal(calc(name,mon,targets,'none',false,{format:'Doubles'}).availability,'unsupported');
 }
 const triple=calc('Triple Kick',mon,targets);assert.deepEqual(triple.hits.map(h=>h.base),[4,6,8]);
 assert.equal(triple.criticalPolicy,'all-noncritical');
});
test('screen ownership follows the defender in either direction, without mutating either Pokémon',()=>{
 const player={...mon,screens:{reflect:true}},enemy={...mon,stats:{...mon.stats,attack:150},screens:{lightScreen:true}};
 const before=structuredClone({player,enemy});
 assert.equal(calc('Strength',player,enemy).base,37,'attacker Reflect does not protect defender');
 assert.equal(calc('Strength',enemy,player).base,28,'player Reflect protects against incoming physical hit');
 assert.equal(calc('Surf',player,enemy).base,22,'enemy Light Screen protects against outgoing special hit');
 assert.equal(calc('Surf',enemy,player).base,43,'attacker Light Screen never protects defender');
 assert.deepEqual({player,enemy},before);
});
test('Brick Break previews damage after screen removal, including Doubles without a tracked count',()=>{
 const before=structuredClone(both);
 assert.deepEqual(calc('Brick Break',mon,both),calc('Brick Break'));
 assert.deepEqual(calc('Brick Break',mon,both,'none',false,{format:'Doubles'}),calc('Brick Break'));
 assert.deepEqual(both,before,'preview never rewrites conditions or simulates later turns');
 assert.equal(calc('Struggle',mon,both).base,13,'Struggle typecalc bypass does not bypass Reflect');
});
test('ability scenarios retain exact complete screen-adjusted distributions and unsupported Doubles branches',()=>{
 const d={...both,abilityOptions:options(['Immunity','Thick Fat'])};
 const physical=calculateAbilityScenarios(battleMove('Strength'),mon,d);
 assert.equal(physical.groups.length,1);assert.equal(physical.groups[0].scenarios.length,2);
 const special=calculateAbilityScenarios(battleMove('Flamethrower'),mon,d);
 assert.equal(special.groups.length,2);
 const a={...mon,abilityOptions:options(['Immunity','Huge Power'])};
 assert.equal(calculateAbilityScenarios(battleMove('Double Kick'),a,both).groups.length,2);
 const unknown=calculateAbilityScenarios(battleMove('Strength'),mon,d,{battleContext:{format:'Doubles'}});
 assert.equal(unknown.scenarios.length,2);assert.ok(unknown.scenarios.every(s=>s.availability==='unsupported'&&s.reason==='unknown-defender-side-count'));
 const bypass=calculateAbilityScenarios(battleMove('Strength'),mon,d,{critical:true,battleContext:{format:'Doubles'}});
 assert.ok(bypass.groups.every(g=>g.availability==='available'));
 assert.equal(neutralBaseDamage({level:50,power:80,type:'NORMAL',attack:100,defense:100,defenderScreens:{reflect:true}}).base,19);
});
