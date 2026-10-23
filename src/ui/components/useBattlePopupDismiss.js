import {useEffect} from 'react';

let releaseGesture;
function consumeGesture(event) {
  releaseGesture?.();
  const stop = event => {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  };
  stop(event);
  let touchStarted = event.type === 'touchstart';
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

export default function useBattlePopupDismiss({popup,trigger,onClose,interactive,enabled = true}) {
  useEffect(() => {
    if (!enabled) return;
    const dismiss = event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (popup.current?.contains(target) && target.closest(interactive)) return;
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
  }, [popup,trigger,onClose,interactive,enabled]);
}
