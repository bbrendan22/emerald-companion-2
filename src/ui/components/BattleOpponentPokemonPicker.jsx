import React, {useId, useState} from 'react';
import BattleSearchPopup from './BattleSearchPopup.jsx';
import {availableOpponentSpecies} from '../../battle/opponentSpecies.js';
import {publicAsset} from '../../assets/publicAsset.js';

export default function BattleOpponentPokemonPicker({state, trigger, onSelect, onRemove, onClose}) {
  const [query, setQuery] = useState('');
  const id = useId();
  const species = availableOpponentSpecies(state, query);
  return <BattleSearchPopup trigger={trigger} id={id} label="Select opponent Pokémon"
    searchLabel="Search opponent Pokémon" placeholder="Search Pokémon" query={query} onQuery={setQuery}
    resultsLabel="Tower Pokémon species" onClose={onClose}>
    {onRemove && <button type="button" className="battle-opponent-result" onClick={onRemove}>Remove Pokémon</button>}
    {species.map(mon => <button type="button" key={mon.id} className="battle-opponent-result battle-opponent-pokemon-result"
      aria-label={`Select Pokémon ${mon.name}`} disabled={state.opponentSpecies?.includes(mon.id)}
      onClick={() => {if (!state.opponentSpecies?.includes(mon.id)) onSelect(mon.id);}}>
      <img src={publicAsset(`/pokemon/emerald/normal/${mon.dex}.png`)} width="32" height="32" alt="" loading="lazy" />
      <span>{mon.name}</span>
    </button>)}
    {!species.length && <p role="status" className="battle-opponent-no-results">{!availableOpponentSpecies(state).length ? 'No eligible Pokémon for this trainer under the current rules.' : 'No Pokémon found.'}</p>}
  </BattleSearchPopup>;
}
