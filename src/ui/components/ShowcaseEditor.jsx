import React, {useEffect, useRef, useState} from 'react';
import reference from '../../data/reference.json';
import ShowcaseArtwork from './ShowcaseArtwork.jsx';
const species = Object.values(reference.species).sort((a,b) => a.nationalDexId-b.nationalDexId);

export default function ShowcaseEditor({slot, onSave, onClose}) {
  const dialog = useRef(null), results = useRef(null);
  const [selected, setSelected] = useState(slot && !slot.isEgg ? slot.nationalDexId : null);
  const [shiny, setShiny] = useState(slot?.shiny ?? false);
  const [query, setQuery] = useState(slot && !slot.isEgg ? species.find(p => p.nationalDexId === slot.nationalDexId)?.name ?? '' : '');
  const search = query.trim().toLowerCase();
  const options = species.filter(p => `${String(p.nationalDexId).padStart(3,'0')} ${p.name}`.toLowerCase().includes(search));
  const selectedIsVisible = options.some(option => option.nationalDexId === selected);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {element.close(); document.body.style.overflow = previousOverflow;};
  }, []);
  useEffect(() => {if(results.current) results.current.scrollTop = 0;}, [query]);
  function focusResult(index) {
    const buttons = results.current?.querySelectorAll('[role="option"]');
    if(buttons?.length) buttons[Math.max(0, Math.min(index, buttons.length-1))].focus();
  }
  return <dialog ref={dialog} className="showcase-popup" aria-labelledby="showcase-popup-title" onKeyDown={event => {if(event.key === 'Escape') {event.preventDefault(); onClose();}}} onCancel={event => {event.preventDefault(); onClose();}} onClick={event => {if(event.target === event.currentTarget) {const r=event.currentTarget.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) onClose();}}}>
    <form onSubmit={event => {event.preventDefault(); if(selected && onSave({nationalDexId:selected,shiny})) onClose();}}>
      <h2 id="showcase-popup-title">{slot ? 'Edit Showcase' : 'Add Pokémon'}</h2>
      <div className="showcase-search-row">
        <input autoFocus aria-label="Search Pokémon" type="search" placeholder="Species or Dex number" value={query} onChange={event => setQuery(event.target.value)} onFocus={event => event.target.select()} onKeyDown={event => {if(event.key === 'ArrowDown') {event.preventDefault(); focusResult(0);}}} aria-controls="showcase-results" />
        <label className="showcase-shiny"><input type="checkbox" checked={shiny} onChange={event => setShiny(event.target.checked)} /> Shiny</label>
      </div>
      <div ref={results} id="showcase-results" className="showcase-results" role="listbox" aria-label="Matching Pokémon">
        {options.length ? options.map((p,index) => <button type="button" role="option" aria-label={p.name} tabIndex={p.nationalDexId === selected || (!selectedIsVisible && index === 0) ? 0 : -1} aria-selected={selected === p.nationalDexId} key={p.nationalDexId} onClick={() => setSelected(p.nationalDexId)} onKeyDown={event => {if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault(); focusResult(event.key === 'Home' ? 0 : event.key === 'End' ? options.length-1 : index+(event.key === 'ArrowDown' ? 1 : -1));}}}>
          <ShowcaseArtwork pokemon={{nationalDexId:p.nationalDexId,shiny}} width="32" height="32" alt="" loading="lazy" />
          <span>{p.name}</span><span className="showcase-result-check" aria-hidden="true">{selected === p.nationalDexId ? '✓' : ''}</span>
        </button>) : <p className="showcase-no-matches" role="status">No matches</p>}
      </div>
      <div className="showcase-popup-actions">
        {slot && <button className="showcase-remove" type="button" onClick={() => {if(onSave(null)) onClose();}}>Remove</button>}
        <button type="button" onClick={onClose}>Cancel</button><button className="showcase-confirm" type="submit" disabled={!selected}>Confirm</button>
      </div>
    </form>
  </dialog>;
}
