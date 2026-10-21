// Explicit guards cover async imports and screens whose drafts live in memory.
const blockers = new Set();
const listeners = new Set();
export function blockUpdates() {
  const token = {};
  blockers.add(token);
  return () => {
    if (blockers.delete(token)) listeners.forEach(listener => listener());
  };
}
export function updatesBlocked() { return blockers.size > 0; }
export function onUpdatesUnblocked(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
