import {publicAsset} from '../../assets/publicAsset.js';
import React, {useEffect, useRef, useState} from 'react';
import {loadBattleTeams, storeBattleTeams, validateTeam, createTeamId} from '../../storage/battleTeams.js';

function TeamEditor({team, pool, onSave, onDelete, onClose}) {
  const dialog=useRef(null);
  const [name,setName]=useState(team.name),[ids,setIds]=useState([...team.ids]),[query,setQuery]=useState(''),[slot,setSlot]=useState(0),[confirm,setConfirm]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const node=dialog.current, previous=document.activeElement;node.showModal();return()=>{node.close();previous?.focus({preventScroll:true});};},[]);
  const validation=validateTeam({name,ids},pool);
  const options=pool.filter(mon=>`${mon.name} ${mon.nickname ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <dialog ref={dialog} className="battle-team-editor" aria-labelledby="battle-team-editor-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <form onSubmit={event=>{event.preventDefault();if(!validation){const result=onSave({...team,name:name.trim(),ids});if(result)setError(result);}}}>
      <h2 id="battle-team-editor-title">{team.id?'Edit Team':'Add Team'}</h2>
      <label>Team name<input autoFocus value={name} maxLength={40} onChange={event=>setName(event.target.value)} /></label>
      <div className="battle-team-editor-slots">{Array.from({length:3},(_,i)=>{const mon=pool.find(mon=>mon.identity===ids[i]);return <button type="button" key={i} aria-label={`Choose team slot ${i+1}`} aria-pressed={slot===i} onClick={()=>setSlot(i)}>{mon?<><img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} alt=""/><span>{mon.name}</span></>:<span>{ids[i]?'Unavailable':`Slot ${i+1}`}</span>}</button>;})}</div>
      <label>Frontier Pokémon<input type="search" placeholder="Species or nickname…" value={query} onChange={event=>setQuery(event.target.value)} /></label>
      <div className="battle-team-picker">{options.map(mon=><button type="button" key={mon.identity} disabled={ids.includes(mon.identity) && ids[slot]!==mon.identity} onClick={()=>{setIds(old=>{const next=[...old];next[slot]=mon.identity;return next;});setSlot(Math.min(slot+1,2));}}><img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} alt=""/><span>{mon.name}{mon.nickname && mon.nickname!==mon.name && <small>{mon.nickname}</small>}</span><small>Lv. {mon.level}</small></button>)}{!options.length&&<p>No matching Frontier Pokémon. Assign the Frontier role in My Pokémon.</p>}</div>
      {(error || validation)&&<p className="battle-team-message" role="status">{error || validation}</p>}
      {confirm&&<div className="battle-team-delete-confirm"><p>Delete “{team.name}”?</p><button type="button" onClick={()=>{const result=onDelete(team.id);if(result)setError(result);}}>Confirm delete</button><button type="button" onClick={()=>setConfirm(false)}>Keep team</button></div>}
      <footer>{team.id&&<button type="button" onClick={()=>setConfirm(true)}>Delete</button>}<button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={Boolean(validation)}>Save</button></footer>
    </form>
  </dialog>;
}
export default function BattleTeams({battle}) {
  const {state,dispatch,records,frontierPool}=battle;
  const [loaded]=useState(()=>{try{return {teams:loadBattleTeams(window.localStorage),error:''};}catch{return {teams:[],error:'Saved teams could not be loaded. Existing storage has been kept.'};}});
  const [teams,setTeams]=useState(loaded.teams),[editor,setEditor]=useState(null),[error,setError]=useState(loaded.error);
  function persist(next){try{storeBattleTeams(window.localStorage,next);setTeams(next);setError('');setEditor(null);return '';}catch{return 'Teams could not be saved. Browser storage may be unavailable or full.';}}
  const speciesCounts = new Map();
  frontierPool.forEach(mon => speciesCounts.set(mon.dex, (speciesCounts.get(mon.dex) ?? 0) + 1));
  return <section className="battle-teams">
    <section className="battle-frontier-hub" aria-label="My Frontier Pokémon">
      <h2>My Frontier Pokémon</h2>
      {frontierPool.map(mon => <button type="button" className="battle-frontier-entry" key={mon.identity} data-pokemon-id={mon.identity}
        disabled={state.team.includes(mon.identity) || state.team.length >= state.rules.teamSize}
        onClick={() => dispatch({type:'addPlayer', identity:mon.identity, pool:frontierPool})}>
        <img src={publicAsset(`/pokemon/box/${mon.dex}.png`)} width="36" height="36" alt="" />
        <span><strong>{mon.name}</strong>{speciesCounts.get(mon.dex) > 1 && mon.nickname && mon.nickname !== mon.name && <small>{mon.nickname}</small>}</span>
        <small>Lv. {mon.level}</small>
      </button>)}
      {!frontierPool.length && <p>No Frontier Pokémon. Assign the Frontier role in My Pokémon.</p>}
    </section>
    <div className="battle-teams-heading"><h2>Saved Teams</h2><button type="button" disabled={Boolean(loaded.error)} onClick={()=>setEditor({id:null,name:'',ids:[]})}>Add Team</button></div>
    {error&&<p role="alert">{error}</p>}
    {!teams.length&&!error&&<p>No saved teams yet. Add a team using your Frontier Pokémon.</p>}
    {teams.map(team=>{const resolved=team.ids.map(id=>records.find(mon=>mon.identity===id));const issue=validateTeam(team,frontierPool);return <div className="battle-saved-team" key={team.id}>
      <button type="button" className="battle-load-team" aria-label={`Load ${team.name}`} disabled={Boolean(issue)} onClick={()=>dispatch({type:'loadTeam',team,records:frontierPool})}><strong>{team.name}</strong><span>{resolved.map((mon,i)=>mon?<img key={team.ids[i]} src={publicAsset(`/pokemon/box/${mon.dex}.png`)} alt={mon.name}/>:<span key={i}>Unavailable</span>)}</span>{issue&&<small>{issue}</small>}</button>
      <button type="button" onClick={()=>setEditor(team)} aria-label={`Edit ${team.name}`}>Edit</button>
    </div>;})}
    {editor&&<TeamEditor team={editor} pool={frontierPool} onClose={()=>setEditor(null)} onSave={team=>persist(team.id?teams.map(old=>old.id===team.id?team:old):[...teams,{...team,id:createTeamId()}])} onDelete={id=>persist(teams.filter(team=>team.id!==id))}/>}
  </section>;
}
