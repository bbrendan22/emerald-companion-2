import MoveTypeIcon from './MoveTypeIcon.jsx';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {directoryFilterFields} from '../../resources/homeDirectoryFilters.js';
import {publicAsset} from '../../assets/publicAsset.js';
import {homeDirectory, searchHomeResources} from '../../resources/homeSearch.js';
import {moveResources} from '../../resources/learnset/data/moveResources.js';

export default function HomeResourceSearch({onSelect, directory = null, onDirectoryQuery, onDirectoryFilters, onDirectoryBack, directoryScroll, children}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({});
  const filterButton = useRef(null);
  const popup = useRef(null);
  const fields = directoryFilterFields(directory?.category, directory?.filters);
  const activeFilters = Object.values(directory?.filters || {}).some(Boolean);
  useEffect(() => { setFilterOpen(false); }, [directory?.category]);
  useEffect(() => {
    if (!filterOpen) return;
    const dismiss = event => {
      if (!popup.current?.contains(event.target) && !filterButton.current?.contains(event.target)) setFilterOpen(false);
    };
    const escape = event => { if (event.key === 'Escape') { setFilterOpen(false); filterButton.current?.focus(); } };
    const close = event => { if (!popup.current?.contains(event.target)) setFilterOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true);
    };
  }, [filterOpen]);
  function changeFilters(filters) {
    directoryScroll.current = 0; onDirectoryFilters(filters); setFilterOpen(false); filterButton.current?.focus();
  }
  const [masterQuery, setMasterQuery] = useState('');
  const query = directory ? directory.query : masterQuery;
  const setQuery = value => {
    if (directory) { directoryScroll.current = 0; onDirectoryQuery(value); }
    else setMasterQuery(value);
  };
  const results = useRef(null);
  const restoringScroll = useRef(false);
  const input = useRef(null);
  const selectedDirectory = directory ? homeDirectory(directory.category, query, directory.filters) : null;
  const groups = selectedDirectory ? [selectedDirectory] : searchHomeResources(query);
  useLayoutEffect(() => {
    if (!directory || !results.current) return;
    const saved = directoryScroll.current;
    restoringScroll.current = true;
    results.current.scrollTop = saved;
    // Returning from a species profile also restores Home's grid in the parent.
    // Reapply after that layout settles, before accepting new scroll positions.
    let frame;
    const restore = () => {
      if (!results.current) return;
      if (results.current.closest('.home-detail')) { frame = requestAnimationFrame(restore); return; }
      results.current.scrollTop = saved;
      frame = requestAnimationFrame(() => { restoringScroll.current = false; });
    };
    frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [directory?.category, directory?.query, directory?.filters, directoryScroll]);
  const searching = Boolean(directory || query.trim());
  function select(category, entry) {
    if (directory && results.current) directoryScroll.current = results.current.scrollTop;
    if (directory && category === 'pokemon') restoringScroll.current = true;
    if (!directory) setMasterQuery('');
    input.current?.blur();
    document.activeElement?.blur();
    onSelect(category, entry);
  }
  return <>
    <div className={`home-search-field${fields.length ? ' home-search-filterable' : ''}`}>
      <input ref={input} className="home-search" type="search" placeholder="Search" aria-label={directory ? `Search ${selectedDirectory.title}` : 'Search Resources'} value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" spellCheck={false} />
      {query && <button type="button" className="home-search-clear" aria-label="Clear search" onClick={() => {setQuery(''); input.current?.focus();}}>×</button>}
      {fields.length > 0 && <button ref={filterButton} type="button" className="home-filter-toggle" aria-label="Filter directory" aria-expanded={filterOpen} aria-haspopup="dialog" data-active={activeFilters} onClick={() => {
        input.current?.blur();
        const rect = filterButton.current.getBoundingClientRect();
        setPopupPosition({top:rect.bottom + 6, right:Math.max(8, window.innerWidth - rect.right), maxHeight:Math.max(120, window.innerHeight - rect.bottom - 14)});
        setFilterOpen(value => !value);
      }}><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h14M5 10h10M8 15h4" /></svg></button>}
      {filterOpen && fields.length > 0 && createPortal(<div ref={popup} role="dialog" aria-label="Directory filters" className="home-filter-popup" style={popupPosition}>
        {fields.map(field => <label key={field.key}>{field.label}<select aria-label={field.label} value={directory.filters?.[field.key] || ''} onChange={event => changeFilters({...directory.filters, ...(field.key === 'category' ? {group:''} : {}), [field.key]:event.target.value})}>
          <option value="">All</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select></label>)}
        <button type="button" onClick={() => changeFilters({})}>Clear Filters</button>
      </div>, document.body)}
    </div>
    {directory && <div className="home-directory-heading"><h2>{selectedDirectory.title}</h2><button type="button" aria-label="Close directory" onClick={onDirectoryBack}>×</button></div>}
    {searching ? <div ref={results} className="home-search-results" role="region" aria-label={directory ? `${selectedDirectory.title} directory` : 'Search results'} key={`${directory?.category ?? 'master'}:${query}`} onScroll={event => {if (directory && !restoringScroll.current) directoryScroll.current = event.currentTarget.scrollTop;}}>
      {groups.some(group => group.results.length) ? groups.map(group => <section className="resources-section" key={group.id}>
        {!directory && <h2>{group.title}</h2>}
        <ul>{group.results.map(entry => {
          const src = group.id === 'pokemon' ? `/pokemon/emerald/normal/${entry.id}.png`
            : group.id === 'moves' ? `/types/icons/${moveResources[entry.id].type.toLowerCase()}.png`
            : group.id === 'items' || group.id === 'berries' ? `/items/${entry.id}.png` : null;
          return <li key={entry.id}><button type="button" onClick={() => select(group.id, entry)}>
            <>{group.id === 'moves' ? <MoveTypeIcon type={moveResources[entry.id].type} moveId={entry.id} moveName={entry.name} size={20} alt="" /> : src && <img src={publicAsset(src)} alt="" width="20" height="20" loading="lazy" />}</><span className="home-result-name">{entry.machine ? `${entry.code} · ${entry.name}` : entry.name}</span>
          </button></li>;
        })}</ul>
      </section>) : <p className="home-search-empty" role="status">No results.</p>}
    </div> : <div className="home-resource-navigation">{children}</div>}
  </>;
}
