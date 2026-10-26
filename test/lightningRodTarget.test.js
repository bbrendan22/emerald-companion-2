import test from 'node:test';
import assert from 'node:assert/strict';
import {isLightningRodEligible,resolveLightningRodTarget} from '../src/battle/lightningRodTarget.js';
import {calculateAbilityScenarios} from '../src/battle/abilityScenarios.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {battleMove,speciesByName} from '../src/battle/reference.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage,frontierAbilityResults} from '../src/battle/frontierDamageAggregation.js';
import {frontierDamageDisplayParts} from '../src/battle/frontierDamagePresentation.js';
import {battleReducer as reduce} from '../src/battle/battleState.js';
import {possibleMatchupSets,analysisMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {alexasState,swampert} from './fixtures/alexasAerodactyl.js';
const options=ability=>({status:'known',source:'test',values:[ability]});
const base={name:'Attacker',identity:'a',dex:143,level:50,types:['NORMAL'],ability:'Immunity',abilityOptions:options('Immunity'),item:'None',currentHp:200,status:'none',stats:{hp:200,attack:100,defense:100,spAttack:100,spDefense:100,speed:100}};
const mon=(ability,extra={})=>({...base,ability,abilityOptions:options(ability),...extra});
const slot=pokemon=>pokemon?{pokemon,liveness:pokemon.currentHp===0?'fainted':'active'}:null;
const victim=mon('Immunity',{name:'Selected',identity:'selected',stats:{...base.stats,hp:250,spDefense:200}});
const rod=mon('Lightning Rod',{name:'Manectric',identity:'rod',dex:310,types:['ELECTRIC'],item:'Leftovers',currentHp:75,status:'burn',stages:{spDefense:1},stats:{...base.stats,hp:150,spDefense:80}});
const context=(other=rod,d=victim,ally=mon('Immunity'))=>({format:'Doubles',defenderSideAlive:2,battlefield:{player:[slot(base),slot(ally)],enemy:[slot(d),slot(other)],viewed:{player:0,opponent:0},attacking:{side:'player',slot:0},defending:{side:'enemy',slot:0}}});
const scenarios=(move,ctx,a=base,d=victim)=>calculateAbilityScenarios(typeof move==='string'?battleMove(move):move,a,d,{battleContext:ctx});

test('exact canonical Emerald Electric eligibility includes Thunder Wave and excludes Charge and Electric Hidden Power',()=>{
 const moves=Array.from({length:354},(_,i)=>battleMove(i+1));
 assert.deepEqual(moves.filter(isLightningRodEligible).map(move=>move.id),[9,84,85,86,87,192,209,344,351]);
 for(const name of ['Thunderbolt','Thunder Wave','Shock Wave'])assert.equal(isLightningRodEligible(battleMove(name)),true);
 for(const name of ['Charge','Hidden Power','Weather Ball','Surf','Earthquake'])assert.equal(isLightningRodEligible(battleMove(name)),false);
 assert.equal(isLightningRodEligible({...battleMove('Hidden Power'),type:'ELECTRIC'}),false);
 assert.equal(isLightningRodEligible({...battleMove('Charge'),power:100,target:'MOVE_TARGET_SELECTED'}),false);
});

test('known unviewed Lightning Rod uses its exact target model and ordinary Gen 3 damage, without immunity or stat boosts',()=>{
 const ctx=context(),before=structuredClone({ctx,base,victim,rod});
 const result=scenarios('Thunderbolt',ctx);
 assert.equal(result.scenarios.length,1);const scenario=result.scenarios[0];
 assert.equal(scenario.target.status,'redirected');assert.equal(scenario.target.slot,1);assert.equal(scenario.target.pokemon.name,'Manectric');
 assert.equal(scenario.availability,'available');assert.ok(scenario.max>0,'Electric Lightning Rod holder takes ordinary resisted damage');
 assert.deepEqual(scenario.result,calculateCoreDamage(battleMove('Thunderbolt'),base,rod,'none',false,{format:'Doubles',defenderSideAlive:2}));
 assert.notEqual(scenario.max,calculateCoreDamage(battleMove('Thunderbolt'),base,victim).max);
 assert.equal(scenario.target.pokemon.stats.spAttack,100);assert.equal(scenario.target.pokemon.currentHp,75);
 assert.deepEqual({ctx,base,victim,rod},before);
});

test('attacking-side holders cannot redirect; a selected holder stays selected even with multiple holders and different Speed',()=>{
 assert.equal(resolveLightningRodTarget(battleMove('Thunderbolt'),base,victim,context(mon('Immunity'),victim,rod)).status,'selected');
 const selected=mon('Lightning Rod',{name:'Selected holder',stats:{...base.stats,speed:1}});
 const result=resolveLightningRodTarget(battleMove('Thunderbolt'),base,selected,context({...rod,stats:{...rod.stats,speed:999}},selected,rod));
 assert.equal(result.status,'selected');assert.equal(result.slot,0,'no fastest-holder substitution for an already selected holder');
});

test('explicit empty slots do not redirect; missing records stay uncertain while unresolved Trace is neutral; fainted holders are retained',()=>{
 let result=scenarios('Thunderbolt',context(null));
 assert.equal(result.scenarios[0].target.status,'selected');assert.ok(result.scenarios[0].result.rolls);
 const unknown=context();delete unknown.battlefield.enemy[1];
 result=scenarios('Thunderbolt',unknown);
 assert.equal(result.scenarios[0].reason,'unknown-lightning-rod-target');assert.equal(result.scenarios[0].result.rolls,undefined);
 result=scenarios('Thunderbolt',context({...rod,currentHp:0}));
 assert.equal(result.scenarios[0].target.status,'redirected');assert.equal(result.scenarios[0].reason,'lightning-rod-fainted-target');
 result=scenarios('Thunderbolt',context(mon('Trace')));assert.equal(result.scenarios[0].availability,'available');assert.equal(result.scenarios[0].target.status,'selected');
 result=scenarios('Thunderbolt',context(mon('Trace',{copiedAbility:'Lightning Rod',name:'Copied holder'})));
 assert.equal(result.scenarios[0].target.status,'redirected');assert.ok(result.scenarios[0].max>0);
 const missing={...context(),battlefield:{...context().battlefield,enemy:[slot(victim),{pokemon:null,liveness:'active'}]}};
 assert.equal(scenarios('Thunderbolt',missing).scenarios[0].target.status,'unresolved');
 assert.equal(scenarios('Thunderbolt',context(null,rod),base,rod).scenarios[0].target.status,'selected');
 assert.equal(scenarios('Thunderbolt',context({...rod,currentHp:999})).scenarios[0].reason,'invalid-redirected-target-data');
 const allied=context();allied.battlefield.defending={side:'player',slot:1};
 assert.equal(scenarios('Thunderbolt',allied).scenarios[0].reason,'unsupported-lightning-rod-target-position');
});

test('unknown legal hidden abilities produce distinct normal and redirected outcomes, with no assumed ability',()=>{
 const uncertain={...rod,ability:'Lightning Rod / Static',abilityOptions:{status:'uncertain',source:'species',values:['Lightning Rod','Static']}};
 const result=scenarios('Thunderbolt',context(uncertain));
 assert.deepEqual(result.scenarios.map(s=>s.target.status),['redirected','selected']);
 assert.ok(result.scenarios.every(s=>s.availability==='available'));
 assert.equal(result.groups.length,2);
 assert.equal(scenarios('Ice Beam',context(uncertain)).scenarios.length,1,'irrelevant moves do not multiply target scenarios');
});

test('targeting is independent of the viewed pairing and works in reverse attack direction',()=>{
 const models=[base,mon('Lightning Rod',{name:'Player holder'}),victim,rod];
 for(const direction of ['player','enemy'])for(const player of [0,1])for(const enemy of [0,1]) {
  const attackingSide=direction,defendingSide=direction==='player'?'enemy':'player',a=models[direction==='player'?player:enemy+2],d=models[direction==='player'?enemy+2:player];
  const ctx=context(rod,victim,models[1]);ctx.battlefield.viewed={player,opponent:enemy};
  ctx.battlefield.attacking={side:attackingSide,slot:direction==='player'?player:enemy};ctx.battlefield.defending={side:defendingSide,slot:direction==='player'?enemy:player};
  const result=scenarios('Thunderbolt',ctx,a,d).scenarios[0];
  assert.equal(result.target.side,defendingSide);assert.equal(result.target.slot,1);
  assert.equal(result.target.status,(direction==='player'?enemy:player)===1?'selected':'redirected');
 }
});

function stateWithRod() {
 let s=alexasState('Doubles');
 s=reduce(s,{type:'selectDoublesOpponent',slot:1,speciesId:speciesByName.get('rhydon').internalSpeciesId});
 s=reduce(s,{type:'viewDoublesSlot',side:'opponent',slot:1});
 s=reduce(s,{type:'observeOpponentAbility',slot:1,speciesId:s.opponentSpecies[1],value:'Lightning Rod'});
 return reduce(s,{type:'viewDoublesSlot',side:'opponent',slot:0});
}
const evaluate=(s,move='Thunderbolt',player=swampert)=>evaluateFrontierCandidates(s,player,battleMove(move),{records:[player]});

test('candidate integration uses the redirected canonical set/HP for damage percentages and KO, preserving observations',()=>{
 let s=stateWithRod();const before=s.opponentObservations;
 const projected={...s,matchup:{...s.matchup,opponent:s.opponentSpecies[1]}};
 const set=possibleMatchupSets(projected).at(-1);s=reduce(s,{type:'selectOpponentSet',slot:1,setId:frontierSetId(set)});
 const result=evaluate(s),summary=aggregateFrontierDamage(result);
 for(const branch of summary.branches) {
  assert.equal(branch.target.pokemon.setId,frontierSetId(set));assert.equal(branch.target.slot,1);
  assert.equal(branch.defenderMaximumHp,branch.target.pokemon.stats.hp);assert.equal(branch.defenderCurrentHp,branch.target.pokemon.currentHp);
  assert.equal(branch.min,0,'Rhydon is immune through Ground typing, not Lightning Rod');
 }
 const parts=frontierDamageDisplayParts(summary);assert.match(parts.targetMessage,/redirects to Rhydon .*Slot 2/);
 assert.equal(parts.hp,'0–0 HP damage');assert.equal(s.opponentObservations,before);
 const knownMove=analysisMatchupSets(s)[0].moves[0];assert.ok(knownMove);
});

test('uncertain target rows never combine damage or KO chances for different Pokémon',()=>{
 let s=stateWithRod();s=reduce(s,{type:'viewDoublesSlot',side:'opponent',slot:1});
 s=reduce(s,{type:'observeOpponentAbility',slot:1,speciesId:s.opponentSpecies[1],value:''});s=reduce(s,{type:'viewDoublesSlot',side:'opponent',slot:0});
 const summary=aggregateFrontierDamage(evaluate(s)),rows=frontierAbilityResults(summary);
 assert.equal(summary.kind,'target-alternatives');assert.equal(summary.hp,null);assert.equal(summary.percentage,null);
 assert.equal(summary.ko.availability,'unavailable');
 assert.equal(rows.length,2);assert.ok(rows.some(row=>/Lightning Rod → Rhydon/.test(row.label)));
 assert.ok(rows.some(row=>/Selected target: Aerodactyl/.test(row.label)));
 for(const row of rows) {
  const targets=new Set(row.summary.branches.map(branch=>branch.target.slot));assert.equal(targets.size,1);
  assert.ok(frontierDamageDisplayParts(row.summary).targetMessage);
 }
 assert.equal(frontierDamageDisplayParts(summary).percentage,undefined,'no cross-target envelope in presentation');
});

test('eligible status targeting remains separate from damage and Singles keeps ordinary damage behavior',()=>{
 const s=stateWithRod(),status=aggregateFrontierDamage(evaluate(s,'Thunder Wave'));
 assert.equal(status.kind,'status');assert.match(frontierDamageDisplayParts(status).targetMessage,/redirects to Rhydon/);
 const singles=alexasState(),result=evaluate(singles);
 assert.ok(result.evaluations[0].abilityDamage.scenarios.every(s=>!s.target));
 const direct=calculateAbilityScenarios(battleMove('Thunderbolt'),base,victim,{battleContext:{format:'Singles',battlefield:context().battlefield}});
 assert.equal(direct.scenarios[0].target,undefined);
 assert.deepEqual(direct.scenarios[0].result,calculateCoreDamage(battleMove('Thunderbolt'),base,victim));
});

test('redirected Plus/Minus checks retain the original selected defender ability as correlated hidden field evidence',()=>{
 const a=mon('Plus'),d=mon('Trace',{name:'Selected Trace',copiedAbility:'Minus',abilityOptions:{status:'uncertain',source:'species',values:['Trace','Synchronize']}});
 const ctx=context(rod,d);ctx.battlefield.player[0]=slot(a);
 const result=scenarios('Thunderbolt',ctx,a,d);
 assert.ok(result.scenarios.every(s=>s.target.status==='redirected'&&s.availability==='available'));
 assert.ok(result.scenarios[0].max>result.scenarios[1].max);
});

test('actual popup rendering identifies redirected and uncertain targets before damage numbers',async()=>{
 const {createServer}=await import('vite');const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
 try {
  const {default:Preview}=await server.ssrLoadModule('/src/ui/components/BasicDamagePreview.jsx');
  const render=(state,move='Thunderbolt')=>renderToStaticMarkup(React.createElement(Preview,{move:battleMove(move),frontierDamage:aggregateFrontierDamage(evaluate(state,move)),showUnavailable:true}));
  let s=stateWithRod();let html=render(s);
  assert.match(html,/Lightning Rod redirects to Rhydon/);
  assert.ok(html.indexOf('Lightning Rod redirects')<html.indexOf('battle-core-damage-percent'));
  s=reduce(s,{type:'viewDoublesSlot',side:'opponent',slot:1});
  s=reduce(s,{type:'observeOpponentAbility',slot:1,speciesId:s.opponentSpecies[1],value:''});s=reduce(s,{type:'viewDoublesSlot',side:'opponent',slot:0});
  html=render(s);assert.match(html,/Target: Aerodactyl/);assert.match(html,/redirects to Rhydon/);
  html=render(stateWithRod(),'Thunder Wave');assert.match(html,/Lightning Rod redirects to Rhydon/);assert.doesNotMatch(html,/HP damage|battle-core-damage-percent/);
  const scalar=scenarios('Thunderbolt',context());
  html=renderToStaticMarkup(React.createElement(Preview,{move:battleMove('Thunderbolt'),attacker:base,defender:victim,abilityDamage:scalar,showUnavailable:true}));
  assert.match(html,/Lightning Rod redirects to Manectric/);
 } finally {await server.close();}
});
