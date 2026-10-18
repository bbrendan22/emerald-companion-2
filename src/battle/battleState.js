import {createTowerRules, freshBattleConditions, selectTowerTrainer} from './towerRules.js';
import {towerTrainerEntries} from './towerTrainers.js';
import {availableTowerSets, frontierSetId, opponentSetDisabled} from './towerSets.js';
import {reduceCondition} from './conditionState.js';
import {validateTeam} from '../storage/battleTeams.js';

export const battleTabs = ['Matchup', 'Trainers', 'Sets', 'Teams', 'Rules'];

export function createBattleState() {
  return {tab:'Matchup', team:[], active:null, selectedTrainer:null, selectedBrainSymbol:null, opponents:[], enemy:null,
    rules:createTowerRules(), ...freshBattleConditions(), conditionsExpanded:false, teamInitialized:false, setSearch:{query:'', hiddenIds:[]}};
}

export function battleReducer(state, action) {
  switch (action.type) {
    case 'rules': {
      if (!action.patch || Object.keys(action.patch).some(key => !['levelMode','openLevel'].includes(key))) return state;
      try { return {...state, rules:createTowerRules({...state.rules, ...action.patch})}; }
      catch { return state; }
    }
    case 'loadTeam':
      return validateTeam(action.team, action.records) ? state : {...state, team:[...action.team.ids], active:action.team.ids[0], teamInitialized:true, tab:'Matchup'};
    case 'trainer': {
      const entry = towerTrainerEntries.find(trainer => trainer.key === action.key);
      return entry ? {...selectTowerTrainer(state, entry.trainer), selectedBrainSymbol:entry.symbol, tab:'Sets', setSearch:{query:'', hiddenIds:[]}} : state;
    }
    case 'clearTrainer':
      return state.selectedTrainer === null ? state : {...selectTowerTrainer(state, null),
        selectedBrainSymbol:null, tab:'Sets', setSearch:{query:'', hiddenIds:[]}};
    case 'addPlayer':
      return state.team.length >= state.rules.teamSize || state.team.includes(action.identity)
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
      // Bootstrap only from genuine Frontier records, never party/sample fallbacks.
      // Once selected, preserve team order; remove records no longer in the save.
      const available = new Set(action.records.map(mon => mon.identity));
      let team = state.team.filter(id => available.has(id));
      let initialized = state.teamInitialized;
      if (!initialized && action.pool.length) {
        const species = new Set();
        team = action.pool.filter(mon => {
          if (species.has(mon.dex)) return false;
          species.add(mon.dex); return true;
        }).slice(0, state.rules.teamSize).map(mon => mon.identity);
        initialized = true;
      }
      const active = !state.teamInitialized && initialized ? team[0] ?? null
        : state.active === null ? null : team.includes(state.active) ? state.active : team[0] ?? null;
      if (initialized === state.teamInitialized && active === state.active
        && team.length === state.team.length && team.every((id, i) => id === state.team[i])) return state;
      return {...state, team, active, teamInitialized:initialized};
    }
    case 'resetConditions': return {...state,...freshBattleConditions()};
    default: return reduceCondition(state,action);
  }
}
