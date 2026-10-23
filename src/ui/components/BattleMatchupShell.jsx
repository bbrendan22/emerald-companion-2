import MoveTypeIcon from './MoveTypeIcon.jsx';
import PokemonName from './PokemonName.js';
import {publicAsset} from '../../assets/publicAsset.js';
import React, {useState, useEffect, useMemo} from 'react';
import {toTowerOpponent} from '../../battle/frontierAdapter.js';
import {towerSetById} from '../../battle/towerSets.js';
import {conditionedBattlePokemon} from '../../battle/conditionState.js';
import {possibleAbilities,battleTypeValues} from '../../battle/battleConditions.js';
import BattleConditions from './BattleConditions.jsx';
import BattleMoveDetails from './BattleMoveDetails.jsx';
import {matchupStats, frontierStatRanges, matchupBarPercent, stagedMatchupStats, effectiveFasterSide, movePpLabel, matchupEffectiveness} from '../../battle/matchupPresentation.js';
import {battleItemId} from '../../battle/itemLookup.js';

const normalize = name => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function AlternatingAbility({ability, active}) {
  const abilities = [...new Set(possibleAbilities({ability}))];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active || abilities.length < 2) return;
    const timer = setInterval(() => setIndex(i => (i+1)%abilities.length),3000);
    return () => clearInterval(timer);
  },[ability, active, abilities.length]);
  const uncertain = abilities.length > 1;
  return <span className="battle-matchup-ability" role={uncertain ? 'img' : undefined} aria-label={uncertain ? `Possible abilities: ${abilities.join(' or ')}` : undefined} title={uncertain ? `Possible: ${abilities.join(' / ')}` : undefined}>
    {abilities.map((name,i)=><span key={name} aria-hidden={uncertain ? true : undefined} style={{visibility:i === index%abilities.length ? 'visible':'hidden'}}>{name}</span>)}
  </span>;
}

function PokemonCard({side, mon, other, set, active}) {
  const [failedArtwork, setFailedArtwork] = useState(null);
  const [failedItem, setFailedItem] = useState(null);
  const label = side === 'player' ? 'Your Pokémon' : 'Opponent Pokémon';
  const typeScenarios=battleTypeValues(mon,other),types=[...new Set(typeScenarios.flat())];
  const typeTitle=typeScenarios.length>1?`Possible battle types: ${typeScenarios.map(t=>t.join('/')).join(' or ')}`:undefined;
  const artwork = mon && `/pokemon/artwork/${mon.shiny ? 'shiny' : 'normal'}/${mon.dex}.png`;
  const itemId = mon && battleItemId(String(mon.item ?? ''));
  const item = mon && (!mon.item || ['none', ''].includes(normalize(mon.item)) || mon.item === '?????') ? 'None' : mon?.item;
  return <section className={`battle-matchup-card battle-side-${side}`} aria-label={label}>
      <div className="battle-matchup-identity"><div><h2><PokemonName>{mon.name}</PokemonName>{set?.instance ? ` #${set.instance}` : ''}</h2><div className="battle-matchup-types" title={typeTitle}>{types.map(type => <img key={type} src={publicAsset(`/types/icons/${type.toLowerCase()}.png`)} alt={`${type.toLowerCase()} type`} width="18" height="18" />)}</div></div><span>Lv. {mon.level}</span></div>
      <div className="battle-matchup-artwork">{failedArtwork === artwork ? <span>Artwork unavailable</span>
        : <img src={publicAsset(artwork)} alt={`${mon.shiny ? 'Shiny ' : ''}${mon.name}`} decoding="async" onError={() => setFailedArtwork(artwork)} />}</div>
      <div className="battle-matchup-details">
        <span className="battle-matchup-item">{item !== 'None' && itemId && failedItem !== itemId && <img src={publicAsset(`/items/${itemId}.png`)} width="20" height="20" alt="" onError={() => setFailedItem(itemId)} />}<span>{item}</span></span>
        <span aria-hidden="true">·</span><AlternatingAbility key={mon.ability} ability={mon.ability} active={active} />
      </div>
  </section>;
}

function Stats({side, mon, displayStats, ranges, faster}) {
  return <section className={`battle-matchup-stats battle-matchup-${side}`} aria-label={`${side === 'player' ? 'Your' : 'Opponent'} stats`}>
    <h3>Stats</h3><dl>{matchupStats.map(([stat,label])=><div className="battle-matchup-stat" key={stat}>
      <dt>{label}</dt><dd className={stat === 'speed' && faster === side ? 'battle-matchup-faster' : undefined}>{displayStats[stat]}</dd>
      <div className={`battle-matchup-bar stat-${stat}`} aria-hidden="true"><span style={{width:`${matchupBarPercent(mon.stats[stat],ranges[stat])}%`}} /></div>
    </div>)}</dl>
  </section>;
}
function Moves({side, mon, other, onMove}) {
  return <section className={`battle-matchup-moves battle-matchup-${side}`} aria-label={`${side === 'player' ? 'Your' : 'Opponent'} moves`}>
    <h3>Moves</h3>{mon.moves.filter(Boolean).map((move,index)=>{
      const effectiveness=matchupEffectiveness(move,mon,other);
      return <button type="button" className="battle-matchup-move" key={index} onClick={()=>onMove({side,slot:index})}>
        <MoveTypeIcon type={effectiveness.type} moveId={move.id} moveName={move.name} size={16} alt={`${effectiveness.type.toLowerCase()} type`} />
        <span className="battle-matchup-move-name">{move.name}</span><span className="battle-matchup-pp">{movePpLabel(move,side === 'player')}</span>
        <span className="battle-matchup-effect" title={effectiveness.explanation}>{effectiveness.label}</span>
      </button>;
    })}
  </section>;
}

export default function BattleMatchupShell({state, records, dispatch}) {
  const player = records.find(mon => mon.identity === state.active);
  const set = towerSetById(state.enemy);
  const opponent = useMemo(() => set ? toTowerOpponent(set, state.rules, state.selectedTrainer) : null,[set,state.rules,state.selectedTrainer]);
  const ranges = useMemo(() => frontierStatRanges(state.rules,state.selectedTrainer),[state.rules,state.selectedTrainer]);
  const conditionedPlayer=conditionedBattlePokemon(player,'player',state),conditionedOpponent=conditionedBattlePokemon(opponent,'enemy',state);
  const playerDisplay = stagedMatchupStats(player,conditionedPlayer?.stages);
  const opponentDisplay = stagedMatchupStats(opponent,conditionedOpponent?.stages);
  const faster = effectiveFasterSide(conditionedPlayer,conditionedOpponent);
  const [selectedMove, setSelectedMove] = useState(null);
  const moveOwner = selectedMove?.side === 'player' ? player : selectedMove?.side === 'enemy' ? opponent : null;
  const selectedCurrentMove = moveOwner?.moves.filter(Boolean)[selectedMove?.slot];
  const moveTarget = selectedMove?.side === 'player' ? opponent : player;
  useEffect(()=>{if(state.tab !== 'Matchup' || !moveOwner || !selectedCurrentMove)setSelectedMove(null);},[state.tab,moveOwner,selectedCurrentMove]);
  if (!player && !opponent) return null;
  return <div className="battle-matchup-cards">
    {player && <PokemonCard side="player" mon={conditionedPlayer} other={conditionedOpponent} active={state.tab === 'Matchup'} />}
    {opponent && <PokemonCard side="enemy" mon={conditionedOpponent} other={conditionedPlayer} set={set} active={state.tab === 'Matchup'} />}
    {player && <Stats side="player" mon={player} displayStats={playerDisplay} ranges={ranges} faster={faster} />}
    {opponent && <Stats side="enemy" mon={opponent} displayStats={opponentDisplay} ranges={ranges} faster={faster} />}
    {player && <Moves side="player" mon={conditionedPlayer} other={conditionedOpponent} onMove={setSelectedMove} />}
    {opponent && <Moves side="enemy" mon={conditionedOpponent} other={conditionedPlayer} onMove={setSelectedMove} />}
    {player && opponent && <BattleConditions state={state} dispatch={dispatch} player={player} opponent={opponent} set={set} />}
    {selectedMove && selectedCurrentMove && <BattleMoveDetails move={selectedCurrentMove} basicAttacker={moveOwner} basicDefender={moveTarget}
      attacker={conditionedBattlePokemon(moveOwner,selectedMove.side,state)}
      defender={conditionedBattlePokemon(moveTarget,selectedMove.side === 'player' ? 'enemy' : 'player',state)} onClose={()=>setSelectedMove(null)} />}
  </div>;
}
