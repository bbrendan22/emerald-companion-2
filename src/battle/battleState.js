import {createTowerRules, freshBattleConditions, selectTowerTrainer} from './towerRules.js';
import {towerTrainerEntries, selectedTowerTrainer, towerTrainerSupportsFormat} from './towerTrainers.js';
import {availableTowerSets, frontierSetId, opponentSetDisabled, towerSetById} from './towerSets.js';
import {speciesByName} from './reference.js';
import {reduceCondition} from './conditionState.js';
import {validateTeam, teamHasSpecies} from '../storage/battleTeams.js';
import {availableOpponentSpecies} from './opponentSpecies.js';

export const battleTabs = ['Matchup', 'Trainers', 'Sets', 'Teams', 'Rules'];

export function createBattleState() {
  return {tab:'Matchup', team:[], active:null, selectedTrainer:null, selectedBrainSymbol:null, opponents:[], enemy:null, opponentSpecies:[],
    matchup:{player:null,opponent:null},
    rules:createTowerRules(), ...freshBattleConditions(), conditionsExpanded:false, teamInitialized:false, setSearch:{query:'', hiddenIds:[]}};
}

export function battleReducer(state, action) {
  const next = reduceBattleState(state, action);
  if (next === state) return state;
  const current = next.matchup ?? {player:null,opponent:null};
  const player = action.type === 'loadTeam' || !next.team.slice(0,next.rules.teamSize).includes(current.player) ? null : current.player;
  const replacedOpponent = action.type === 'opponentTrainer' && next.opponentSpecies !== state.opponentSpecies;
  const opponent = replacedOpponent || !next.opponentSpecies.slice(0,next.rules.teamSize).includes(current.opponent) ? null : current.opponent;
  return player === current.player && opponent === current.opponent ? next : {...next,matchup:{player,opponent}};
}

function reduceBattleState(state, action) {
  switch (action.type) {
    case 'matchupPlayer':
      return action.identity && state.team.slice(0,state.rules.teamSize).includes(action.identity)
        ? {...state,matchup:{...state.matchup,player:action.identity}} : state;
    case 'matchupOpponent':
      return action.speciesId && state.opponentSpecies.slice(0,state.rules.teamSize).includes(action.speciesId)
        ? {...state,matchup:{...state.matchup,opponent:action.speciesId}} : state;
    case 'assignOpponentSpecies': {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.rules.teamSize
        || state.opponentSpecies?.[action.slot]
        || state.opponentSpecies?.includes(action.speciesId)
        || !availableOpponentSpecies(state).some(mon => mon.id === action.speciesId)) return state;
      const opponentSpecies = Array.from({length:Math.max(state.rules.teamSize, state.opponentSpecies?.length ?? 0)},
        (_, index) => state.opponentSpecies?.[index] ?? null);
      opponentSpecies[action.slot] = action.speciesId;
      return {...state, opponentSpecies};
    }
    case 'clearOpponentSpeciesSlot': {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.rules.teamSize
        || !action.speciesId || state.opponentSpecies?.[action.slot] !== action.speciesId) return state;
      const opponentSpecies = [...state.opponentSpecies];
      opponentSpecies[action.slot] = null;
      return {...state, opponentSpecies};
    }
    case 'rules': {
      if (!action.patch || Object.keys(action.patch).some(key => !['facility','format','levelMode','openLevel'].includes(key))) return state;
      try {
        const rules = createTowerRules({...state.rules, ...action.patch});
        const team = state.team.length > rules.teamSize ? state.team.slice(0, rules.teamSize) : state.team;
        const trainerPatch = towerTrainerSupportsFormat(selectedTowerTrainer(state),rules.format) ? {}
          : {selectedTrainer:null,selectedBrainSymbol:null};
        return {...state, rules, team, ...trainerPatch, active:state.active === null || team.includes(state.active) ? state.active : team.find(Boolean) ?? null};
      }
      catch { return state; }
    }
    case 'loadTeam':
      return validateTeam(action.team, action.records, state.rules.teamSize) ? state : {...state, team:[...action.team.ids], active:action.team.ids[0], teamInitialized:true, tab:'Matchup'};
    case 'opponentTrainer': {
      const entry = towerTrainerEntries.find(trainer => trainer.key === action.key);
      if (!entry || !towerTrainerSupportsFormat(entry,state.rules.format)
        || (state.selectedTrainer === entry.trainer && state.selectedBrainSymbol === entry.symbol)) return state;
      const brainTeam = entry.trainer === 'Anabel' && entry.symbol ? {
        opponentSpecies:entry.setIds.map(id => speciesByName.get(towerSetById(id).species.toLowerCase()).internalSpeciesId),
        opponents:[], enemy:null,
      } : {};
      return {...state, selectedTrainer:entry.trainer, selectedBrainSymbol:entry.symbol, ...brainTeam};
    }
    case 'clearOpponentTrainer':
      return state.selectedTrainer === null && state.selectedBrainSymbol === null && !state.opponents.length && state.enemy === null && !state.opponentSpecies?.length ? state
        : {...state, selectedTrainer:null, selectedBrainSymbol:null, opponents:[], enemy:null, opponentSpecies:[]};
    case 'trainer': {
      const entry = towerTrainerEntries.find(trainer => trainer.key === action.key);
      return entry ? {...selectTowerTrainer(state, entry.trainer), selectedBrainSymbol:entry.symbol, tab:'Sets', setSearch:{query:'', hiddenIds:[]}} : state;
    }
    case 'clearTrainer':
      return state.selectedTrainer === null ? state : {...selectTowerTrainer(state, null),
        selectedBrainSymbol:null, tab:'Sets', setSearch:{query:'', hiddenIds:[]}};
    case 'clearPlayerTeam':
      return !state.team.some(Boolean) && state.active === null ? state
        : {...state, team:[], active:null, teamInitialized:true};
    case 'clearPlayerSlot': {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.rules.teamSize
        || !action.identity || state.team[action.slot] !== action.identity) return state;
      const team = [...state.team];
      team[action.slot] = null;
      return {...state, team, active:state.active === action.identity ? null : state.active, teamInitialized:true};
    }
    case 'assignPlayer': {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.rules.teamSize
        || state.team[action.slot] || state.team.includes(action.identity)
        || teamHasSpecies(state.team, action.pool ?? [], action.pool?.find(mon => mon.identity === action.identity))
        || !action.pool?.some(mon => mon.identity === action.identity)) return state;
      const team = Array.from({length:state.rules.teamSize}, (_, index) => state.team[index] ?? null);
      team[action.slot] = action.identity;
      return {...state, team, active:action.identity, teamInitialized:true};
    }
    case 'addPlayer':
      return state.team.length >= state.rules.teamSize || state.team.includes(action.identity)
        || teamHasSpecies(state.team, action.pool ?? [], action.pool?.find(mon => mon.identity === action.identity))
        || !action.pool?.some(mon => mon.identity === action.identity) ? state
        : {...state, team:[...state.team, action.identity], active:action.identity, teamInitialized:true, tab:'Matchup'};
    case 'removePlayer':
      return !state.team.includes(action.identity) ? state : {...state,
        team:state.team.filter(id => id !== action.identity), active:state.active === action.identity ? null : state.active, teamInitialized:true};
    case 'setQuery':
      return {...state, setSearch:{query:action.query, hiddenIds:action.query.trim() ? state.setSearch.hiddenIds : []}};
    case 'restoreSets':
      return {...state, setSearch:{...state.setSearch, hiddenIds:[]}};
    case 'hideSet':
      if (opponentSetDisabled(state, action.setId)) return state;
      return availableTowerSets(state).some(set => frontierSetId(set) === action.setId)
        ? {...state, setSearch:{...state.setSearch, hiddenIds:[...new Set([...state.setSearch.hiddenIds, action.setId])]}} : state;
    case 'addOpponent': {
      if (!availableTowerSets(state).some(set => frontierSetId(set) === action.setId)) return state;
      if (opponentSetDisabled(state, action.setId)) return state;
      return {...state, opponents:[...state.opponents, action.setId], enemy:action.setId, tab:'Matchup', setSearch:{query:'', hiddenIds:[]}};
    }
    case 'removeOpponent': {
      if (!state.opponents.includes(action.setId)) return state;
      const opponents = state.opponents.filter(id => id !== action.setId);
      return {...state, opponents, enemy:state.enemy === action.setId ? opponents[0] ?? null : state.enemy};
    }
    case 'tab':
      return battleTabs.includes(action.tab) ? {...state, tab:action.tab} : state;
    case 'activePlayer':
      return state.team.includes(action.identity) ? {...state, active:action.identity} : state;
    case 'activeOpponent':
      return state.opponents.includes(action.setId) ? {...state, enemy:action.setId} : state;
    case 'collection': {
      // Collection updates only reconcile manual choices; never select a team.
      const available = new Set((action.frontierOnly ? action.pool : action.records).map(mon => mon.identity));
      const team = action.preserveSlots ? state.team.map(id => available.has(id) ? id : null)
        : state.team.filter(id => available.has(id));
      const active = state.active === null ? null : team.includes(state.active) ? state.active : team.find(Boolean) ?? null;
      if (active === state.active
        && team.length === state.team.length && team.every((id, i) => id === state.team[i])) return state;
      return {...state, team, active};
    }
    case 'resetConditions': return {...state,...freshBattleConditions()};
    default: return reduceCondition(state,action);
  }
}
