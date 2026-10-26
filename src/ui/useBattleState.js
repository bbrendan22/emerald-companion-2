import {useEffect, useMemo, useReducer, useState} from 'react';
import {battleReducer, createBattleState} from '../battle/battleState.js';
import {loadBattleRound, storeBattleRound, loadBattleRules, storeBattleRules} from '../storage/battleRules.js';
import {toBattlePokemon} from '../battle/pokemonAdapter.js';
import {identifyPokemon, loadRoles} from '../storage/pokemonRoles.js';

// App owns this hook so leaving Battle does not discard teams, rules or tab state.
// Active selections are session-only; rules and saved team presets persist.
export default function useBattleState(snapshot, visible) {
  const [state, dispatch] = useReducer(battleReducer, undefined, () => ({...createBattleState(), round:loadBattleRound(window.localStorage), rules:loadBattleRules(window.localStorage)}));
  useEffect(() => {
    storeBattleRules(window.localStorage, state.rules);
  }, [state.rules]);
  useEffect(() => {storeBattleRound(window.localStorage,state.round);},[state.round]);
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
    dispatch({type:'collection', records, pool, frontierOnly:true, preserveSlots:true});
  }, [records, visible]);
  return {state, dispatch, records, roleError, frontierPool};
}
