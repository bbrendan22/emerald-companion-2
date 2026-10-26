import {battleReducer,createBattleState} from '../../src/battle/battleState.js';
import {battleMove,speciesByName,speciesTypes} from '../../src/battle/reference.js';
import {identifiedMatchup} from '../../src/battle/towerSets.js';
import {opponentStatRanges,opponentStatDisplay,opponentMoveInputs} from '../../src/battle/opponentStats.js';
import {playerAbilityOptions,opponentAbilityOptions} from '../../src/battle/abilityScenarios.js';
import {activeConditionSlot,slotConditions} from '../../src/battle/matchupConditions.js';
import {projectAbilityConditions} from '../../src/battle/conditionalAbilities.js';
// Reproduction stats, NOT the user's unknown saved stats. Opponent values always
// come from the actual trainer/set pipeline. The failure is independent of the
// player's positive scalar stats, once its item/ability are valid.
export const swampert={identity:'alexas-swampert',name:'Swampert',dex:260,level:47,types:['WATER','GROUND'],ability:'Torrent',item:'None',stats:{hp:180,attack:110,defense:100,spAttack:100,spDefense:100},moves:['Ice Beam','Surf','Earthquake','Strength'].map(battleMove)};
export const aerodactylId=speciesByName.get('aerodactyl').internalSpeciesId;
export function alexasState(format='Singles') {
 let state=battleReducer(createBattleState(),{type:'rules',patch:{format}});
 state=battleReducer(state,{type:'opponentTrainer',key:'Expert (M):ALEXAS'});
 state={...state,team:[swampert.identity],matchup:{...state.matchup,player:swampert.identity}};
 state=battleReducer(state,{type:'assignOpponentSpecies',slot:0,speciesId:aerodactylId});
 // Doubles arithmetic fixtures represent two assigned, living defenders.
 if(format==='Doubles')state=battleReducer(state,{type:'assignOpponentSpecies',slot:1,speciesId:speciesByName.get('aggron').internalSpeciesId});
 return battleReducer(state,{type:'matchupOpponent',speciesId:aerodactylId});
}
export const observe=(state,field,value)=>battleReducer(state,{type:'observeOpponent',field,value});
export function alexasInputs(state) {
 const identification=identifiedMatchup(state),ranges=opponentStatRanges(state,identification.sets);
 const opponent={id:aerodactylId,dex:142,name:'Aerodactyl',level:state.rules.opponentLevel,types:speciesTypes(142),...opponentMoveInputs(state,identification.sets),stats:opponentStatDisplay(ranges),item:identification.item||null,ability:identification.observations.ability||'Rock Head / Pressure'};
 const project=(mon,side,options)=>{const conditions=slotConditions(state,side,activeConditionSlot(state,side));return {...projectAbilityConditions({...mon,abilityOptions:options},conditions),helpingHand:conditions.helpingHand,stages:conditions.stages,screens:conditions.screens,status:conditions.status,currentHp:conditions.currentHp===null?mon.stats.hp:conditions.currentHp};};
 return {identification,ranges,player:project(swampert,'player',playerAbilityOptions(swampert)),opponent:project(opponent,'enemy',opponentAbilityOptions(opponent,identification.sets,identification.observations.ability??''))};
}
