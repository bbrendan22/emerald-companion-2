import {doublesBattlefieldContext} from '../../battle/battlefieldContext.js';
import {matchupDisplayStats} from '../../battle/matchupDisplayStats.js';
import BattleOpponentAbilityControl from './BattleOpponentAbilityControl.jsx';
import {projectAbilityConditions} from '../../battle/conditionalAbilities.js';
import {playerAbilityOptions,opponentAbilityOptions} from '../../battle/abilityScenarios.js';
import {activeConditionSlot,slotConditions,matchupBattleContext} from '../../battle/matchupConditions.js';
import React, {useEffect,useRef,useState} from 'react';
import BattleMoveDetails from './BattleMoveDetails.jsx';
import {opponentSpeciesById} from '../../battle/opponentSpecies.js';
import {publicAsset} from '../../assets/publicAsset.js';
import {speciesTypes, reference, battleMove} from '../../battle/reference.js';
import {moveTypeMatchup} from '../../battle/moveTypeMatchup.js';
import {opponentMoveInputs, opponentStatRanges, opponentStatDisplay} from '../../battle/opponentStats.js';
import {identifiedMatchup,usesSelectedSet} from '../../battle/towerSets.js';
import MoveTypeIcon from './MoveTypeIcon.jsx';
import {frontierStatReference} from '../../battle/frontierStatReference.js';
import BattleStatRow from './BattleStatRow.jsx';
import BattleSetItem from './BattleSetItem.jsx';
import BattleObservationControl from './BattleObservationControl.jsx';

function Position({onSwitch, viewedSlot, compactHeader, label, mon, other, state, dispatch, identification, statReference, displayStats, speedComparison, onMove}) {
  const moveGesture=useRef(null);
  return <div className="battle-matchup-position" role="group" aria-label={label}>
    {mon ? <>
      {compactHeader && <div className="battle-active-header">
        <div className="battle-active-types" aria-label="Types">
          {mon.types?.map(type => <MoveTypeIcon key={type} type={type} size={14} />)}
        </div>
        <small className="battle-active-level">Lv. {mon.level}</small>
      </div>}
      {onSwitch ? <button type="button" className="battle-active-artwork battle-sprite-switch"
        aria-label={`Switch ${label === 'My matchup Pokémon' ? 'player' : 'opponent'} viewed Pokémon; currently ${mon.name}, Slot ${viewedSlot + 1}`}
        onClick={onSwitch}>
        <img className="battle-matchup-sprite" src={publicAsset(`/pokemon/emerald/${mon.shiny ? 'shiny' : 'normal'}/${mon.dex}.png`)}
          alt={`${mon.name} front sprite`} draggable="false" />
        <span className="battle-sprite-dots" aria-hidden="true">{[0,1].map(slot=><span key={slot} data-active={slot === viewedSlot ? 'true' : undefined} />)}</span>
      </button> : <div className="battle-active-artwork">
        <img className="battle-matchup-sprite" src={publicAsset(`/pokemon/emerald/${mon.shiny ? 'shiny' : 'normal'}/${mon.dex}.png`)}
          alt={`${mon.name} front sprite`} draggable="false" />
      </div>}
      <>{!compactHeader && <div className="battle-active-types" aria-label="Types">
        {mon.types?.map(type => <MoveTypeIcon key={type} type={type} size={14} />)}
      </div>}</>
      <div className="battle-active-facts">
        <div className="battle-active-ability">{identification?<BattleOpponentAbilityControl mon={mon} state={state} dispatch={dispatch}/>:mon.ability ?? '—'}</div>
        <div className="battle-active-item">{identification ? usesSelectedSet(state) ? <BattleSetItem name={identification.item || '—'} /> : <BattleObservationControl state={state} dispatch={dispatch} field="item"
          value={identification.item} observed={Boolean(identification.observations.item)} identified={identification.sets.length === 1} />
          : mon.item ? <BattleSetItem name={mon.item} /> : '—'}</div>
      </div>
      <BattleStatRow values={displayStats ?? mon.stats} referenceRanges={statReference} speedComparison={speedComparison} />
      <ul className="battle-active-moves" aria-label="Moves"
        onPointerDownCapture={event=>{
          moveGesture.current=null;
          if(event.pointerType!=='touch' || !event.isPrimary || event.button!==0)return;
          // Safari may retarget a compatibility click to a nearby previous
          // button. Resolve the intended row from the actual gesture location.
          const hit=document.elementFromPoint(event.clientX,event.clientY);
          if(hit?.closest('select'))return;
          const index=[...event.currentTarget.children].findIndex(row=>{
            const r=row.getBoundingClientRect();
            return row.classList.contains('has-move-info') && event.clientX>=r.left && event.clientX<r.right
              && event.clientY>=r.top && event.clientY<r.bottom;
          });
          if(index>=0)moveGesture.current={index,id:event.pointerId,x:event.clientX,y:event.clientY};
        }}
        onPointerMoveCapture={event=>{
          const start=moveGesture.current;
          if(start && (event.pointerId!==start.id || Math.hypot(event.clientX-start.x,event.clientY-start.y)>=8))moveGesture.current=null;
        }}
        onPointerCancelCapture={()=>{moveGesture.current=null;}}
        onClickCapture={event=>{
          const gesture=moveGesture.current;moveGesture.current=null;
          if(!gesture || event.detail===0)return;
          event.preventDefault();event.stopPropagation();
          onMove(gesture.index);
        }}>
        {Array.from({length:4}, (_, index) => {
          const move = identification ? battleMove(identification.moves[index]) : mon.moves?.[index];
          const effectiveness = moveTypeMatchup(move, other?.types, mon.ivs,
            other?.ability?.split(' / ') ?? [], mon.ability?.split(' / ') ?? []);
          // Remaining opponent PP is unknown; its reference base PP is known.
          const pp = identification ? move?.pp : move?.currentPp;
          return <li key={index} className={move?'has-move-info':undefined} onClick={move ? event=>{
            if (!event.target.closest('select,button')) onMove(index);
          } : undefined}>
            <MoveTypeIcon type={effectiveness.type ?? move?.type} moveId={move?.id} moveName={move?.name} size={16} />
            {identification && !usesSelectedSet(state) ? <BattleObservationControl state={state} dispatch={dispatch} field={index}
            value={identification.moves[index]} observed={Boolean(identification.observations.moves[index])} identified={identification.sets.length === 1} onMoveInfo={move?()=>onMove(index):undefined} />
            : move ? <button type="button" className="battle-active-move-name battle-move-info-name" title={move.name} aria-label={`Move information: ${move.name}`} aria-haspopup="dialog"
              onClick={()=>onMove(index)}>{move.name}</button> : <span className="battle-active-move-name">—</span>}
            <span className="battle-active-move-pp" title={pp == null ? undefined : `${identification ? 'Base' : 'Current'} PP: ${pp}`}>
              {identification && !move ? '' : pp == null ? '—' : `PP ${pp}`}</span>
            <span className="battle-active-move-effectiveness" data-effectiveness={effectiveness.multiplier} title={identification && !move ? undefined : effectiveness.label}>
              {identification && !move ? '' : effectiveness.label.replace(/^0\./,'.')}</span>
          </li>;
        })}
      </ul>
    </> : null}
  </div>;
}

export default function BattleMatchup({state, records, dispatch}) {
  const player = state.team.slice(0,state.rules.teamSize).includes(state.matchup?.player)
    ? records.find(mon => mon.identity === state.matchup.player) : null;
  const species = state.opponentSpecies.slice(0,state.rules.teamSize).includes(state.matchup?.opponent)
    ? opponentSpeciesById(state.matchup.opponent) : null;
  const abilities = species ? [...new Set(reference.species[species.id]?.abilities ?? [])]
    .map(id => reference.abilityNames[id]).filter(Boolean) : [];
  const identification = identifiedMatchup(state);
  const statReference = frontierStatReference(state.rules);
  const opponent = species ? {...species,...opponentMoveInputs(state,identification.sets),item:identification.item || null,types:speciesTypes(species.dex),level:state.rules.opponentLevel,ability:identification.observations.ability||abilities.join(' / '),
    stats:opponentStatDisplay(opponentStatRanges(state,identification.sets))} : null;
  // Project current Battle Conditions, including defender-side screens, without
  // mutating raw/save stats; screens project from their shared side state.
  const playerConditions = slotConditions(state,'player',activeConditionSlot(state,'player'));
  const opponentConditions = slotConditions(state,'enemy',activeConditionSlot(state,'enemy'));
  const stagedPlayer = player ? {...projectAbilityConditions({...player,abilityOptions:playerAbilityOptions(player)},playerConditions),helpingHand:playerConditions.helpingHand,stages:playerConditions.stages,screens:playerConditions.screens,status:playerConditions.status,currentHp:playerConditions.currentHp === null ? player.stats?.hp : playerConditions.currentHp,abilityOptions:playerAbilityOptions(player)} : null;
  const stagedOpponent = opponent ? {...projectAbilityConditions({...opponent,abilityOptions:opponentAbilityOptions(opponent,identification.sets,identification.observations.ability??'')},opponentConditions),helpingHand:opponentConditions.helpingHand,stages:opponentConditions.stages,screens:opponentConditions.screens,status:opponentConditions.status,currentHp:opponentConditions.currentHp === null ? opponent.stats?.hp : opponentConditions.currentHp,abilityOptions:opponentAbilityOptions(opponent,identification.sets,identification.observations.ability??'')} : null;
  const battlefield=React.useMemo(()=>doublesBattlefieldContext(state,records),[state,records]);
  const display=matchupDisplayStats({player:stagedPlayer?{...stagedPlayer,currentHp:playerConditions.currentHp}:null,opponent:stagedOpponent?{...stagedOpponent,currentHp:opponentConditions.currentHp}:null,state,sets:identification.sets,battlefield});
  const [selectedMove,setSelectedMove]=useState(null);
  const context=`${state.selectedOpponentSetId}:${player?.identity}:${species?.id}:${state.selectedTrainer}:${state.selectedBrainSymbol}`;
  useEffect(()=>{setSelectedMove(null);},[context]);
  const selected=selectedMove?.context===context ? selectedMove : null;
  const move=selected ? selected.side==='player' ? player?.moves?.[selected.index]
    :identification.moves.some(name=>battleMove(name)?.id===selected.moveId)?battleMove(selected.moveId):null : null;
  useEffect(()=>{if(selected&&!move)setSelectedMove(null);},[selected,move]);
  const switchView = side => {
    const ids = side === 'player' ? state.team : state.opponentSpecies;
    if (state.rules.format !== 'Doubles' || !ids[0] || !ids[1]) return undefined;
    return () => dispatch({type:'viewDoublesSlot',side,slot:state.viewed[side] === 0 ? 1 : 0});
  };
  return <><div className="battle-matchup-pair">
    <Position onSwitch={switchView('player')} viewedSlot={state.viewed?.player} compactHeader={state.rules.format === 'Singles'} displayStats={display.player} speedComparison={display.speed.player} statReference={statReference} label="My matchup Pokémon" mon={player} other={opponent} onMove={index=>setSelectedMove({side:'player',index,context})} />
    <Position onSwitch={switchView('opponent')} viewedSlot={state.viewed?.opponent} compactHeader={state.rules.format === 'Singles'} displayStats={display.opponent} speedComparison={display.speed.opponent} statReference={statReference} label="Opponent matchup Pokémon" state={state} dispatch={dispatch} identification={identification} mon={opponent} other={player} onMove={index=>setSelectedMove({side:'enemy',index,context,moveId:battleMove(identification.moves[index])?.id})} />
  </div>
  {species && !identification.sets.length && <p className="battle-observation-warning" role="status">
    No matching sets.</p>}
  {move && <BattleMoveDetails battleRules={matchupBattleContext(state,selected.side)} critical={state.field?.critical} weather={state.field?.weather} move={move} attacker={selected.side==='player'?stagedPlayer:stagedOpponent} defender={selected.side==='player'?stagedOpponent:stagedPlayer}
    frontierState={state.rules.facility==='Tower'&&state.selectedTrainer&&species?state:undefined} frontierPlayer={player} frontierRecords={records} frontierDirection={selected.side}
    onClose={()=>setSelectedMove(null)} />}
  </>;
}
