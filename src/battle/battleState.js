import {battleRounds} from '../storage/battleRules.js';
import {towerRoundTrainerEligible} from './towerRoundEligibility.js';
import {opponentStatRanges} from './opponentStats.js';
import {opponentAbilityOptions} from './abilityScenarios.js';
import {activeConditionSlot,conditionHp,defaultSideConditions,reconcileSlotConditions, reduceMatchupCondition} from './matchupConditions.js';
import {createTowerRules, freshBattleConditions, selectTowerTrainer} from './towerRules.js';
import {towerTrainerEntries, selectedTowerTrainer, towerTrainerSupportsFormat} from './towerTrainers.js';
import {analysisMatchupSets, usesSelectedSet, availableTowerSets, frontierSetId, opponentSetDisabled, matchupObservations, matchupOpponentSlot, observationChoices, possibleMatchupSets} from './towerSets.js';
import {reduceCondition} from './conditionState.js';
import {validateTeam, teamHasSpecies} from '../storage/battleTeams.js';
import {availableOpponentSpecies} from './opponentSpecies.js';

export const battleTabs = ['Matchup', 'Trainers', 'Sets', 'Teams', 'Rules'];

export function createBattleState() {
  return {viewed:{player:0,opponent:0}, opponentSetSelections:{}, selectedOpponentSetId:null, observationsExpanded:false, round:'', opponentReset:0, tab:'Matchup', team:[], active:null, selectedTrainer:null, selectedBrainSymbol:null, opponents:[], enemy:null, opponentSpecies:[],
    matchup:{player:null,opponent:null}, matchupSides:{player:defaultSideConditions(),enemy:defaultSideConditions()}, matchupConditions:{player:{},enemy:{}}, opponentObservations:{},
    rules:createTowerRules(), ...freshBattleConditions(), conditionsExpanded:false, teamInitialized:false, setSearch:{query:'', hiddenIds:[]}};
}

export function battleReducer(state, action) {
  let next = reduceBattleState(state, action);
  if (next === state) return state;
  const rulesReset = next.opponentReset !== state.opponentReset;
  if (!rulesReset) next = reconcileSlotConditions(state,next);
  const current = next.matchup ?? {player:null,opponent:null};
  const player = action.type === 'loadTeam' || !next.team.slice(0,next.rules.teamSize).includes(current.player) ? null : current.player;
  const replacedOpponent = action.type === 'opponentTrainer' && next.opponentSpecies !== state.opponentSpecies;
  const opponent = replacedOpponent || !next.opponentSpecies.slice(0,next.rules.teamSize).includes(current.opponent) ? null : current.opponent;
  // Slot indexes stay stable through switching and empty-slot removals. Only an
  // occupant change invalidates that slot's manual observations, including when
  // a trainer selection replaces the lineup. Other occupied slots retain memory.
  if (next.opponentSpecies !== state.opponentSpecies) {
    const observations = next.opponentObservations ?? {};
    const kept = Object.fromEntries(Object.entries(observations).filter(([slot]) =>
      next.opponentSpecies?.[slot] && next.opponentSpecies[slot] === state.opponentSpecies?.[slot]));
    if (Object.keys(kept).length !== Object.keys(observations).length) next = {...next, opponentObservations:kept};
  }
  if(player !== current.player || opponent !== current.opponent)next={...next,matchup:{player,opponent}};
  if (usesSelectedSet(next)) {
    const sets = possibleMatchupSets(next);
    const preserve = state.matchup?.opponent === next.matchup?.opponent && state.selectedTrainer === next.selectedTrainer;
    const selectedOpponentSetId = (preserve && sets.some(set => frontierSetId(set) === next.selectedOpponentSetId))
      ? next.selectedOpponentSetId : sets[0] ? frontierSetId(sets[0]) : null;
    if (selectedOpponentSetId !== next.selectedOpponentSetId) next = {...next,selectedOpponentSetId};
  }
  if (next.rules.format === 'Doubles') {
    // The first two roster positions are the active battlefield. The matchup is
    // only a projection for existing consumers, never the complete lineup.
    const viewed = {...(next.viewed ?? {player:0,opponent:0})};
    const matchup = {...next.matchup};
    for (const [side,key] of [['player','team'],['opponent','opponentSpecies']]) {
      const ids = next[key].slice(0,2);
      const current = matchup[side] == null ? -1 : ids.indexOf(matchup[side]);
      viewed[side] = current >= 0 ? current : ids[viewed[side]] ? viewed[side] : Math.max(0,ids.findIndex(Boolean));
      matchup[side] = ids[viewed[side]] ?? null;
    }
    if (viewed.player !== next.viewed?.player || viewed.opponent !== next.viewed?.opponent) next = {...next,viewed};
    if (matchup.player !== next.matchup.player || matchup.opponent !== next.matchup.opponent) next = {...next,matchup};
    const selections = {};
    for (let slot=0;slot<2;slot++) {
      if (!next.opponentSpecies[slot]) continue;
      const projected = {...next,matchup:{...next.matchup,opponent:next.opponentSpecies[slot]}};
      const sets = possibleMatchupSets(projected);
      const previous = next.selectedTrainer === state.selectedTrainer && next.selectedBrainSymbol === state.selectedBrainSymbol
        && next.opponentSpecies[slot] === state.opponentSpecies[slot] ? next.opponentSetSelections?.[slot] : null;
      selections[slot] = sets.some(set => frontierSetId(set) === previous) ? previous : sets[0] ? frontierSetId(sets[0]) : null;
    }
    const old = next.opponentSetSelections ?? {};
    if (Object.keys(old).length !== Object.keys(selections).length
      || Object.keys(selections).some(slot => old[slot] !== selections[slot])) next = {...next,opponentSetSelections:selections};
    const selected = selections[next.viewed.opponent] ?? null;
    if (next.selectedOpponentSetId !== selected) next = {...next,selectedOpponentSetId:selected};
  }
  // Synchronize only when the active opponent or its possible HP bounds change.
  // Clamp to the overall possible maximum, never independently to each set:
  // smaller incompatible candidates must retain their existing safeguards.
  if(next.selectedOpponentSetId!==state.selectedOpponentSetId || next.rules!==state.rules || next.matchup!==state.matchup
    || next.opponentSpecies!==state.opponentSpecies || next.opponentObservations!==state.opponentObservations
    || next.selectedTrainer!==state.selectedTrainer || next.selectedBrainSymbol!==state.selectedBrainSymbol) {
    const slot=activeConditionSlot(next,'enemy');
    const conditions=next.matchupConditions.enemy[slot];
    if(slot!==null && Number.isFinite(conditions?.currentHp)) {
      const range=opponentStatRanges(next,analysisMatchupSets(next))?.hp;
      if(range) {
        const hp=conditionHp(conditions.currentHp,range);
        if(hp!==conditions.currentHp)next={...next,matchupConditions:{...next.matchupConditions,
          enemy:{...next.matchupConditions.enemy,[slot]:{...conditions,currentHp:hp}}}};
      }
    }
  }
  return next;
}

function reduceBattleState(state, action) {
  switch (action.type) {
    case 'viewDoublesSlot': {
      if (state.rules.format !== 'Doubles' || !['player','opponent'].includes(action.side)
        || ![0,1].includes(action.slot)) return state;
      const ids = action.side === 'player' ? state.team : state.opponentSpecies;
      return ids[action.slot] ? {...state,viewed:{...state.viewed,[action.side]:action.slot},
        matchup:{...state.matchup,[action.side]:ids[action.slot]}} : state;
    }
    case 'selectDoublesPlayer':
      return state.rules.format === 'Doubles' && [0,1].includes(action.slot)
        ? reduceBattleState(state,{...action,type:'selectPlayerPosition'}) : state;
    case 'selectDoublesOpponent': {
      if (state.rules.format !== 'Doubles' || ![0,1].includes(action.slot) || !selectedTowerTrainer(state)) return state;
      const previousSpeciesId = state.opponentSpecies[action.slot];
      if (previousSpeciesId === action.speciesId) return state;
      return reduceBattleState(state,{...action,previousSpeciesId,
        type:action.speciesId === null ? 'clearOpponentSpeciesSlot' : previousSpeciesId ? 'replaceOpponentSpecies' : 'assignOpponentSpecies',
        ...(action.speciesId === null ? {speciesId:previousSpeciesId} : {})});
    }
    case 'selectOpponentSet':
      if (state.rules.format === 'Doubles') {
        const slot = action.slot ?? matchupOpponentSlot(state);
        if (![0,1].includes(slot) || !state.opponentSpecies[slot]) return state;
        const projected = {...state,matchup:{...state.matchup,opponent:state.opponentSpecies[slot]}};
        return possibleMatchupSets(projected).some(set => frontierSetId(set) === action.setId)
          ? {...state,opponentSetSelections:{...state.opponentSetSelections,[slot]:action.setId}} : state;
      }
      return usesSelectedSet(state) && possibleMatchupSets(state).some(set => frontierSetId(set) === action.setId)
        ? {...state,selectedOpponentSetId:action.setId} : state;
    case 'observationsOpen': return {...state,observationsExpanded:action.open};
    case 'resetObservations': {
      const slot = matchupOpponentSlot(state);
      if (slot === null) return state;
      const observations = {...state.opponentObservations};
      delete observations[slot];
      return {...state,opponentObservations:observations};
    }
    case 'observeOpponentAbility': {
      const slot=matchupOpponentSlot(state),value=action.value;
      if(slot===null || action.slot!==slot || action.speciesId!==state.opponentSpecies[slot] || typeof value!=='string')return state;
      const abilities=opponentAbilityOptions({id:action.speciesId}).values;
      if(abilities.length!==2 || value!==''&&!abilities.includes(value))return state;
      const observations=matchupObservations(state);
      return {...state,opponentObservations:{...state.opponentObservations,[slot]:{...observations,ability:value}}};
    }
    case 'observeOpponent': {
      const {field, value} = action;
      const slot = matchupOpponentSlot(state);
      if (slot === null || (action.slot !== undefined && action.slot !== slot)
        || (action.speciesId !== undefined && action.speciesId !== state.opponentSpecies[slot])
        || (field !== 'item' && (!Number.isInteger(field) || field < 0 || field > 3))
        || typeof value !== 'string' || (value && !observationChoices(state,field,{replace:!usesSelectedSet(state)}).includes(value))) return state;
      const observations = matchupObservations(state);
      // A stale native-select event must not promote newly inferred information.
      if (!usesSelectedSet(state) && possibleMatchupSets(state).length === 1 && !(field === 'item' ? observations.item : observations.moves[field])) return state;
      const moves = [...observations.moves];
      if (field !== 'item') moves[field] = value;
      return {...state, opponentObservations:{...state.opponentObservations,
        [slot]:{...observations, moves, ...(field === 'item' ? {item:value} : {})}}};
    }
    // Keep the existing slot-based calculation/condition contract, with just
    // one active choice in Singles. No separate roster is created or persisted.
    case 'selectSinglesPlayer': {
      if (state.rules.format !== 'Singles' || (action.identity !== null
        && !action.pool?.some(mon => mon.identity === action.identity))) return state;
      if (state.matchup.player === action.identity) return state;
      return {...state,team:action.identity ? [action.identity] : [],active:action.identity,
        teamInitialized:true,matchup:{...state.matchup,player:action.identity}};
    }
    case 'selectSinglesOpponent': {
      if (state.rules.format !== 'Singles' || !selectedTowerTrainer(state)
        || (action.speciesId !== null && !availableOpponentSpecies(state).some(mon => mon.id === action.speciesId))) return state;
      if (state.matchup.opponent === action.speciesId) return state;
      return {...state,opponentSpecies:action.speciesId ? [action.speciesId] : [],
        matchup:{...state.matchup,opponent:action.speciesId}};
    }
    case 'matchupPlayer':
      return action.identity && state.team.slice(0,state.rules.teamSize).includes(action.identity)
        ? {...state,matchup:{...state.matchup,player:action.identity}} : state;
    case 'matchupOpponent':
      return action.speciesId && state.opponentSpecies.slice(0,state.rules.teamSize).includes(action.speciesId)
        ? {...state,matchup:{...state.matchup,opponent:action.speciesId}} : state;
    case 'replaceOpponentSpecies':
    case 'assignOpponentSpecies': {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.rules.teamSize
        || (action.type === 'replaceOpponentSpecies'
          ? !action.previousSpeciesId || state.opponentSpecies?.[action.slot] !== action.previousSpeciesId
          : state.opponentSpecies?.[action.slot])
        || state.opponentSpecies?.includes(action.speciesId)
        || !availableOpponentSpecies(state).some(mon => mon.id === action.speciesId)) return state;
      const opponentSpecies = Array.from({length:Math.max(state.rules.teamSize, state.opponentSpecies?.length ?? 0)},
        (_, index) => state.opponentSpecies?.[index] ?? null);
      opponentSpecies[action.slot] = action.speciesId;
      return {...state, opponentSpecies, matchup:action.type === 'replaceOpponentSpecies' && state.matchup?.opponent === action.previousSpeciesId
        ? {...state.matchup,opponent:action.speciesId} : state.matchup};
    }
    case 'clearOpponentSpeciesSlot': {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.rules.teamSize
        || !action.speciesId || state.opponentSpecies?.[action.slot] !== action.speciesId) return state;
      const opponentSpecies = [...state.opponentSpecies];
      opponentSpecies[action.slot] = null;
      return {...state, opponentSpecies, matchup:state.matchup?.opponent === action.speciesId
        ? {...state.matchup,opponent:opponentSpecies.slice(0,state.rules.teamSize).find(Boolean) ?? null} : state.matchup};
    }
    case 'rules': {
      if (!action.patch || Object.keys(action.patch).some(key => !['facility','format','levelMode','openLevel'].includes(key))) return state;
      try {
        const rules = createTowerRules({...state.rules, ...action.patch});
        if (['facility','format','levelMode','openLevel'].every(key => rules[key] === state.rules[key])) return state;
        if (rules.format !== state.rules.format) {
          const fresh = createBattleState();
          return {...state,...fresh,rules,round:state.round,tab:state.tab,teamInitialized:true,
            opponentReset:(state.opponentReset ?? 0)+1};
        }
        return resetOpponent({...state,rules});
      }
      catch { return state; }
    }
    case 'round':
      return !battleRounds.includes(action.value) || action.value === (state.round ?? '') ? state
        : resetOpponent({...state,round:action.value});
    case 'loadTeam':
      return validateTeam(action.team, action.records, state.rules.teamSize) ? state : {...state, team:[...action.team.ids], active:action.team.ids[0], teamInitialized:true, tab:'Matchup'};
    case 'opponentTrainer': {
      const entry = towerTrainerEntries.find(trainer => trainer.key === action.key);
      if (!entry || !towerRoundTrainerEligible(entry,state) || !towerTrainerSupportsFormat(entry,state.rules.format)
        || (state.selectedTrainer === entry.trainer && state.selectedBrainSymbol === entry.symbol)) return state;
      return {...state, selectedTrainer:entry.trainer, selectedBrainSymbol:entry.symbol,
        opponentSpecies:[], opponents:[], enemy:null, opponentObservations:{},
        matchup:{...state.matchup,opponent:null}, setSearch:{query:'',hiddenIds:[]}};
    }
    case 'clearOpponentTrainer':
      return state.selectedTrainer === null && state.selectedBrainSymbol === null && !state.opponents.length && state.enemy === null && !state.opponentSpecies?.length ? state
        : {...state, selectedTrainer:null, selectedBrainSymbol:null, opponents:[], enemy:null, opponentSpecies:[]};
    case 'trainer': {
      const entry = towerTrainerEntries.find(trainer => trainer.key === action.key);
      return entry && towerRoundTrainerEligible(entry,state) && towerTrainerSupportsFormat(entry,state.rules.format) ? {...selectTowerTrainer(state, entry.trainer), selectedBrainSymbol:entry.symbol, tab:'Sets', setSearch:{query:'', hiddenIds:[]}} : state;
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
    case 'selectPlayerPosition': {
      const count = state.rules.teamSize;
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot >= count
        || (action.identity !== null && (!action.pool?.some(mon => mon.identity === action.identity)
          || state.team.some((id,index) => index !== action.slot && id === action.identity)))) return state;
      const team = [...state.team];
      team[action.slot] = action.identity;
      const current = state.matchup?.player;
      const player = current && current !== state.team[action.slot] && team.slice(0,count).includes(current)
        ? current : action.identity ?? team.slice(0,count).find(Boolean) ?? null;
      return {...state,team,active:player,teamInitialized:true,matchup:{...state.matchup,player}};
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
    default: return reduceMatchupCondition(reduceCondition(state,action),action);
  }
}

// Round and non-format rule changes clear opponent choices only. Format changes
// start a fresh battle above, including player selections and all conditions.
function resetOpponent(state) {
  return {...state,selectedOpponentSetId:null,opponentSetSelections:{},selectedTrainer:null,selectedBrainSymbol:null,opponents:[],enemy:null,
    opponentSpecies:[],opponentObservations:{},matchup:{...state.matchup,opponent:null},
    setSearch:{query:'',hiddenIds:[]},opponentReset:(state.opponentReset ?? 0)+1};
}
