import {updatesBlocked, onUpdatesUnblocked} from './updateSafety.js';

export function workerVersion(worker) {
  return new Promise(resolve => {
    if (!worker) return resolve(null);
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 3000);
    channel.port1.onmessage = event => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data);
    };
    worker.postMessage({type: 'GET_VERSION'}, [channel.port2]);
  });
}

export function startPwaUpdates({version = __APP_VERSION__, base = import.meta.env.BASE_URL} = {}) {
  if (!('serviceWorker' in navigator)) return;
  let registration, pendingReload = false, reloading = false, checking = false;
  let idleUntil = 0, timer;
  function safe() {
    return document.visibilityState === 'visible' && !updatesBlocked()
      && !document.querySelector('dialog[open], [role="dialog"]:not([hidden])')
      && !document.activeElement?.matches('input:not([type="file"]), textarea, select, [contenteditable="true"]')
      && Date.now() >= idleUntil;
  }
  function apply() {
    clearTimeout(timer);
    if (reloading) return;
    if (!safe()) { timer = setTimeout(apply, 1000); return; }
    if (pendingReload) { reloading = true; location.reload(); }
    else registration?.waiting?.postMessage({type: 'SKIP_WAITING'});
  }
  async function controllerChanged() {
    const activeVersion = await workerVersion(navigator.serviceWorker.controller);
    // First installation claims the page too. Only a different build needs a reload.
    if (activeVersion && activeVersion !== version) { pendingReload = true; apply(); }
  }
  async function check() {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      if (!registration) {
        registration = await navigator.serviceWorker.register(`${base}sw.js`, {scope: base, updateViaCache: 'none'});
        function watchInstalling() {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => { if (worker.state === 'installed') apply(); });
        }
        registration.addEventListener('updatefound', watchInstalling);
        watchInstalling();
        controllerChanged();
        apply();
      }
      // Explicit no-store fetch also catches a foreground resume without navigation.
      await fetch(`${base}version.json`, {cache: 'no-store'});
      await registration.update();
      apply();
    } catch { /* Offline: retain the active shell and retry on the next foreground event. */ }
    finally { checking = false; }
  }
  navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
  onUpdatesUnblocked(apply);
  for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, () => {
    idleUntil = Date.now() + 1500;
    if (registration?.waiting || pendingReload) apply();
  }, {capture: true, passive: true});
  document.addEventListener('focusout', apply);
  document.addEventListener('visibilitychange', check);
  for (const event of ['pageshow', 'online', 'focus']) window.addEventListener(event, check);
  setInterval(check, 5 * 60 * 1000);
  check();
}
