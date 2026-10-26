import {frontierMatchupCandidates} from './frontierCandidates.js';
import {matchupObservations} from './towerSets.js';
import {playerAbilityOptions} from './abilityScenarios.js';
import {projectAbilityConditions} from './conditionalAbilities.js';
import {activeConditionSlot,battlefieldSlotLiveness,defaultSlotConditions,sideConditions,slotConditions} from './matchupConditions.js';

// Shared projection of existing Pokémon models; no ability activation or mutation.
export function projectBattlePokemon(mon,conditions) {
  return {...projectAbilityConditions(mon,conditions),
    currentHp:conditions.currentHp===null?mon.stats?.hp:conditions.currentHp,
    status:conditions.status,stages:{...conditions.stages},screens:{...conditions.screens},helpingHand:conditions.helpingHand};
}

// Derived per calculation, not another battle session or a second Pokémon model.
// An assigned slot with missing/invalid data stays explicit and unavailable.
export function doublesBattlefieldContext(state,records=[],{direction='player',construction}={}) {
  if(state.rules.format!=='Doubles')return null;
  const viewedEnemy=activeConditionSlot(state,'enemy');
  const sides={player:sideConditions(state,'player'),enemy:sideConditions(state,'enemy')};
  const slots=Object.fromEntries(['player','enemy'].map(side=>[side,[0,1].map(slot=>{
    const identity=(side==='player'?state.team:state.opponentSpecies)[slot];
    const liveness=battlefieldSlotLiveness(state,side,slot);
    if(liveness==='empty')return null;
    const saved=slotConditions(state,side,slot);
    const conditions={...defaultSlotConditions(),...saved,currentHp:saved.currentHp??null};
    let mon,candidate=null,observations=null,reason=null;
    if(side==='player') {
      mon=records.find(record=>record.identity===identity);
      if(mon)mon={...mon,abilityOptions:mon.abilityOptions??playerAbilityOptions(mon)};
      else reason='missing-battlefield-player-record';
    } else {
      const projected={...state,matchup:{...state.matchup,opponent:identity}};
      const resolved=slot===viewedEnemy&&construction?construction:frontierMatchupCandidates(projected);
      candidate=resolved.candidates.length===1?resolved.candidates[0]:null;
      mon=candidate?.opponent;
      reason=mon?null:candidate?.reason??resolved.reason??'ambiguous-battlefield-opponent';
      observations=matchupObservations(projected);
    }
    return {side,slot,identity,liveness,conditions,observations,candidate,
      selectedSetId:side==='enemy'?state.opponentSetSelections?.[slot]??null:null,
      availability:mon?'available':'unavailable',reason,
      pokemon:mon?projectBattlePokemon(mon,conditions):null};
  })]));
  const attackingSide=direction==='enemy'?'enemy':'player';
  const defendingSide=attackingSide==='player'?'enemy':'player';
  return {...slots,viewed:{...state.viewed},field:{...state.field},sides,
    attacking:{side:attackingSide,slot:activeConditionSlot(state,attackingSide)},
    defending:{side:defendingSide,slot:activeConditionSlot(state,defendingSide)}};
}
