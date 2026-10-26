import {isTraceAbility} from './conditionalAbilities.js';
// Session-only conditions. Null HP means full HP, retaining the full range when
// the opponent's set is uncertain. Explicit HP is never replaced by inference.
export const defaultSlotConditions = () => ({currentHp:null,status:'none',stages:{},helpingHand:false});
export const defaultSideConditions = () => ({activeCount:2,screens:{}});
// Liveness belongs to the existing battlefield occupant and its HP override.
// Missing/null HP retains the full-HP default; only explicit zero is fainted.
export function battlefieldSlotLiveness(state,side,slot) {
  const ids = side === 'player' ? state.team : state.opponentSpecies;
  const count = state.rules.format === 'Doubles' ? 2 : 1;
  if (!['player','enemy'].includes(side) || !Number.isInteger(slot) || slot < 0 || slot >= count || ids?.[slot] == null) return 'empty';
  return state.matchupConditions?.[side]?.[slot]?.currentHp === 0 ? 'fainted' : 'active';
}
export function livingBattlefieldCount(state,side) {
  const count = state.rules.format === 'Doubles' ? 2 : 1;
  return Array.from({length:count},(_,slot)=>battlefieldSlotLiveness(state,side,slot)).filter(value=>value === 'active').length;
}
export function sideConditions(state,side) {
  const saved = state.matchupSides?.[side] ?? defaultSideConditions();
  // Legacy stored counts are ignored in Doubles; assignments and HP own liveness.
  return state.rules.format === 'Doubles' ? {...saved,activeCount:livingBattlefieldCount(state,side)} : saved;
}
function patchSide(state,side,patch) {
  return {...state,matchupSides:{...state.matchupSides,[side]:{...(state.matchupSides?.[side] ?? defaultSideConditions()),...patch}}};
}
export function matchupBattleContext(state,attackingSide) {
  return state.rules.format==='Doubles' && ['player','enemy'].includes(attackingSide)
    ? {...state.rules,defenderSideAlive:sideConditions(state,attackingSide==='player'?'enemy':'player').activeCount}
    : state.rules;
}
export function activeConditionSlot(state, side) {
  const ids = side === 'player' ? state.team : state.opponentSpecies;
  const identity = state.matchup?.[side === 'player' ? 'player' : 'opponent'];
  const slot = ids.slice(0,state.rules.teamSize).indexOf(identity);
  return identity != null && slot >= 0 ? slot : null;
}
export function slotConditions(state,side,slot) {
  // Read-only projection for existing callers; screens have one side-wide owner.
  return {...(state.matchupConditions?.[side]?.[slot] ?? defaultSlotConditions()),screens:sideConditions(state,side).screens};
}
export function conditionHp(value, range) {
  if (value == null || typeof value === 'string' && value.trim() === '') return null;
  const hp = Number(value);
  return Number.isFinite(hp) ? Math.max(0,Math.min(range?.max ?? Infinity,Math.trunc(hp))) : null;
}
export function reconcileSlotConditions(previous,next) {
  const conditions = next.matchupConditions ?? {player:{},enemy:{}};
  const resetOpponent = previous.selectedTrainer !== next.selectedTrainer || previous.selectedBrainSymbol !== next.selectedBrainSymbol;
  if (!resetOpponent && previous.team === next.team && previous.opponentSpecies === next.opponentSpecies) return next;
  const reconciled = Object.fromEntries(['player','enemy'].map(side => {
    const key = side === 'player' ? 'team' : 'opponentSpecies';
    const kept = Object.fromEntries(Object.entries(conditions[side]).filter(([slot]) =>
      !(side === 'enemy' && resetOpponent) && next[key][slot] && next[key][slot] === previous[key][slot]));
    return [side,Object.keys(kept).length === Object.keys(conditions[side]).length ? conditions[side] : kept];
  }));
  return reconciled.player === conditions.player && reconciled.enemy === conditions.enemy ? next : {...next,matchupConditions:reconciled};
}
export function reduceMatchupCondition(state,action) {
  if (action.type === 'resetMatchupConditions') {
    const conditions = {...state.matchupConditions};
    for (const side of ['player','enemy']) {
      const slot = activeConditionSlot(state,side);
      if (slot !== null) conditions[side] = {...conditions[side],[slot]:defaultSlotConditions()};
    }
    const matchupSides=Object.fromEntries(['player','enemy'].map(side=>[side,{...(state.matchupSides?.[side] ?? defaultSideConditions()),screens:{},
      ...(state.rules.format==='Doubles'?{activeCount:2}:{})}]));
    return {...state,field:{...state.field,weather:'none',critical:false},matchupConditions:conditions,matchupSides};
  }
  // Old callers cannot override the count derived from current battlefield slots.
  if(action.type==='matchupActiveCount') return state;
  if (action.type !== 'matchupCondition' || !['player','enemy'].includes(action.side)) return state;
  const slot = activeConditionSlot(state,action.side);
  if (slot === null || action.slot !== slot) return state;
  const current = state.matchupConditions?.[action.side]?.[slot] ?? defaultSlotConditions();
  let patch;
  if (action.field === 'currentHp' && (action.value === null || Number.isFinite(action.value))) patch = {currentHp:conditionHp(action.value,Number.isFinite(action.max) ? {max:action.max} : null)};
  if (action.field === 'helpingHand' && state.rules.format==='Doubles' && typeof action.value==='boolean') patch={helpingHand:action.value};
  if (action.field === 'status' && ['none','burn','poison','toxic','paralysis','sleep','freeze'].includes(action.value)) patch = {status:action.value};
  if (action.field === 'stage' && ['attack','defense','spAttack','spDefense','speed'].includes(action.stat)
    && Number.isInteger(action.value) && Math.abs(action.value)<=6) patch = {stages:{...current.stages,[action.stat]:action.value}};
  if (action.field === 'screen' && ['reflect','lightScreen'].includes(action.screen) && typeof action.value === 'boolean') return patchSide(state,action.side,{screens:{...sideConditions(state,action.side).screens,[action.screen]:action.value}});
  if (action.field==='abilityContext' && typeof action.context==='string' && current.abilityState?.context!==action.context)
    patch={abilityState:{context:action.context,copiedAbility:null,flashFireActivated:false}};
  if (action.context===current.abilityState?.context) {
    if(action.field==='copiedAbility' && (action.value===null||isTraceAbility(action.value)))
      patch={abilityState:{...current.abilityState,copiedAbility:action.value,flashFireActivated:false}};
    if(action.field==='flashFireActivated' && typeof action.value==='boolean')
      patch={abilityState:{...current.abilityState,flashFireActivated:action.value}};
  }
  return patch ? {...state,matchupConditions:{...state.matchupConditions,[action.side]:{...state.matchupConditions?.[action.side],[slot]:{...current,...patch}}}} : state;
}
