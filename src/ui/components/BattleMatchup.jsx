import React from 'react';
import {opponentSpeciesById} from '../../battle/opponentSpecies.js';
import {publicAsset} from '../../assets/publicAsset.js';

function Position({label, mon}) {
  return <div className="battle-matchup-position" role="group" aria-label={label}>
    {mon ? <>
      <img className="battle-matchup-sprite" src={publicAsset(`/pokemon/emerald/${mon.shiny ? 'shiny' : 'normal'}/${mon.dex}.png`)}
        alt={`${mon.name} front sprite`} draggable="false" />
      <span className="battle-matchup-species">{mon.name}</span>
      <small>Lv. {mon.level}</small>
    </> : null}
  </div>;
}

export default function BattleMatchup({state, records}) {
  const player = state.team.slice(0,state.rules.teamSize).includes(state.matchup?.player)
    ? records.find(mon => mon.identity === state.matchup.player) : null;
  const species = state.opponentSpecies.slice(0,state.rules.teamSize).includes(state.matchup?.opponent)
    ? opponentSpeciesById(state.matchup.opponent) : null;
  return <div className="battle-matchup-pair">
    <Position label="My matchup Pokémon" mon={player} />
    <Position label="Opponent matchup Pokémon" mon={species ? {...species,level:state.rules.opponentLevel} : null} />
  </div>;
}
