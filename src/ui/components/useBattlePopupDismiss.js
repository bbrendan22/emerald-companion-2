import {useEffect} from 'react';
import {flushSync} from 'react-dom';

let releaseGesture;
function consumeGesture(event) {
  releaseGesture?.();
  const stop = event => {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  };
  stop(event);
  // Only a touch pointerdown can still be followed by its own touchstart.
  // A dismissing click has already completed: the next touchstart is a new
  // gesture and must pass through, even if no pointerdown is delivered.
  let touchStarted = event.type !== 'pointerdown' || event.pointerType !== 'touch';
  const events = ['pointerup','pointercancel','touchstart','touchend','touchcancel','mousedown','mouseup','click','dblclick'];
  let timer;
  const release = () => {
    clearTimeout(timer);
    for (const type of events) document.removeEventListener(type,guard,true);
    document.removeEventListener('pointerdown',nextGesture,true);
    document.removeEventListener('keydown',release,true);
    if (releaseGesture === release) releaseGesture = undefined;
  };
  const nextGesture = next => {if (next !== event) release();};
  const guard = next => {
    if (next === event) return;
    if (next.type === 'touchstart') {
      if (touchStarted) {release(); return;}
      touchStarted = true;
    }
    stop(next);
    if (['pointerup','touchend','mouseup','pointercancel','touchcancel'].includes(next.type)) {
      clearTimeout(timer);
      timer = setTimeout(release,1000);
    }
  };
  // Keep swallowing this gesture after the popup unmounts. In Safari its
  // compatibility click can target a control uncovered by the dismissal.
  for (const type of events) document.addEventListener(type,guard,{capture:true,passive:false});
  document.addEventListener('pointerdown',nextGesture,true);
  document.addEventListener('keydown',release,true);
  if (event.type === 'click' || event.type === 'dblclick') timer = setTimeout(release,1000);
  releaseGesture = release;
}

export default function useBattlePopupDismiss({popup,trigger,onClose,interactive,enabled = true,tapOnly = false}) {
  useEffect(() => {
    if (!enabled) return;
    if (tapOnly) {
      // Informational dialogs allow swipes to scroll; only a stationary tap
      // dismisses. Consume its click before unmounting, including late Safari
      // compatibility clicks, with the same guard used by the Battle popups.
      let start = null, tapped = false;
      const down = event => {
        tapped = false;
        start = event.isPrimary && event.button === 0 ? {id:event.pointerId,x:event.clientX,y:event.clientY} : null;
      };
      const move = event => {
        if (start && (event.pointerId !== start.id || Math.hypot(event.clientX-start.x,event.clientY-start.y) >= 8)) start = null;
      };
      const up = event => {move(event);tapped = Boolean(start);start = null;};
      const cancel = () => {start = null;tapped = false;};
      const click = event => {
        if (interactive && event.target instanceof Element && popup.current?.contains(event.target) && event.target.closest(interactive)) {tapped=false;return;}
        if (!tapped) {event.preventDefault();event.stopImmediatePropagation();return;}
        tapped = false;
        consumeGesture(event);
        onClose();
      };
      const listeners = {pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,scroll:cancel,click};
      for (const [type,listener] of Object.entries(listeners)) document.addEventListener(type,listener,{capture:true,passive:false});
      return () => {for (const [type,listener] of Object.entries(listeners)) document.removeEventListener(type,listener,true);};
    }
    const dismiss = event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (interactive && popup.current?.contains(target) && target.closest(interactive)) return;
      const control=target.closest('select')??target.closest('label')?.control;
      const nextPopup=target.closest('button[aria-haspopup="dialog"]');
      const switchingPopup=nextPopup && !nextPopup.disabled && nextPopup!==trigger?.current
        && !popup.current?.contains(nextPopup);
      if(switchingPopup || control instanceof HTMLSelectElement && !control.disabled && !popup.current?.contains(control)) {
        // An explicit popup trigger, like a native picker, needs its original
        // gesture. Remove the old popup's outside-focus/dismissal listeners
        // synchronously so they cannot swallow or close the next popup.
        flushSync(()=>onClose());
        return;
      }
      consumeGesture(event);
      onClose();
    };
    document.addEventListener('pointerdown',dismiss,{capture:true,passive:false});
    document.addEventListener('touchstart',dismiss,{capture:true,passive:false});
    document.addEventListener('click',dismiss,true);
    return () => {
      document.removeEventListener('pointerdown',dismiss,true);
      document.removeEventListener('touchstart',dismiss,true);
      document.removeEventListener('click',dismiss,true);
    };
  }, [popup,trigger,onClose,interactive,enabled,tapOnly]);
}
