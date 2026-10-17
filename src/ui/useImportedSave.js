import {useState} from 'react';
import {importSave, loadStoredSave} from '../storage/saveStorage.js';

export default function useImportedSave() {
  const [state, setState] = useState(() => {
    try { return {snapshot: loadStoredSave(window.localStorage), error: ''}; }
    catch { return {snapshot: null, error: 'Your stored save could not be loaded. Import a valid save in Settings to continue.'}; }
  });
  const [busy, setBusy] = useState(false);
  async function importFile(file) {
    if (!file || busy) return;
    setBusy(true);
    try {
      if (!/\.sav$/i.test(file.name)) throw new Error('Choose a .sav file.');
      if (file.size !== 131072) throw new Error('Choose a raw 128 KiB Emerald .sav file.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let snapshot;
      try { snapshot = importSave(bytes, window.localStorage); }
      catch (error) {
        if (error.name === 'QuotaExceededError' || error.name === 'SecurityError') {
          throw new Error('Browser storage is unavailable or full.');
        }
        throw error;
      }
      setState({snapshot, error: ''});
      return true;
    } catch (error) {
      setState(previous => ({...previous, error: `Import failed: ${error.message.replace(/[.!?]$/, '')}. Your previous save has been kept.`}));
      return false;
    } finally { setBusy(false); }
  }
  return {...state, busy, importFile};
}
