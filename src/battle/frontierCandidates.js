import {analysisMatchupSets,matchupObservations,frontierSetId,towerSetById} from './towerSets.js';
import {selectedTowerTrainer} from './towerTrainers.js';
import {towerOpponentIVs,towerTrainerSets,towerBrainSets} from './towerRules.js';
import {frontierSetStats} from './frontierAdapter.js';
import {speciesByName,speciesTypes,battleMove} from './reference.js';
import {ivNatures} from './stats.js';
import {battleItemId} from './itemLookup.js';
import {opponentAbilityOptions} from './abilityScenarios.js';

const keys={hp:'hp',attack:'atk',defense:'def',spAttack:'spa',spDefense:'spd',speed:'spe'};
const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;

// Construction only: no battle-condition projection, ability pinning or damage.
// Every eligible source has an entry, including sources that cannot be constructed.
// sourceSet is a read-only canonical reference; all calculation operands are copies.
export function frontierMatchupCandidates(state) {
  const sets=analysisMatchupSets(state);
  const trainer=selectedTowerTrainer(state);
  const selectedAbility=matchupObservations(state).ability??'';
  const candidates=sets.map(set=>constructCandidate(state,set,sets,trainer,selectedAbility));
  const complete=candidates.length>0&&candidates.every(candidate=>candidate.availability==='available');
  return {availability:complete?'available':'unavailable',
    reason:complete?null:candidates.length?'incomplete-candidate-data':'no-matching-frontier-sets',candidates};
}

function constructCandidate(state,set,sets,trainer,selectedAbility) {
  const setId=frontierSetId(set);
  const unavailable=reason=>({setId,sourceSet:set,availability:'unavailable',reason,opponent:null});
  if(towerSetById(setId)!==set)return unavailable('noncanonical-frontier-set');
  if(state.rules?.facility!=='Tower')return unavailable('unsupported-frontier-facility');
  if(!trainer)return unavailable(state.selectedTrainer==null?'missing-trainer-ivs':'invalid-trainer-context');
  if(!trainer.setIds.includes(setId)||!towerTrainerSets(state.selectedTrainer).includes(set))
    return unavailable('unauthorized-frontier-set');
  const level=state.rules.opponentLevel;
  if(!integer(level,1,100))return unavailable('invalid-opponent-level');
  const species=typeof set.species==='string'?speciesByName.get(set.species.toLowerCase()):null;
  if(!species||species.internalSpeciesId!==state.matchup?.opponent
    ||!Object.keys(keys).every(key=>integer(species.baseStats?.[key],1,255)))
    return unavailable('invalid-candidate-species');
  const types=speciesTypes(species.nationalDexId);
  if(!Array.isArray(types)||types.length<1||types.length>2||types.some(type=>!type))
    return unavailable('missing-candidate-types');
  if(!ivNatures.includes(set.nature))return unavailable('invalid-candidate-nature');
  if(!set.evs||Object.values(keys).some(key=>!integer(set.evs[key],0,255))
    ||Object.values(set.evs).some(value=>!integer(value,0,255))
    ||Object.values(set.evs).reduce((sum,value)=>sum+value,0)>510)
    return unavailable('invalid-candidate-evs');
  if(Boolean(set.brainSet)!==towerBrainSets.includes(set))return unavailable('invalid-candidate-iv-source');
  const iv=towerOpponentIVs(state.selectedTrainer,set);
  if(iv.assumed||!integer(iv.value,0,31)||!['trainer','brain'].includes(iv.source))
    return unavailable('missing-verified-ivs');
  // Explicit canonical None is allowed; empty/missing/unrecognized items are not.
  if(typeof set.item!=='string'||(set.item!=='None'&&!battleItemId(set.item)))
    return unavailable('missing-or-invalid-candidate-item');
  if(!Array.isArray(set.moves)||set.moves.length<1||set.moves.length>4
    ||Array.from(set.moves).some(name=>typeof name!=='string'||!battleMove(name)))
    return unavailable('missing-or-invalid-candidate-moves');
  // Match BattleMatchup's full identification list and explicit empty observation.
  // Never pass [set] here: construction must not introduce singleton narrowing.
  const abilityOptions=opponentAbilityOptions({id:species.internalSpeciesId,dex:species.nationalDexId},sets,selectedAbility);
  if(!['known','uncertain'].includes(abilityOptions.status)||!abilityOptions.values.length)
    return unavailable('missing-candidate-abilities');
  const stats=frontierSetStats(set,level,iv.value);
  if(!Object.values(stats).every(value=>integer(value,1,999)))return unavailable('invalid-candidate-stats');
  const opponent={
    setId,id:species.internalSpeciesId,name:species.name,dex:species.nationalDexId,types:[...types],level,
    nature:set.nature,evs:Object.fromEntries(Object.entries(keys).map(([key,short])=>[key,set.evs[short]])),
    ivs:Object.fromEntries(Object.keys(keys).map(key=>[key,iv.value])),ivProvenance:{...iv},
    stats,maximumHp:stats.hp,item:set.item,itemProvenance:{source:'frontier-set',setId},
    moves:set.moves.map(name=>structuredClone(battleMove(name))),
    friendship:set.moves.includes('Frustration')?0:255,
    ability:abilityOptions.values.join(' / '),abilityOptions,
    currentHp:stats.hp,status:'none',stages:{},screens:{},
  };
  return {setId,sourceSet:set,availability:'available',reason:null,opponent};
}
