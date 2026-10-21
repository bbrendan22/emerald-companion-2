import React, {useLayoutEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import '../styles/collection-detail-dialog.css';

export default function CollectionDetailDialog({onClose, children}) {
  const dialog = useRef(null);
  const gesture = useRef(null);
  const pendingTap = useRef(false);
  const lastScroll = useRef(-Infinity);
  const cancelTap = () => {gesture.current = null; pendingTap.current = false;};

  useLayoutEffect(() => {
    const node = dialog.current;
    const root = document.documentElement;
    const app = document.querySelector('.app');
    const previousInert = app?.inert;
    const previousOverflow = root.style.overflow;
    const returnFocus = document.activeElement;
    const {scrollX, scrollY} = window;
    // Use the header's viewport geometry even when the gallery is scrolled.
    // The safe-area fallback covers a header that has scrolled offscreen.
    const headerBottom = document.querySelector('.header')?.getBoundingClientRect().bottom ?? 0;
    node.style.setProperty('--collection-detail-header-bottom', `${Math.max(0, headerBottom)}px`);
    root.style.overflow = 'hidden';
    returnFocus?.blur();
    if (app) app.inert = true;
    node.showModal();
    node.focus({preventScroll:true});
    return () => {
      node.close();
      root.style.overflow = previousOverflow;
      if (app) app.inert = previousInert;
      if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  function trackMovement(event) {
    const start = gesture.current;
    if (start && (start.id !== event.pointerId || Math.hypot(event.clientX-start.x, event.clientY-start.y) >= 8)) cancelTap();
  }

  return createPortal(<dialog ref={dialog} className="collection-detail-viewport" aria-label="Pokémon details" tabIndex={-1}
    onCancel={event => {event.preventDefault(); onClose();}}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex="0"]')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first) {event.preventDefault(); dialog.current.focus({preventScroll:true});}
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {event.preventDefault(); last.focus({preventScroll:true});}
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {event.preventDefault(); first.focus({preventScroll:true});}
    }}
    onPointerDown={event => {
      cancelTap();
      if (event.target.closest('[data-detail-interactive]')) return;
      // A touch that stops native momentum is not a dismissal tap.
      if (event.isPrimary && event.button === 0 && performance.now()-lastScroll.current > 160)
        gesture.current = {id:event.pointerId, x:event.clientX, y:event.clientY};
    }}
    onPointerMove={trackMovement}
    onPointerUp={event => {trackMovement(event); pendingTap.current = Boolean(gesture.current); gesture.current = null;}}
    onPointerCancel={cancelTap}
    onScrollCapture={() => {lastScroll.current = performance.now(); cancelTap();}}
    onClick={event => {
      if (event.target.closest('[data-detail-interactive]')) {event.stopPropagation(); return;}
      // Keep the full-screen modal in place through pointerup; consume the click
      // before closing, so it can never activate a tile or control underneath.
      event.preventDefault(); event.stopPropagation();
      const tap = pendingTap.current; pendingTap.current = false;
      if (tap) onClose();
    }}>
    <div className="collection-detail-surface">
      {children}
    </div>
  </dialog>, document.body);
}
