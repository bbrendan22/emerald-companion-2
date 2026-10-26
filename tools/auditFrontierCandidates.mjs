import {isDeepStrictEqual} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {towerTrainerEntries,towerTrainerSupportsFormat} from '../src/battle/towerTrainers.js';
import {towerSetById,possibleMatchupSets,frontierSetId} from '../src/battle/towerSets.js';
import {battleReducer,createBattleState} from '../src/battle/battleState.js';
import {speciesByName,speciesTypes,battleMove,reference} from '../src/battle/reference.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {ivNatures} from '../src/battle/stats.js';
import {calculateCoreDamage} from '../src/battle/coreDamage.js';
import {evaluateFrontierCandidates} from '../src/battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage} from '../src/battle/frontierDamageAggregation.js';
import {frontierDamageDisplayParts} from '../src/battle/frontierDamagePresentation.js';
import {isUnsupportedSpecialMove} from '../src/battle/moveDamagePolicy.js';
import {fieldAbilityBranches} from '../src/battle/fieldAbilities.js';
import {isLightningRodEligible,resolveLightningRodTarget} from '../src/battle/lightningRodTarget.js';
import {resolveBattleAbility,unresolvedTrace} from '../src/battle/conditionalAbilities.js';
import {resolveConventionalMove} from '../src/battle/dynamicMoves.js';
import {selectedConditionalCase} from '../src/battle/conditionalSelection.js';
import {selectedHitCount} from '../src/battle/multiHitSelection.js';
import {swampert} from '../test/fixtures/alexasAerodactyl.js';

const rawTrainers=new Map(frontierTrainers.map(t=>[`${t.trainerClass}:${t.name}`,t]));
const keys={hp:'hp',attack:'atk',defense:'def',spAttack:'spa',spDefense:'spd',speed:'spe'};
const order=['attack','defense','speed','spAttack','spDefense'];
const knownAbilities=new Set(Object.values(reference.abilityNames).filter(v=>v&&!['None','Cacophony'].includes(v)));
const complete=new Set(['available','immune','blocked','failed','ohko']);
const count=(object,key)=>{object[key]=(object[key]??0)+1;};
export const auditPlayer={...swampert,currentHp:180,status:'none',stages:{},screens:{},friendship:255,
  ivs:{hp:31,attack:31,defense:31,spAttack:31,spDefense:31,speed:31}};
export const auditPartner={...auditPlayer,identity:'audit-partner',name:'Snorlax',dex:143,types:['NORMAL'],ability:'Immunity'};

function brief(value) {
  if(value==null||typeof value!=='object')return String(value).slice(0,160);
  if(Array.isArray(value))return `array(${value.length}) ${value.slice(0,6).map(v=>typeof v==='object'?'object':String(v).slice(0,24)).join(',')}`;
  return JSON.stringify({kind:value.kind,availability:value.availability,reason:value.reason,min:value.min,max:value.max,
    keys:Object.keys(value).slice(0,8)}).slice(0,240);
}
// No assertion objects, canonical diffs, full stack traces, or per-case results retained.
export function createAuditDiagnostics(maxExamples=20) {
  if(!Number.isInteger(maxExamples)||maxExamples<0||maxExamples>64)throw new Error('maxExamples must be 0–64');
  const report={checks:0,mismatchCount:0,mismatchesByCheck:{},examples:[],maxExamples};
  const mismatch=(label,check,actual,expected)=>{
    report.mismatchCount++;
    const key=String(check).slice(0,80);
    count(report.mismatchesByCheck,Object.hasOwn(report.mismatchesByCheck,key)||Object.keys(report.mismatchesByCheck).length<64?key:'other');
    if(report.examples.length<maxExamples)report.examples.push({label:String(label).slice(0,200),check:key,actual:brief(actual),expected:brief(expected)});
  };
  const equal=(actual,expected,check,label)=>{
    report.checks++;
    if(!isDeepStrictEqual(actual,expected))mismatch(label,check,actual,expected);
  };
  return {report,equal,mismatch};
}
export const auditDiagnosticMessage=report=>JSON.stringify({mismatchCount:report.mismatchCount,
  mismatchesByCheck:report.mismatchesByCheck,examples:report.examples});

// Independent stat arithmetic from raw base stats, EVs, nature and trainer/Brain IVs.
// Deliberately does not call frontierSetStats, emeraldStat or either candidate adapter.
function canonicalModel(state,set,slot) {
  const species=speciesByName.get(set.species.toLowerCase());
  const iv=set.brainSet?set.fixedIVs:rawTrainers.get(state.selectedTrainer)?.ivs;
  if(!Number.isInteger(iv))throw new Error('Reference requires verified trainer IVs');
  const level=state.rules.opponentLevel,nature=ivNatures.indexOf(set.nature);
  const stats=Object.fromEntries(Object.entries(keys).map(([key,short])=>{
    const scaled=Math.floor((2*species.baseStats[key]+iv+Math.floor(set.evs[short]/4))*level/100);
    const up=Math.floor(nature/5),down=nature%5;
    const multiplier=up===down?100:order[up]===key?110:order[down]===key?90:100;
    return [key,key==='hp'?(species.nationalDexId===292?1:scaled+level+10):Math.floor((scaled+5)*multiplier/100)];
  }));
  const values=[...new Set(species.abilities.map(id=>reference.abilityNames[id]))].filter(v=>knownAbilities.has(v));
  const observed=state.opponentObservations?.[slot]?.ability;
  const abilities=values.includes(observed)?[observed]:values;
  const abilityOptions={status:abilities.length===1?'known':'uncertain',source:'observation',values:abilities};
  return {setId:frontierSetId(set),id:species.internalSpeciesId,dex:species.nationalDexId,name:species.name,
    level,types:speciesTypes(species.nationalDexId),stats,maximumHp:stats.hp,currentHp:stats.hp,
    ivs:Object.fromEntries(Object.keys(keys).map(k=>[k,iv])),ivProvenance:{value:iv,source:set.brainSet?'brain':'trainer',assumed:false},
    evs:Object.fromEntries(Object.entries(keys).map(([key,short])=>[key,set.evs[short]])),nature:set.nature,item:set.item,
    moves:set.moves.map(battleMove),friendship:set.moves.includes('Frustration')?0:255,
    ability:abilities.join(' / '),abilityOptions,status:'none',stages:{},screens:{}};
}
const defaults=()=>({currentHp:null,status:'none',stages:{},helpingHand:false});
function savedConditions(state,side,slot,field=false) {
  const saved=state.matchupConditions?.[side]?.[slot]??defaults();
  return {...(field?{...defaults(),...saved,currentHp:saved.currentHp??null}:saved),screens:state.matchupSides?.[side]?.screens??{}};
}
function project(mon,c) {
  const abilities=mon.abilityOptions?.values??[mon.ability],context=[...new Set(abilities)].sort().join('|');
  const valid=c.abilityState?.context===context,trace=abilities.includes('Trace');
  const copiedAbility=valid&&trace&&knownAbilities.has(c.abilityState.copiedAbility)?c.abilityState.copiedAbility:null;
  return {...mon,currentHp:c.currentHp===null?mon.stats.hp:c.currentHp,status:c.status,stages:{...c.stages},
    screens:{...c.screens},helpingHand:c.helpingHand,copiedAbility,
    flashFireActivated:Boolean(valid&&(abilities.includes('Flash Fire')||copiedAbility==='Flash Fire')&&c.abilityState.flashFireActivated)};
}
function selectedSource(state,slot) {
  const speciesId=state.opponentSpecies[slot];
  const pool=possibleMatchupSets({...state,matchup:{...state.matchup,opponent:speciesId}});
  const selected=state.rules.format==='Doubles'?state.opponentSetSelections?.[slot]:state.selectedOpponentSetId;
  return pool.find(set=>frontierSetId(set)===selected)??pool[0];
}
// Reconstruct liveness, operands, sides and all four slots from declared state.
// Never consume evaluation.battleContext, projected operands or battlefieldContext().
export function referenceBattle(state,player,records=[player],direction='player',hitCount=null) {
  const p=state.team.indexOf(state.matchup.player),e=state.opponentSpecies.indexOf(state.matchup.opponent);
  const source=selectedSource(state,e),opponent=canonicalModel(state,source,e);
  const own=project({...player,abilityOptions:player.abilityOptions??{status:'known',source:'save',values:[player.ability]}},savedConditions(state,'player',p));
  const other=project(opponent,savedConditions(state,'enemy',e));
  const context={...state.rules,...(hitCount===null?{}:{hitCount})};
  if(state.rules.format==='Doubles') {
    const field={viewed:{...state.viewed},field:{...state.field},sides:{},
      attacking:{side:direction,slot:direction==='player'?p:e},defending:{side:direction==='player'?'enemy':'player',slot:direction==='player'?e:p}};
    for(const side of ['player','enemy']) {
      const ids=side==='player'?state.team:state.opponentSpecies;
      field[side]=[0,1].map(slot=>{
        if(ids[slot]==null)return null;
        const liveness=state.matchupConditions?.[side]?.[slot]?.currentHp===0?'fainted':'active';
        let mon;
        if(side==='player') {
          const record=records.find(record=>record.identity===ids[slot]);
          if(record)mon={...record,abilityOptions:record.abilityOptions??{status:'known',source:'save',values:[record.ability]}};
        } else {
          const set=selectedSource(state,slot);
          if(set)mon=canonicalModel(state,set,slot);
        }
        return {side,slot,identity:ids[slot],liveness,pokemon:mon?project(mon,savedConditions(state,side,slot,true)):null};
      });
      field.sides[side]={...(state.matchupSides?.[side]??{screens:{}}),activeCount:field[side].filter(v=>v?.liveness==='active').length};
    }
    context.defenderSideAlive=field.sides[field.defending.side].activeCount;
    context.battlefield=field;
  }
  return {source,opponent,own,other,context,attacker:direction==='player'?own:other,defender:direction==='player'?other:own};
}
const targetShape=target=>target?{status:target.status,side:target.side,slot:target.slot,name:target.name,
  hp:target.pokemon?.stats?.hp,currentHp:target.pokemon?.currentHp,reason:target.reason}:null;
function contextShape(context) {
  const f=context.battlefield;
  return {defenderSideAlive:context.defenderSideAlive,...(f?{attacking:f.attacking,defending:f.defending,
    player:f.player.map(v=>v&&({identity:v.identity,liveness:v.liveness,stats:v.pokemon?.stats,currentHp:v.pokemon?.currentHp,
      abilities:v.pokemon?.abilityOptions?.values,copiedAbility:v.pokemon?.copiedAbility,screens:v.pokemon?.screens})),
    enemy:f.enemy.map(v=>v&&({identity:v.identity,liveness:v.liveness,stats:v.pokemon?.stats,currentHp:v.pokemon?.currentHp,
      abilities:v.pokemon?.abilityOptions?.values,copiedAbility:v.pokemon?.copiedAbility,screens:v.pokemon?.screens}))}: {})};
}
export function referenceScenarios(state,player,move,{direction='player',records=[player],selection,defenseCurl=false}={}) {
  const condition=selectedConditionalCase(move,selection,defenseCurl),hitCount=selectedHitCount(move,selection);
  const battle=referenceBattle(state,player,records,direction,hitCount),refs=[];
  const {attacker,defender,context}=battle;
  for(const aa of attacker.abilityOptions.values)for(const da of defender.abilityOptions.values)
  for(const field of fieldAbilityBranches(context,{lightningRod:isLightningRodEligible(move)})) {
    const a=resolveBattleAbility({...attacker,ability:aa}),d=resolveBattleAbility({...defender,ability:da});
    const target=resolveLightningRodTarget(move,a,d,field.context),actual=target?.status==='redirected'?target.pokemon:d;
    let result=target?.reason?{availability:'unsupported',reason:target.reason}
      :calculateCoreDamage(move,{...attacker,ability:aa},actual,state.field.weather,state.field.critical,target?.context??field.context);
    if(result?.kind==='conditional-damage')result=result.conditions.find(c=>c.id===condition?.id)?.result??null;
    const available=result?.availability==='unsupported'?'unsupported':result?.kind==='ohko'?result.outcome:
      result?.kind==='deterministic-damage'&&result.outcome!=='damage'?result.outcome:
      result&&['standard-damage','deterministic-damage','level-damage','aggregate-damage'].includes(result.kind)?'available':'unavailable';
    const reason=result?.reason??(complete.has(available)?null:'missing-damage-data');
    const resolved=!unresolvedTrace(a)&&!unresolvedTrace(d)?resolveConventionalMove(move,a,actual,state.field.weather,field.context):null;
    const metadata=result?.fieldMoveMetadata===null?null:condition?{type:move.type,power:condition.power,formulaPower:condition.formulaPower??move.power,damageMultiplier:condition.multiplier}
      :resolved?{type:resolved.type,power:resolved.power,...(resolved.formulaPower!==undefined?{formulaPower:resolved.formulaPower}:{}),
        ...(resolved.damageMultiplier!==undefined?{damageMultiplier:resolved.damageMultiplier}:{})}:null;
    refs.push({aa,da,choices:field.context.fieldAbilityChoices,target,result,availability:available,reason,metadata,
      defender:target?.pokemon??defender});
  }
  return {battle,refs,condition};
}
// Independent uncapped integer convolution; no production KO helper or damage envelope.
function referenceKo(result,hp,move) {
  if(!Number.isInteger(hp)||hp<1||move.id===206)return null;
  let outcomes,total;
  if(result?.kind==='standard-damage') {
    const counts=new Map();for(const value of result.rolls)counts.set(value,(counts.get(value)??0)+1);
    outcomes=[...counts];total=16;
  } else if(['level-damage','aggregate-damage'].includes(result?.kind)) {
    outcomes=result.distribution.map(({damage,count})=>[damage,count]);total=result.totalOutcomes;
  } else if(result?.kind==='deterministic-damage'&&[69,101,82,49].includes(move.id)) {outcomes=[[result.damage,1]];total=1;}
  else return null;
  let sums=new Map([[0,1n]]);const chances=[];
  for(let attacks=1;attacks<=3;attacks++) {
    const next=new Map();
    for(const [sum,frequency] of sums)for(const [damage,count] of outcomes)next.set(sum+damage,(next.get(sum+damage)??0n)+frequency*BigInt(count));
    sums=next;let numerator=0n;
    for(const [sum,frequency] of sums)if(sum>=hp)numerator+=frequency;
    const denominator=BigInt(total)**BigInt(attacks);
    chances.push({attacks,numerator,denominator,probability:Number(numerator)/Number(denominator)});
  }
  return chances;
}

// Preserve the old unexplained-null rejection without retaining assertion diffs.
export function referenceNullReason(move,defender) {
  const physical=new Set(['NORMAL','FIGHTING','FLYING','POISON','GROUND','ROCK','BUG','GHOST','STEEL']);
  return physical.has(move?.type)&&defender?.dex===132&&defender.item==='Metal Powder'&&typeof defender.transformed!=='boolean'
    ?'unknown-metal-powder-transformation':'unexplained-null';
}

export function compareFrontierCase({state,player=auditPlayer,records=[player],move,direction='player',selection,defenseCurl=false,
  expectedSet,diagnostics=createAuditDiagnostics(),label='case'}) {
  const eq=(a,b,key)=>diagnostics.equal(a,b,key,label);
  const expected=referenceScenarios(state,player,move,{direction,records,selection,defenseCurl});
  const evaluation=evaluateFrontierCandidates(state,player,move,{direction,records,selection,defenseCurl});
  const summary=aggregateFrontierDamage(evaluation),entry=evaluation.evaluations[0];
  eq(expected.battle.source===expectedSet||expectedSet===undefined,true,'declared-selected-source');
  eq(evaluation.construction.candidates.length,1,'candidate-count');eq(evaluation.evaluations.length,1,'evaluation-count');
  if(!entry){diagnostics.mismatch(label,'missing-evaluation',null,1);return {evaluation,summary,expected,comparisons:0};}
  eq(entry.sourceSet===expected.battle.source,true,'source-identity');eq(entry.setId,frontierSetId(expected.battle.source),'set-id');
  eq(entry.constructionAvailability,'available','construction-availability');
  for(const key of ['stats','item','evs','nature','ivs','ivProvenance','friendship','level','maximumHp'])eq(entry.candidate.opponent?.[key],expected.battle.opponent[key],`canonical-${key}`);
  eq(entry.opponent?.moves.map(move=>move.name),expected.battle.source.moves,'canonical-moves');
  for(const [key,mon] of [['attacker',expected.battle.attacker],['defender',expected.battle.defender]])
    for(const field of ['stats','currentHp','status','stages','screens','helpingHand','copiedAbility','flashFireActivated'])eq(entry[key]?.[field],mon[field],`${key}-${field}`);
  eq(contextShape(entry.battleContext),contextShape(expected.battle.context),'independent-battlefield');
  eq(entry.defenderMaximumHp,expected.battle.defender.stats.hp,'selected-defender-hp');
  const leaves=entry.abilityDamage?.conditions?.flatMap(c=>c.abilityDamage.scenarios)??entry.abilityDamage?.scenarios??[];
  eq(leaves.length,expected.refs.length,'ability-field-branch-count');
  const allComplete=expected.refs.every(ref=>complete.has(ref.availability));
  eq(entry.availability,allComplete?'available':'unavailable','evaluation-availability');
  const policy=isUnsupportedSpecialMove(move)?'unsupported':move.power===0?'status':null;
  const targets=new Set(expected.refs.map(r=>r.target?`${r.target.side}:${r.target.slot}`:'selected'));
  const kind=policy??(!allComplete?'incomplete':targets.size>1?'target-alternatives':expected.refs.every(r=>r.result?.kind==='ohko')?'categorical-ohko':'damage-envelope');
  eq(summary.kind,kind,'summary-kind');eq(summary.availability,!policy&&allComplete?'available':'unavailable','summary-availability');
  const numerical=expected.refs.map(ref=>({min:ref.result?.damage??ref.result?.min,max:ref.result?.damage??ref.result?.max,hp:ref.defender.stats.hp}));
  eq(summary.hp,kind==='damage-envelope'?{min:Math.min(...numerical.map(v=>v.min)),max:Math.max(...numerical.map(v=>v.max))}:null,'hp-envelope');
  eq(summary.percentage,kind==='damage-envelope'?{min:Math.min(...numerical.map(v=>100*v.min/v.hp)),max:Math.max(...numerical.map(v=>100*v.max/v.hp))}:null,'correlated-percentages');
  const ko=[];let comparisons=0,knownTransformationGuards=0;
  const koCache=new Map(); // Only this case; released before the next evaluation.
  for(const [index,ref] of expected.refs.entries()) {
    const actual=leaves[index],branch=summary.branches[index];if(!actual)continue;
    eq([actual.attackerAbility,actual.defenderAbility],[ref.aa,ref.da],'ability-pair');eq(actual.fieldAbilityChoices,ref.choices,'field-choices');
    eq(targetShape(actual.target),targetShape(ref.target),'redirected-target');
    eq(actual.result,ref.result,'direct-result');comparisons++;
    if(ref.result===null&&!policy) {
      const explanation=referenceNullReason(move,ref.defender);
      eq(explanation,'unknown-metal-powder-transformation','explained-null-result');
      if(explanation==='unknown-metal-powder-transformation')knownTransformationGuards++;
    }
    eq(actual.availability,ref.availability,'branch-availability');eq(actual.reason,ref.reason,'branch-reason');
    eq(actual.moveMetadata,ref.metadata,'move-metadata');
    if(ref.reason&&!policy)eq(summary.reasons.includes(ref.reason),true,'retained-reason');
    eq(branch?.defenderMaximumHp,ref.defender.stats.hp,'branch-defender-hp');
    eq(branch?.defenderCurrentHp,ref.defender.currentHp,'branch-current-hp');
    const cacheKey=JSON.stringify([ref.result,ref.defender.currentHp]);
    if(!koCache.has(cacheKey))koCache.set(cacheKey,allComplete&&!policy?referenceKo(ref.result,ref.defender.currentHp,move):null);
    const chances=koCache.get(cacheKey);ko.push(chances);
    eq(branch?.ko.availability,chances?'available':'unavailable','branch-ko-availability');
    eq(branch?.ko.chances,chances,'independent-ko-counts');
  }
  const koComplete=ko.length===expected.refs.length&&ko.length>0&&ko.every(Boolean)&&targets.size===1;
  eq(summary.ko.availability,koComplete?'available':'unavailable','summary-ko-availability');
  if(koComplete)for(let index=0;index<3;index++) {
    const chances=ko.map(values=>values[index]);
    const sorted=chances.slice().sort((a,b)=>a.numerator*b.denominator<b.numerator*a.denominator?-1:a.numerator*b.denominator>b.numerator*a.denominator?1:0);
    eq(summary.ko.chances[index].min,sorted[0],'ko-minimum');eq(summary.ko.chances[index].max,sorted.at(-1),'ko-maximum');
  } else eq(summary.ko.chances,null,'no-incomplete-ko');
  eq(summary.groups.reduce((n,g)=>n+g.contributors.length,0),summary.branches.length,'retained-contributors');
  eq(summary.candidateCount,1,'summary-candidate-count');eq(summary.setIds,[frontierSetId(expected.battle.source)],'summary-set-identity');
  if(kind==='damage-envelope') {
    const parts=frontierDamageDisplayParts(summary);eq(Boolean(parts.hp&&parts.percentage),true,'numerical-presentation');
  }
  return {evaluation,summary,expected,comparisons,knownTransformationGuards};
}

export function auditFrontierCandidates({trainers=towerTrainerEntries,levels=[50,85],formats=['Singles','Doubles'],speciesNames,maxExamples=20,onProgress}={}) {
  const diagnostics=createAuditDiagnostics(maxExamples);
  const report=Object.assign(diagnostics.report,{trainers:trainers.length,contexts:0,selectedContexts:0,evaluations:0,branches:0,expectedBranches:0,directComparisons:0,knownTransformationGuards:0,
    byDirection:{},byFormat:{},byLevel:{},summaryKinds:{},unavailableReasons:{},
    coverage:{oneSet:0,multipleSets:0,differentItems:0,differentNatures:0,differentEvs:0,differentHp:0,abilityAlternatives:0,brainContexts:0,fullFields:0}});
  for(const trainer of trainers)for(const format of formats) {
    if(!towerTrainerSupportsFormat(trainer,format))continue;
    const names=[...new Set(trainer.setIds.map(id=>towerSetById(id).species))];
    for(const level of levels)for(const name of names) {
      if(speciesNames&&!speciesNames.includes(name))continue;
      let base=battleReducer(createBattleState(),{type:'rules',patch:{format,...(level===50?{}:{levelMode:'open',openLevel:level})}});
      base=battleReducer(base,{type:'opponentTrainer',key:trainer.key});
      const id=speciesByName.get(name.toLowerCase()).internalSpeciesId;
      base=battleReducer(base,{type:'assignOpponentSpecies',slot:0,speciesId:id});
      if(format==='Doubles') {
        const hidden=names.find(other=>other!==name);
        if(hidden)base=battleReducer(base,{type:'assignOpponentSpecies',slot:1,speciesId:speciesByName.get(hidden.toLowerCase()).internalSpeciesId});
      }
      base=battleReducer(base,{type:'matchupOpponent',speciesId:id});
      base={...base,team:format==='Doubles'?[auditPlayer.identity,auditPartner.identity]:[auditPlayer.identity],matchup:{...base.matchup,player:auditPlayer.identity}};
      const sets=possibleMatchupSets(base);
      report.contexts++;count(report.coverage,sets.length===1?'oneSet':'multipleSets');
      for(const [key,values] of [['differentItems',sets.map(s=>s.item)],['differentNatures',sets.map(s=>s.nature)],
        ['differentEvs',sets.map(s=>JSON.stringify(s.evs))],['differentHp',sets.map(s=>canonicalModel(base,s,0).stats.hp)]])
        if(new Set(values).size>1)report.coverage[key]++;
      if(trainer.trainer==='Anabel')report.coverage.brainContexts++;
      if(format==='Doubles'&&base.opponentSpecies[1])report.coverage.fullFields++;
      for(const set of sets) {
        const state=battleReducer(base,{type:'selectOpponentSet',slot:0,setId:frontierSetId(set)});
        report.selectedContexts++;
        for(const move of ['Ice Beam','Surf','Earthquake'])check(state,set,move,'player');
        for(const move of new Set(set.moves))check(state,set,move,'enemy');
      }
      if(onProgress&&report.contexts%100===0)onProgress({contexts:report.contexts,evaluations:report.evaluations,mismatchCount:report.mismatchCount});
    }
  }
  return report;
  function check(state,set,name,direction) {
    const label=`${state.selectedTrainer}/${state.selectedBrainSymbol??''} ${frontierSetId(set)} ${state.rules.format} Lv${state.rules.opponentLevel} ${direction} ${name}`;
    report.evaluations++;count(report.byDirection,direction);count(report.byFormat,state.rules.format);count(report.byLevel,state.rules.opponentLevel);
    try {
      const result=compareFrontierCase({state,expectedSet:set,move:battleMove(name),direction,records:[auditPlayer,auditPartner],diagnostics,label});
      report.branches+=result.summary.branches.length;report.expectedBranches+=result.expected.refs.length;report.directComparisons+=result.comparisons;report.knownTransformationGuards+=result.knownTransformationGuards;
      count(report.summaryKinds,result.summary.kind);
      if(result.expected.battle.opponent.abilityOptions.values.length>1)report.coverage.abilityAlternatives++;
      for(const reason of result.summary.reasons)count(report.unavailableReasons,reason);
    } catch(error) {diagnostics.mismatch(label,'case-exception',`${error.name}: ${String(error.message).slice(0,180)}`,'reference calculation completes');}
  }
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const report=auditFrontierCandidates();
  await mkdir('artifacts/frontier-candidate-step5',{recursive:true});
  await writeFile('artifacts/frontier-candidate-step5/roster-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(report.mismatchCount)process.exitCode=1;
}
