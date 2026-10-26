import {invalidTraceSelections} from '../battle/traceTargets.js';
import {useEffect, useMemo, useReducer, useState} from 'react';
import {battleReducer, createBattleState} from '../battle/battleState.js';
import {toBattlePokemon} from '../battle/pokemonAdapter.js';
import {identifyPokemon, loadRoles} from '../storage/pokemonRoles.js';

// App owns this hook so leaving Battle does not discard teams, rules or tab state.
// Rules and Round live in memory until a fresh page load; saved team presets persist.
export default function useBattleState(snapshot, visible) {
  const [state, dispatch] = useReducer(battleReducer, undefined, createBattleState);
  const [roleError, setRoleError] = useState('');
  const [frontierPool, setFrontierPool] = useState([]);
  const records = useMemo(() => identifyPokemon(snapshot?.collection.records ?? []).map(toBattlePokemon).filter(Boolean), [snapshot]);
  useEffect(()=>{
    if(invalidTraceSelections(state,records).length)dispatch({type:'reconcileTraceSelections',records});
  },[state,records]);
  useEffect(() => {
    if (!visible) return;
    let roles = {};
    try { roles = loadRoles(window.localStorage); setRoleError(''); }
    catch { setRoleError('Saved Frontier roles could not be loaded.'); }
    const pool = records.filter(mon => roles[mon.identity] === 'Frontier');
    setFrontierPool(pool);
    dispatch({type:'collection', records, pool, frontierOnly:true, preserveSlots:true});
  }, [records, visible]);
  return {state, dispatch, records, roleError, frontierPool};
}
