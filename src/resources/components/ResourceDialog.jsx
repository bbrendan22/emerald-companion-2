import React, {useEffect, useRef} from 'react';

export default function ResourceDialog({name, onClose, returnFocus = null, contentClassName = '', children}) {
  const dialog = useRef(null);
  const pointerStart = useRef(null);
  const pendingTap = useRef(false);
  useEffect(() => {
    // Safari focuses the tabindex=-1 row on touch. Clear it before showModal
    // captures its return target; only keyboard activation restores entry focus.
    if (!returnFocus) document.activeElement?.blur();
    const element = dialog.current;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.documentElement.style.overflow = overflow;
      returnFocus?.focus({preventScroll: true});
    };
  }, [name, returnFocus]);
  const trackMovement = event => {
    const start = pointerStart.current;
    if (start && (event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 8)) {
      pointerStart.current = null;
    }
  };
  return <dialog ref={dialog} className="resources-dialog-viewport" aria-label={name} tabIndex={-1} onCancel={event => {event.preventDefault(); onClose();}}
    onPointerDown={event => {
      pendingTap.current = false;
      pointerStart.current = event.isPrimary && event.button === 0
        ? {id: event.pointerId, x: event.clientX, y: event.clientY} : null;
    }}
    onPointerMove={trackMovement}
    onPointerUp={event => {
      trackMovement(event);
      const tap = pointerStart.current;
      pointerStart.current = null;
      pendingTap.current = Boolean(tap);
    }}
    onScrollCapture={() => {pointerStart.current = null; pendingTap.current = false;}}
    onPointerCancel={() => {pointerStart.current = null; pendingTap.current = false;}}
    onClick={event => {
      // Consume the browser's click before unmounting, so a touch cannot activate
      // the page underneath. Only a movement-validated pointer tap may dismiss.
      event.preventDefault();
      event.stopPropagation();
      const tap = pendingTap.current;
      pendingTap.current = false;
      if (tap) onClose();
    }}>
    <div className={`resources-move-dialog ${contentClassName}`}>{children}</div>
  </dialog>;
}
