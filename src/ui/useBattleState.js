import {useEffect, useMemo, useReducer, useState} from 'react';
import {battleReducer, createBattleState} from '../battle/battleState.js';
import {toBattlePokemon} from '../battle/pokemonAdapter.js';
import {identifyPokemon, loadRoles} from '../storage/pokemonRoles.js';

// App owns this hook so leaving Battle does not discard teams, rules or tab state.
// Battle selections remain session state; saved team definitions persist separately.
export default function useBattleState(snapshot, visible) {
  const [state, dispatch] = useReducer(battleReducer, undefined, createBattleState);
  const [roleError, setRoleError] = useState('');
  const [frontierPool, setFrontierPool] = useState([]);
  const records = useMemo(() => identifyPokemon(snapshot?.collection.records ?? []).map(toBattlePokemon).filter(Boolean), [snapshot]);
  useEffect(() => {
    if (!visible) return;
    let roles = {};
    try { roles = loadRoles(window.localStorage); setRoleError(''); }
    catch { setRoleError('Saved Frontier roles could not be loaded.'); }
    const pool = records.filter(mon => roles[mon.identity] === 'Frontier');
    setFrontierPool(pool);
    dispatch({type:'collection', records, pool});
  }, [records, visible]);
  return {state, dispatch, records, roleError, frontierPool};
}
