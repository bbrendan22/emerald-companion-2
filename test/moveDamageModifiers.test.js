import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {battleMove} from '../src/battle/reference.js';

const mon={level:50,dex:143,types:['WATER'],ability:'Immunity',item:'None',status:'none',
 stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100}};
const calc=(name,a=mon,d=mon,weather='none',critical=false)=>calculateCoreDamage(battleMove(name),a,d,weather,critical);
const rolls=last=>Array.from({length:16},(_,i)=>Math.max(1,Math.floor(last*(85+i)/100)));
// Independent integer examples follow pret/pokeemerald CalculateBaseDamage,
// Cmd_damagecalc and BattleScript_EffectFacade / EffectSmellingsalt.
// Facade: floor(22*70*100/100/50)=30; +2=32; script2 =>64.
// SolarBeam: floor(22*120/50)=52; adverse weather26; +2=28.
// SmellingSalt: floor(22*60/50)=26; +2=28; script2 =>56.
test('Facade checks every attacker status, retains power70 and leaves inputs untouched',()=>{
 for(const status of ['none','burn','poison','toxic','paralysis','sleep','freeze']) {
  const attacker={...mon,status},before=structuredClone(attacker);
  const expected=status==='burn'?34:['poison','toxic','paralysis'].includes(status)?64:32;
  assert.deepEqual(calc('Facade',attacker).rolls,rolls(expected),status);
  assert.deepEqual(attacker,before);
 }
 assert.equal(battleMove('Facade').power,70);
 // Defender status cannot activate Facade.
 assert.deepEqual(calc('Facade',mon,{...mon,status:'paralysis'}).rolls,rolls(32));
});
test('Facade burn, Guts, critical, stages and items preserve Emerald integer ordering',()=>{
 const burn={...mon,status:'burn'};
 assert.deepEqual(calc('Facade',burn).rolls,rolls(34)); //30/2+2=17; script2.
 assert.deepEqual(calc('Facade',burn,mon,'none',true).rolls,rolls(68));
 for(const status of ['burn','poison','toxic','paralysis'])
  assert.deepEqual(calc('Facade',{...mon,ability:'Guts',status}).rolls,rolls(96)); //Atk150;46+2;script2.
 for(const status of ['sleep','freeze'])
  assert.deepEqual(calc('Facade',{...mon,ability:'Guts',status}).rolls,rolls(48)); //Guts only, no Facade.
 const guts={...burn,ability:'Guts'};
 assert.deepEqual(calc('Facade',guts,mon,'none',true).rolls,rolls(192));
 assert.deepEqual(calc('Facade',{...guts,stages:{attack:1}}).rolls,rolls(142)); //Atk225;69+2;script2.
 assert.deepEqual(calc('Facade',{...guts,stages:{attack:-2}}, {...mon,stages:{defense:2}},'none',true).rolls,rolls(192));
 assert.deepEqual(calc('Facade',{...mon,status:'poison',item:'Silk Scarf'}).rolls,rolls(70)); //Atk110;33+2;script2.
 assert.deepEqual(calc('Facade',{...guts,item:'Choice Band'}).rolls,rolls(142)); //Atk100->150->225.
 assert.deepEqual(calc('Facade',{...mon,status:'poison',types:['NORMAL']}).rolls,rolls(96));
 // Odd subtotal: Lv50 Atk101 vsDef103:30;burn15;+2=17;crit2;script2;STAB102;Rock51.
 const odd={...burn,types:['NORMAL'],stats:{...mon.stats,attack:101}};
 assert.deepEqual(calc('Facade',odd,{...mon,types:['ROCK'],stats:{...mon.stats,defense:103}},'none',true).rolls,rolls(51));
 // Doubling power would lose the doubled +2: it is observably different.
 const doubledPower=calculateCoreDamage({...battleMove('Tackle'),power:140},mon,mon);
 assert.notDeepEqual(calc('Facade',{...mon,status:'poison'}).rolls,doubledPower.rolls);
 const tiny={...burn,level:1,stats:{...mon.stats,attack:1}};
 assert.deepEqual(calc('Facade',tiny,{...mon,stats:{...mon.stats,defense:999}}).rolls,rolls(6));
});
test('SolarBeam halves subtotal only in rain/sand/hail, before +2, critical and STAB',()=>{
 for(const weather of ['none','sun','rain','sand','hail']) {
  const expected=['rain','sand','hail'].includes(weather)?28:54;
  assert.deepEqual(calc('SolarBeam',mon,mon,weather).rolls,rolls(expected*2),weather);
 }
 const grass={...mon,types:['GRASS']};
 // Odd subtotal: SpA101 vsSpD103 =>51;half25;+2=27;crit54;STAB81;Water162.
 const odd={...grass,stats:{...mon.stats,spAttack:101}};
 const d={...mon,stats:{...mon.stats,spDefense:103}};
 for(const weather of ['rain','sand','hail'])
  assert.deepEqual(calc('SolarBeam',odd,d,weather,true).rolls,rolls(162));
 assert.equal(calc('SolarBeam',{...mon,item:'Miracle Seed'},mon,'rain').base,31); //SpA110;58/2+2=31.
 assert.equal(calc('SolarBeam',{...mon,stages:{spAttack:1}},mon,'rain').base,41); //79/2+2.
 const tiny={...mon,level:1,stats:{...mon.stats,spAttack:1}};
 assert.equal(calc('SolarBeam',tiny,mon,'rain').base,2);
 assert.equal(battleMove('SolarBeam').power,120);
});
test('SmellingSalt uses defender paralysis only, doubles after +2 and does not cure',()=>{
 for(const status of ['none','burn','poison','toxic','paralysis','sleep','freeze']) {
  const defender={...mon,status},before=structuredClone(defender);
  assert.deepEqual(calc('SmellingSalt',mon,defender).rolls,rolls(status==='paralysis'?56:28),status);
  assert.deepEqual(defender,before);
 }
 assert.deepEqual(calc('SmellingSalt',{...mon,status:'paralysis'}).rolls,rolls(28));
 const paralyzed={...mon,status:'paralysis'};
 assert.deepEqual(calc('SmellingSalt',{...mon,types:['NORMAL']},paralyzed,'none',true).rolls,rolls(168));
 assert.deepEqual(calc('SmellingSalt',{...mon,item:'Choice Band'},paralyzed).rolls,rolls(82)); //39+2;script2.
 assert.equal(battleMove('SmellingSalt').power,60);
 for(const name of ['Facade','SmellingSalt'])
  assert.deepEqual(calc(name,{...mon,status:'poison'},{...paralyzed,types:['GHOST']}).rolls,Array(16).fill(0));
});
test('both directions read the active attacker and defender; scenario arrays group exactly',()=>{
 const player={...mon,status:'poison'},enemy={...mon,status:'paralysis',stats:{...mon.stats,attack:150,defense:120,spAttack:150}};
 assert.deepEqual(calc('Facade',player,enemy).rolls,rolls(54)); //25+2;script2.
 assert.deepEqual(calc('Facade',enemy,player).rolls,rolls(96)); //46+2;script2.
 assert.deepEqual(calc('SmellingSalt',player,enemy).rolls,rolls(48)); //22+2;script2.
 assert.deepEqual(calc('SmellingSalt',enemy,player).rolls,rolls(41)); //39+2;no script.
 assert.equal(calc('SolarBeam',player,enemy,'rain').base,28);
 assert.equal(calc('SolarBeam',enemy,player,'rain').base,41);
 const uncertain={...mon,status:'burn',abilityOptions:{status:'uncertain',source:'species',values:['Guts','Swarm']}};
 const scenarios=calculateAbilityScenarios(battleMove('Facade'),uncertain,mon);
 assert.equal(scenarios.groups.length,2);
 assert.deepEqual(scenarios.groups.map(g=>g.rolls),[rolls(96),rolls(34)]);
 const defense={...mon,abilityOptions:{status:'uncertain',source:'species',values:['Immunity','Thick Fat']}};
 const grouped=calculateAbilityScenarios(battleMove('SmellingSalt'),mon,{...defense,status:'paralysis'});
 assert.equal(grouped.groups.length,1);assert.equal(grouped.groups[0].scenarios.length,2);
 assert.deepEqual(grouped.groups[0].rolls,rolls(56));
});
