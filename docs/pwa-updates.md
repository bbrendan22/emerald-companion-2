# Installed app updates

The original app had Home Screen metadata but no service worker or update lifecycle. A restored installed document could therefore keep running old JavaScript with no app-controlled foreground version check. The repository cannot establish whether a particular old icon also points at a different deployment URL.

Production builds now use Vite PWA's injectManifest mode and a bundled, classic Workbox worker at the existing GitHub Pages scope. The build identifier is GITHUB_SHA in CI (or a fresh timestamp locally). Hashed JS/CSS and the matching HTML shell are precached together. Installation must finish successfully before a worker can activate. Artwork is cached as viewed; the entire large sprite library is not downloaded at installation. Unvisited artwork still requires a connection.

Startup, pageshow, visibility, focus, online, and five-minute foreground checks request a fresh version marker and call ServiceWorkerRegistration.update(). Registration bypasses the HTTP worker-script cache. A waiting worker receives SKIP_WAITING only when the current page is safe. Controller changes query the active worker's build identifier; a different build causes one reload once safe. First installation and same-build claims do not reload. Offline failures leave the active version intact and are retried on foreground/online checks.

Imports hold explicit guards until completion. Battle and resource detail/calculator screens conservatively hold guards while session-only state could be edited. Open dialogs, focused editable controls, hidden pages, and recent pointer/keyboard activity also defer reloads. A worker activated by another tab still cannot force a guarded page to reload. Navigate away from a session screen to permit its pending update. New features with unsaved state must participate in updateSafety.js.

Only Workbox's namespaced precache entries and its bounded image cache are maintained. No application localStorage, IndexedDB, save files, role assignments, preferences, or unrelated caches are cleared.

Run `npm run test:pwa` for actual production A/B builds and Chromium/WebKit update tests, including a blocked import, another active Battle tab, persisted data, and offline reload. No public deployment or private fixture is used. Playwright's WebKit offline emulation rejects SW navigations (microsoft/playwright#42775), so WebKit's offline check disconnects the HTTP origin instead. Physical iPhone Home Screen installation/browser suspension remains a device check; Playwright is not iOS Safari.

A previously installed document without this updater cannot acquire new JavaScript retroactively. It must load this release once before these automatic checks can run. Keep its existing origin/storage intact; do not clear website data or delete saved data to bootstrap it. Confirm the icon launches /emerald-companion-2/, rather than the read-only predecessor's URL.
