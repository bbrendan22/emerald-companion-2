import useBattlePopupDismiss from './useBattlePopupDismiss.js';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

// Shared positioning, keyboard handling and dismissal for compact Battle searches.
export default function BattleSearchPopup({trigger, id, label, searchLabel, placeholder, query, onQuery, resultsLabel, onClose, children}) {
  const popup = useRef(null), input = useRef(null), results = useRef(null);
  const [position, setPosition] = useState(null);
  useBattlePopupDismiss({popup,trigger,onClose,interactive:'button, input'});
  useLayoutEffect(() => {
    const place = () => {
      const rect = trigger.current.getBoundingClientRect();
      const section = trigger.current.closest('section').getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      // Keep the search field below its anchor where possible, rather than
      // flipping it above the trigger as the phone keyboard reduces the viewport.
      const desiredHeight = searchLabel ? 112 : Math.max(112,(results.current?.scrollHeight ?? 0)+16);
      const top = Math.max(viewportTop+12, Math.min(rect.bottom+6,viewportBottom-desiredHeight-12));
      setPosition({right:Math.max(12,window.innerWidth-section.right), top,
        maxHeight:Math.max(80,viewportBottom-top-12)});
    };
    place();
    window.addEventListener('resize',place);
    window.visualViewport?.addEventListener('resize',place);
    window.visualViewport?.addEventListener('scroll',place);
    return () => {
      window.removeEventListener('resize',place);
      window.visualViewport?.removeEventListener('resize',place);
      window.visualViewport?.removeEventListener('scroll',place);
    };
  }, [trigger, searchLabel]);
  useEffect(() => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) input.current?.focus({preventScroll:true});
  }, []);
  useEffect(() => {
    const escape = event => {if (event.key === 'Escape') {event.preventDefault(); onClose();}};
    const outsideFocus = event => {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) onClose();
    };
    const scroll = event => {
      // Focusing an input can pan Safari's page while bringing up the keyboard.
      // That scroll must not unmount the focused input and dismiss the keyboard.
      if (document.activeElement === input.current
        || (event.target instanceof Node && popup.current?.contains(event.target))) return;
      onClose();
    };
    document.addEventListener('keydown',escape);
    document.addEventListener('focusin',outsideFocus);
    window.addEventListener('scroll',scroll,true);
    return () => {
      document.removeEventListener('keydown',escape);
      document.removeEventListener('focusin',outsideFocus);
      window.removeEventListener('scroll',scroll,true);
    };
  }, [onClose, trigger]);
  return createPortal(<div ref={popup} id={id} role="dialog" aria-label={label}
    className="home-filter-popup battle-opponent-popup" style={{...position, visibility:position ? 'visible' : 'hidden'}}>
    {searchLabel && <div className="battle-opponent-search">
      <input ref={input} type="search" aria-label={searchLabel} placeholder={placeholder}
        inputMode="search" autoComplete="off" autoCapitalize="none" spellCheck={false} value={query}
        onChange={event => {onQuery(event.target.value); if (results.current) results.current.scrollTop = 0;}} />
    </div>}
    <div ref={results} className="battle-opponent-results" role="group" aria-label={resultsLabel}>
      {children}
    </div>
  </div>, document.body);
}
