import React, {useId, useLayoutEffect, useRef, useState} from 'react';
import BattleSearchPopup from './BattleSearchPopup.jsx';
import {possibleMatchupSets, frontierSetId, towerSetLabel, matchupOpponentSlot, matchupObservations} from '../../battle/towerSets.js';
import {speciesByName, battleMove} from '../../battle/reference.js';
import {publicAsset} from '../../assets/publicAsset.js';
import BattleSetItem from './BattleSetItem.jsx';
import MoveTypeIcon from './MoveTypeIcon.jsx';

export default function BattlePossibleSets({state}) {
  const [opened, setOpened] = useState(null);
  const trigger = useRef(null), id = useId();
  const sets = possibleMatchupSets(state);
  // A popup belongs to its original species/trainer context, never a stale set.
  const context = `${matchupOpponentSlot(state)}:${state.matchup?.opponent}:${state.selectedTrainer}:${state.selectedBrainSymbol}:${JSON.stringify(matchupObservations(state))}`;
  useLayoutEffect(() => {setOpened(null);}, [context]);
  const set = opened?.context === context ? sets.find(entry => frontierSetId(entry) === opened.id) : null;
  const close = () => {setOpened(null); trigger.current?.focus({preventScroll:true});};
  const species = set && speciesByName.get(set.species.toLowerCase());
  if (sets.length === 1) return null;
  return <section className="battle-possible-sets" aria-label="Possible Sets">
    <h2 className="battle-section-heading">Possible Sets</h2>
    <div className="battle-possible-set-list">
      {sets.map(entry => <button key={frontierSetId(entry)} type="button" data-set-id={frontierSetId(entry)}
        aria-haspopup="dialog" aria-expanded={set === entry} onClick={event => {
          trigger.current = event.currentTarget;
          setOpened(set === entry ? null : {context,id:frontierSetId(entry)});
        }}>{towerSetLabel(entry)}</button>)}
      {!sets.length && <p className="battle-possible-sets-empty">{state.matchup?.opponent ? 'No possible sets.' : '—'}</p>}
    </div>
    {set && <BattleSearchPopup trigger={trigger} id={id} label={towerSetLabel(set)} resultsLabel="Set details" onClose={close}>
      <div className="battle-set-details">
        <div className="battle-set-details-heading">
          {species && <img src={publicAsset(`/pokemon/emerald/normal/${species.nationalDexId}.png`)} width="48" height="48" alt="" />}
          <strong>{towerSetLabel(set)}</strong>
        </div>
        <dl>
          {set.possibleAbility && <div><dt>Ability</dt><dd>{set.possibleAbility}</dd></div>}
          {set.item && <div><dt>Held item</dt><dd><BattleSetItem name={set.item} /></dd></div>}
        </dl>
        <ul aria-label="Moves">{set.moves.filter(Boolean).slice(0,4).map((move,index) => <li key={index}>
          <MoveTypeIcon type={battleMove(move)?.type} moveName={move} size={16} /><span>{move}</span>
        </li>)}</ul>
      </div>
    </BattleSearchPopup>}
  </section>;
}
