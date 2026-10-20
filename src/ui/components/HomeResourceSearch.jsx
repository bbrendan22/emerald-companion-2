import React, {useLayoutEffect, useRef, useState} from 'react';
import {publicAsset} from '../../assets/publicAsset.js';
import {homeDirectory, searchHomeResources} from '../../resources/homeSearch.js';
import {moveResources} from '../../resources/learnset/data/moveResources.js';

export default function HomeResourceSearch({onSelect, directory = null, onDirectoryQuery, onDirectoryBack, directoryScroll, children}) {
  const [masterQuery, setMasterQuery] = useState('');
  const query = directory ? directory.query : masterQuery;
  const setQuery = value => {
    if (directory) { directoryScroll.current = 0; onDirectoryQuery(value); }
    else setMasterQuery(value);
  };
  const results = useRef(null);
  const restoringScroll = useRef(false);
  const input = useRef(null);
  const selectedDirectory = directory ? homeDirectory(directory.category, query) : null;
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
  }, [directory?.category, directory?.query, directoryScroll]);
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
    <div className="home-search-field">
      <input ref={input} className="home-search" type="search" placeholder="Search" aria-label={directory ? `Search ${selectedDirectory.title}` : 'Search Resources'} value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" spellCheck={false} />
      {query && <button type="button" className="home-search-clear" aria-label="Clear search" onClick={() => {setQuery(''); input.current?.focus();}}>×</button>}
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
            {group.id === 'moves' && moveResources[entry.id].type === 'MYSTERY' ? <span className="home-result-icon-space" aria-hidden="true" /> : src && <img src={publicAsset(src)} alt="" width="20" height="20" loading="lazy" />}<span className="home-result-name">{entry.machine ? `${entry.code} · ${entry.name}` : entry.name}</span>
          </button></li>;
        })}</ul>
      </section>) : <p className="home-search-empty" role="status">No matching results</p>}
    </div> : <div className="home-resource-navigation">{children}</div>}
  </>;
}
