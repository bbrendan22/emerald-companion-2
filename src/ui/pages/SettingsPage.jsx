import React, {useState} from 'react';
import '../styles/settings.css';
import {emptyShowcase} from '../../storage/trainerShowcase.js';

export default function SettingsPage({snapshot, error, busy, importFile, showcase}) {
  const [imported, setImported] = useState(false);
  async function onChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setImported(await importFile(file));
  }
  return <div className="settings-content"><section className="import-panel" aria-labelledby="import-heading">
    <h2 id="import-heading">Your save file</h2>
    <p>Import a raw Emerald .sav file to see your Trainer and Pokédex progress.</p>
    <label className="file-label" htmlFor="save-file">Choose .sav file</label>
    <input id="save-file" type="file" accept=".sav" disabled={busy} onChange={onChange} aria-describedby="save-privacy" />
    <p className="import-note" id="save-privacy">Stored only in this browser. Reimport after saving in-game to update your progress. Clearing browser data removes the saved import.</p>
    {busy && <p role="status">Checking save…</p>}
    {!busy && !error && <p role="status">{imported ? 'Save imported. Open Trainer to view your progress.' : snapshot ? 'A saved import is available.' : 'No save imported yet.'}</p>}
    {error && <p className="import-error" role="alert">{error}</p>}
  </section><section className="showcase-reset-panel"><h2>Trainer Showcase</h2><p>Edit your team directly on the Trainer page. Double-tap an occupied slot, or tap + to add a Pokémon.</p><button type="button" onClick={() => {if(window.confirm('Clear all six showcase slots? Your showcase will stay empty until you choose Pokémon again.')) showcase.save(emptyShowcase());}}>Reset Showcase</button>{showcase.error && <p role="alert">{showcase.error}</p>}</section></div>;
}
