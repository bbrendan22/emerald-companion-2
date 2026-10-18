// Projection of the shared Battle state into the existing Gen 3 engine shape.
// HP/status belong to identities; stages/screens belong to sides (manual switches).
export const conditionWeather = [['none','None'],['sun','Sun'],['rain','Rain'],['sand','Sandstorm'],['hail','Hail']];
export const conditionStatuses = [['none','None'],['burn','Burn'],['paralysis','Paralysis'],['poison','Poison'],['toxic','Bad poison'],['sleep','Sleep'],['freeze','Freeze']];
export const conditionStats = [['attack','Atk'],['defense','Def'],['spAttack','SpA'],['spDefense','SpD'],['speed','Spe']];
export const conditionKey = (mon,side) => side === 'player' ? `my-${mon.identity}` : `enemy-${mon.setId}`;
export function clampConditionHp(value,max) { return Math.max(0,Math.min(max,Math.trunc(Number(value)||0))); }
export function conditionedBattlePokemon(mon,side,state) {
  if (!mon) return null;
  const key=conditionKey(mon,side), own=state.conditionsByPokemon[key] ?? {}, field=state.field;
  return {...mon, currentHp:clampConditionHp(state.hpByPokemon[key] ?? mon.initialCurrentHp ?? mon.currentHp ?? mon.stats.hp,mon.stats.hp),
    status:own.status ?? 'none', stages:{...(own.stages ?? {}),...(field[`${side}Stages`] ?? {})},
    screens:{...(field[`${side}Screens`] ?? {})}, weather:field.weather, critical:field.critical};
}
export function reduceCondition(state,action) {
  const validSide=['player','enemy'].includes(action.side);
  switch(action.type) {
    case 'conditionsOpen': return {...state,conditionsExpanded:Boolean(action.open)};
    case 'conditionField':
      if (action.key === 'weather' && conditionWeather.some(([key])=>key===action.value)
        || action.key === 'critical' && typeof action.value === 'boolean') return {...state,field:{...state.field,[action.key]:action.value}};
      return state;
    case 'conditionHp':
      return typeof action.key === 'string' && /^(my|enemy)-./.test(action.key) && Number.isFinite(Number(action.value)) && Number.isInteger(action.max) && action.max>0
        ? {...state,hpByPokemon:{...state.hpByPokemon,[action.key]:clampConditionHp(action.value,action.max)}} : state;
    case 'conditionStatus':
      return typeof action.key === 'string' && /^(my|enemy)-./.test(action.key) && conditionStatuses.some(([value])=>value===action.value)
        ? {...state,conditionsByPokemon:{...state.conditionsByPokemon,[action.key]:{...state.conditionsByPokemon[action.key],status:action.value}}} : state;
    case 'conditionStage': {
      const value=Number(action.value), key=`${action.side}Stages`;
      return validSide && conditionStats.some(([stat])=>stat===action.stat) && Number.isInteger(value) && value>=-6 && value<=6
        ? {...state,field:{...state.field,[key]:{...state.field[key],[action.stat]:value}}} : state;
    }
    case 'conditionScreen': {
      const key=`${action.side}Screens`;
      return validSide && ['reflect','lightScreen'].includes(action.screen) && typeof action.value === 'boolean'
        ? {...state,field:{...state.field,[key]:{...state.field[key],[action.screen]:action.value}}} : state;
    }
    default:return state;
  }
}
