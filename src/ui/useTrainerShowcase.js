import {useState} from 'react';
import {loadShowcase, storeShowcase} from '../storage/trainerShowcase.js';
export default function useTrainerShowcase() {
  const [state, setState] = useState(() => {
    try { return {slots: loadShowcase(window.localStorage), error: ''}; }
    catch { return {slots: null, error: 'Showcase preferences could not be loaded. Browser storage may be unavailable.'}; }
  });
  function save(slots) {
    try { setState({slots: storeShowcase(window.localStorage, slots), error: ''}); return true; }
    catch { setState(previous => ({...previous, error: 'Showcase could not be saved. Browser storage may be unavailable or full.'})); return false; }
  }
  return {...state, save};
}
