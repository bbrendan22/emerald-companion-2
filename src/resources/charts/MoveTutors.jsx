import React, {useRef, useState} from 'react';
import {moveTutorTabs, moveTutorLists} from './moveTutors.js';
import './moveTutors.css';

export default function MoveTutors() {
  const [active, setActive] = useState('emerald');
  const tabs = useRef([]);
  function onTabKey(event, index) {
    const next = event.key === 'ArrowRight' ? (index + 1) % moveTutorTabs.length
      : event.key === 'ArrowLeft' ? (index + moveTutorTabs.length - 1) % moveTutorTabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? moveTutorTabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(moveTutorTabs[next].id);
    tabs.current[next]?.focus({preventScroll: true});
  }
  return <section className="resources-home move-tutors" aria-labelledby="move-tutors-heading">
    <h1 id="move-tutors-heading">Move Tutors</h1>
    <div className="move-tutors-tabs" role="tablist" aria-label="Move tutor lists">
      {moveTutorTabs.map((tab, index) => <button key={tab.id} ref={element => {tabs.current[index] = element;}} type="button" role="tab" id={`move-tutors-tab-${tab.id}`} aria-selected={active === tab.id} aria-controls={`move-tutors-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)} onKeyDown={event => onTabKey(event, index)}>{tab.label}</button>)}
    </div>
    {moveTutorTabs.map(tab => <div key={tab.id} role="tabpanel" id={`move-tutors-panel-${tab.id}`} aria-labelledby={`move-tutors-tab-${tab.id}`} hidden={active !== tab.id}>
      <table aria-label={`${tab.label} move tutors`}>
        <colgroup><col className="move-tutors-move-column" /><col />{tab.id === 'frontier' && <col className="move-tutors-bp-column" />}</colgroup>
        <thead><tr><th scope="col">Move</th><th scope="col">Location</th>{tab.id === 'frontier' && <th scope="col" className="move-tutors-bp">BP</th>}</tr></thead>
        <tbody>{moveTutorLists[tab.id].map(row => <tr key={row.moveId}><th scope="row">{row.name}</th><td>{row.location}</td>{tab.id === 'frontier' && <td className="move-tutors-bp">{row.cost}</td>}</tr>)}</tbody>
      </table>
    </div>)}
  </section>;
}
