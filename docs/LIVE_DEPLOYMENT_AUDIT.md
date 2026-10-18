# Emerald Companion 2.0 — Live Deployment Audit

Audit date: October 18, 2026 (America/Chicago). Scope: audit only. No application, styling, data, formulas, navigation, storage, deployment configuration, dependencies, or legacy 1.0 files were changed. No commit or push was made. Production output was rebuilt; temporary runners, logs, and screenshots are outside the repository under `/tmp`.

## 1. Git and deployment status

- Initial branch: `main`; initial working tree clean. Local HEAD and cached `origin/main`: `dc6537ceb35ae2898db6386e57c706e69da935c5` (`Deploy Emerald Companion 2.0 to GitHub Pages`). GitHub's live commits API independently returned the same SHA for `main`; no fetch was needed.
- [Deployment run 39173729581](https://github.com/bbrendan22/emerald-companion-2/actions/runs/39173729581) reports `completed/success`. Its **build and deploy jobs both succeeded**, for the same SHA. This was checked through GitHub's API, not inferred from workflow existence.
- `.github/workflows/deploy-pages.yml` checks out source, sets up Node 24, runs `npm ci` and `npm run build`, uploads only `dist`, then deploys through the GitHub Pages environment. Deploy permissions are scoped to `pages: write` and `id-token: write`; build has read permissions. Deployment concurrency does not cancel an active run.
- Vite uses `/emerald-companion-2/` for build and preview and `/` for development. The HTML module, stylesheet, manifest, favicon, and Apple icons use the production prefix. Manifest `id`, `start_url`, `scope`, and icon URLs are relative to its own directory.
- `publicAsset()` prefixes root-relative data identifiers at rendering boundaries. Root-relative strings retained in reference data are not inherently broken URLs.
- The deployment workflow does **not** run unit, browser, or Resources integrity checks before publishing. See finding M2.

## 2. Actual live website verification

The [live site](https://bbrendan22.github.io/emerald-companion-2/) was accessed using headless Google Chrome through the existing Playwright runtime. Fresh isolated contexts were used; the user's browser profile and stored save were not touched. An initial web-reader attempt could not access the site; direct HTTPS requests and actual browser testing subsequently succeeded.

The unchanged `test/pagesDeployment.browser.mjs` passed against the live HTTPS URL. It verified:

- Initial loading and navigation, with no uncaught runtime exceptions or HTTP responses at or above 400.
- Resources home; National Pokédex and a species profile's Overview, Stats & Matchups, Locations, Learnset, and More tabs; expanded move and ability entries.
- All six Useful Items categories, IV Calculator, Hidden Power Calculator, Stat Calculator, Move Coverage, Nature Chart, Type Chart, Emerald Pickup Table, and Move Tutors, including tutor tabs and representative selections.
- Actual image decoding, not just the presence of image elements; sprites, artwork, types, items, trainer and battle assets.
- Synthetic file import using the real Settings input; saved data remains present after reload; My Pokémon party/profile/box and Battle Trainers/Sets views render with decoded images.
- Every one of **3,225 nonhidden public files** returns HTTP 200 and exactly matches the local source file's SHA-256. HTML fallback responses cannot pass this comparison.
- Observed requests are exclusively same-origin GETs under `/emerald-companion-2/`; no save-data uploads or localhost requests occur in this flow.

Separate live/local layout sweeps recorded console errors, page exceptions, HTTP errors, and failed requests: **none**. The asset crawl is a deliberate audit operation and is not the application's normal startup traffic.

Four further unchanged scripts passed directly against live Pages: `basicDamage.browser.mjs`, `ivCalculator.browser.mjs`, `hiddenPowerCalculator.browser.mjs`, and `statCalculator.browser.mjs`. The unchanged `trainerSearch.browser.mjs` reached successful case-insensitive BRADY selection, then failed its hardcoded `/trainers/...` image-path assertion. A separate temporary audit script completed case-insensitive search, empty results, Anabel Gold selection, and navigation into Sets on live Pages with no HTTP errors or runtime exceptions. The original test failure remains reported; its expectations were not changed.

## 3. Local production versus deployed behavior

The rebuilt local production site was served at `http://127.0.0.1:5193/emerald-companion-2/` with Vite preview. The requested port 5192 was already occupied; the audit used its own server on 5193. A separate development server on port 5194 was used to diagnose tests that assume the root path.

Live HTML, JavaScript, and CSS were downloaded and compared byte for byte with the new build:

| File | SHA-256, identical live and local |
| --- | --- |
| `index.html` | `ece93ae29c7f1e730e8af7cba4cf523bb7c83a7e366d3028f63da474e3e6d10c` |
| `assets/index-D6mZLtKs.js` | `1633fb9af149dd639b036d518991ec85942cdfca52f21b8eed4f9491c2f458d0` |
| `assets/index-DkPnuJ_k.css` | `3a649f156139b02fcb8d439caee0058c4fa3bb5a5a83f109de38b762e7f10daf` |

The production smoke test also passed on local preview. No user-visible deployment difference was found in the sampled workflows. Local development intentionally emits unprefixed URLs, whereas local production and live Pages emit prefixed URLs. Existing root-path browser assertions need to distinguish these modes; see M1.

## 4. Broken assets and requests

No missing deployed public file was found in the exhaustive 3,225-file check. No broken loaded image or failed request was recorded by the layout sweeps. No localhost-only runtime dependency was found in application source. External source/reference links are citations opened by user action, not remote save processing.

Some older tests explicitly create `Image` requests at `/pokemon/...`, or assert that `src` equals `/types/...`, `/items/...`, etc. Those requests/assertions are wrong for Pages. Their failures must not be reported as missing application assets: the correct prefixed assets decode and match their expected bytes.

Local macOS `.DS_Store` files are present in `public` and copied into local `dist`, but are ignored and absent from tracked public files. The 3,225-file comparison excludes hidden files and does not claim whole-directory identity including local OS metadata.

## 5. Save persistence and privacy

- `useImportedSave.js` reads the selected file with `file.arrayBuffer()` and passes bytes to local parsers. It accepts raw 128 KiB `.sav` files and checks extension and size.
- `saveStorage.js` stores the full raw save as base64 under `emerald-companion-2.save.v1` in `localStorage`, then reparses it on startup. Base64 is encoding, not encryption. This is persistent browser storage, not a server database.
- Parsing precedes storage. Atomic `setItem` preserves the previous save on validation/storage failures. The hook reports storage availability/quota errors and preserves previous state after failed imports. Roles, showcase selections, and battle teams have separate application-prefixed keys.
- The live browser test imported a generated synthetic save through the real file control, reloaded, and successfully used the persisted collection. No save-bearing network request occurred. Source inspection found no application `fetch`, XMLHttpRequest, beacon, WebSocket, or remote parsing endpoint.
- The deployment uploads `dist` only. All tracked public files were inspected by inventory, and the production source/assets were checked for fixture/save inclusion. No personal save, private expectation manifest, or test fixture is bundled into the deployment. Ignore rules cover personal saves, private fixture expectations, local artifacts, and backups. The full requested unit suite includes private integration tests locally; the report contains only aggregate results and no private save content.
- Storage belongs to `https://bbrendan22.github.io`, not an individual path. Other scripts hosted on that same origin could access the storage; the app's key prefix prevents accidental key collisions, not origin-level access. This is a hosting trust boundary, with no cross-project access observed here.
- Localhost and Pages have different origins, so an existing localhost save will not automatically appear on Pages. Importing it separately is expected. Clearing website data, private browsing, storage restrictions, or browser eviction can remove persistent data; the source save remains the user's recovery copy.

Physical iPhone Safari retention, app installation/relaunch, and long-term storage eviction were not tested. Only synthetic data was imported into browser audit contexts.

## 6. Mobile and desktop compatibility

Both live and local production were swept at **320, 375, 390, 430, and 1280 px**, height 850. Each width covered Trainer, My Pokémon, Battle, Resources home, National Pokédex, Moves, Abilities, all four tools, and all four charts: **150 page/width/origin observations** plus two diagnostic records.

No document-level horizontal overflow or broken loaded image was detected in those observations. Navigation and Back controls worked throughout. Representative mobile Resources and desktop Battle screenshots were visually inspected: readable text, aligned content, and no evident clipped controls. Screenshots were captured at the current scroll position; the mobile Resources capture begins below the header and is not evidence of a missing header. No scrolling behavior was changed or classified as an urgent regression.

These are Chromium viewport checks, not physical iPhone Safari testing or a complete visual review of every populated state. The production smoke includes a populated synthetic collection at 375 px; the broad layout sweep starts with no imported save. Existing browser regression scripts provide additional populated-state and search/filter checks at their own widths. Battle Frontier Resources links remain intentionally deferred and are excluded from regression findings.

## 7. Performance observations

Production build (Node `v24.20.0`, npm `11.19.0`, Vite `v8.3.4`):

| Output | Minified size | Build-reported gzip |
| --- | ---: | ---: |
| HTML | 1.34 kB | 0.49 kB |
| CSS | 80.24 kB | 14.34 kB |
| JavaScript | 3,374.22 kB | 434.31 kB |

The build succeeded in 2.06 seconds and emitted the known over-500-kB chunk warning. `App.jsx` imports the major pages statically; source inspection found no dynamic `import()` split points. Large reference data and page code therefore contribute to the initial JS payload. This is a concrete mobile startup concern, not evidence of a current loading failure.

One unthrottled fresh-context live run recorded load-event completion around **323 ms** and first contentful paint around **368 ms**. JavaScript transfer was approximately 450 kB, CSS 15 kB, and the header Poké Ball PNG 70 kB. Local load-event completion was approximately 227 ms. These are single desktop-machine observations with concurrent audit work, not controlled benchmarks or iPhone/slow-network results; load events also do not establish full interaction readiness.

Nonhidden public assets total **178,290,246 bytes** (about 170 MiB); this is a hosted asset inventory, not a startup download. Large artwork images are around 240–264 kB each. Collection/catalog/coverage/item grids use native lazy image loading; Battle Sets also uses asynchronous image decoding. No separate battle video/animation media failure was found. No speculative asset redesign or optimization was performed.

## 8. Regression results

`npm test`: **418 passed, 0 failed, 0 skipped, 0 cancelled**, duration 1,779.74 ms. `npm run build`: **passed**, 218 modules transformed; known bundle warning only.

All six available read-only parity/integrity commands passed with legacy root `/Users/bbrendan22/Desktop/emerald-companion`:

| Command under `node tools/` | Result |
| --- | --- |
| `verifyPokemonDatabase.mjs` | All 386 species and 6,562 matchups; intentional Deoxys exception preserved |
| `verifyResourcesItems.mjs` | Source/port hashes, item data, icon bytes, categories, machines, acquisition parity |
| `verifyResourcesItemsRender.mjs` | 309 item/machine detail renders, including 58 compatibility grids |
| `verifyResourcesLearnset.mjs` | All 386 species data/helpers and rendered markup |
| `verifyResourcesLocations.mjs` | All 386 species × seven games and rendered markup |
| `verifyMoveCoverageParity.mjs` | 386 species; 289 type matchups; 3,864 ordered group comparisons |

All **43 existing browser scripts** were executed unchanged against local production: **25 passed, 18 failed**. All 18 failures were investigated and stem from root-path asset expectations or test-generated root-path requests. All **43 passed** against the development server; the production-only Pages script remained pointed at production preview during that development rerun. No timeout occurred. No tests were edited or suppressed. Temporary runners supplied existing URL/runtime environment variables and applied a 180-second process timeout per script.

| Existing browser script | Development rerun | Local production subdirectory |
| --- | --- | --- |
| abilities.browser.mjs | PASS | FAIL: root-path expectation/request |
| basicDamage.browser.mjs | PASS | PASS |
| basicDamageConditions.browser.mjs | PASS | PASS |
| basicDamageModifiers.browser.mjs | PASS | PASS |
| basicDamageTypes.browser.mjs | PASS | PASS |
| battleAccuracyCorrections.browser.mjs | PASS | FAIL: root-path expectation/request |
| battleConditions.browser.mjs | PASS | PASS |
| battleHeaders.browser.mjs | PASS | FAIL: root-path expectation/request |
| battleHub.browser.mjs | PASS | FAIL: root-path expectation/request |
| battleInformationalPopup.browser.mjs | PASS | PASS |
| battleMatchup.browser.mjs | PASS | FAIL: root-path expectation/request |
| battleRules.browser.mjs | PASS | PASS |
| battleShell.browser.mjs | PASS | PASS |
| battleStagedStats.browser.mjs | PASS | PASS |
| battleTeams.browser.mjs | PASS | FAIL: root-path expectation/request |
| battleVisibility.browser.mjs | PASS | PASS |
| damagePolish.browser.mjs | PASS | PASS |
| earthquake.browser.mjs | PASS | PASS |
| emeraldPickup.browser.mjs | PASS | FAIL: root-path expectation/request |
| fixedDamage.browser.mjs | PASS | PASS |
| hiddenPowerCalculator.browser.mjs | PASS | PASS |
| items.browser.mjs | PASS | FAIL: root-path expectation/request |
| ivCalculator.browser.mjs | PASS | PASS |
| moveCoverage.browser.mjs | PASS | FAIL: root-path expectation/request |
| moves.browser.mjs | PASS | FAIL: root-path expectation/request |
| moveTutors.browser.mjs | PASS | PASS |
| natureChart.browser.mjs | PASS | PASS |
| pagesDeployment.browser.mjs | PASS | PASS |
| resources.browser.mjs | PASS | FAIL: root-path expectation/request |
| restoredDamageReview.browser.mjs | PASS | PASS |
| setSearch.browser.mjs | PASS | FAIL: root-path expectation/request |
| showcase.browser.mjs | PASS | PASS |
| specialDamage.browser.mjs | PASS | PASS |
| speciesLearnset.browser.mjs | PASS | FAIL: root-path expectation/request |
| speciesLocations.browser.mjs | PASS | PASS |
| speciesMore.browser.mjs | PASS | PASS |
| speciesProfile.browser.mjs | PASS | FAIL: root-path expectation/request |
| speciesStats.browser.mjs | PASS | FAIL: root-path expectation/request |
| statCalculator.browser.mjs | PASS | PASS |
| trainerDashboard.browser.mjs | PASS | FAIL: root-path expectation/request |
| trainerSearch.browser.mjs | PASS | FAIL: root-path expectation/request |
| typeChart.browser.mjs | PASS | FAIL: root-path expectation/request |
| variableDamage.browser.mjs | PASS | PASS |

The production Pages smoke also passed independently on live HTTPS, including all 3,225 public assets. Four additional live calculator scripts passed; the original live trainer-search script failed on the same root-path assertion, and a separate audit script verified its key search/selection behavior. Production checks that fail early do not execute every later assertion.

Evidence: unit/build logs `/tmp/emerald-unit-audit.log` and `/tmp/emerald-build-audit.log`; script results `/tmp/live-audit-browser-summary.json`, `/tmp/live-audit-dev-browser-summary.json`, and `/tmp/live-audit-live-browser-summary.json`; per-script logs `/tmp/live-audit-browser-*.log` and `/tmp/live-audit-dev-browser-*.log`; live smoke `/tmp/live-audit-pages.log`; layout/network evidence `/tmp/emerald-live-layout.json`; parity logs `/tmp/live-audit-verify*.log`. Temporary files may be removed by the OS; exact aggregate outcomes are retained here.

## 9. Known limitations

- Chromium emulation cannot establish Safari behavior, physical-device performance, safe-area/keyboard behavior, or long-term storage retention. The user's prior iPhone test was not repeated by this audit.
- The application has many possible team, matchup, calculator, search, and save states; passing samples and existing regression suites do not prove every combination.
- Network/privacy conclusions combine source inspection and observed workflows, not a formal security assessment. GitHub still receives ordinary website asset requests; no selected save contents were transmitted in tested flows.
- No offline installation guarantee is established: the manifest exists, but no service worker registration was found.
- The audit compares the current deployed commit and resources at the time of testing; later deployments may differ.

## 10. Prioritized recommendations

**Critical:** None observed that prevents essential functionality.

**High:** None established by the completed deployment, asset, save, layout, or calculator checks.

**Medium — M1: Make browser tests aware of the deployment base.** Several unchanged scripts assert development-root asset paths and stop early against an otherwise working production build; Move Coverage even generates its own root-level image requests. Keep root-mode regression coverage and add base-aware expectations so all workflows can run under the actual production prefix. Do not remove the prefix from working application assets to satisfy tests.

**Medium — M2: Gate deployment on regression checks.** The current workflow publishes after build alone. Add meaningful automated unit/integrity checks and a production-subdirectory smoke gate in a later authorized change. Without these, a future buildable regression can deploy successfully.

**Medium — M3: Validate startup cost on a physical iPhone and constrained network.** The single 3.37 MB minified JS bundle is confirmed. Use controlled device measurements to decide whether page/data splitting is warranted before final polish; retain correctness/parity checks during any eventual optimization.

**Low / final validation:** Repeat Safari import/reload/relaunch and representative populated layouts on the user's iPhone; review same-origin storage expectations and communicate separate import from localhost if needed. Keep scrolling and minor spacing in the deferred polish stage. Local `.DS_Store` build noise can be excluded in future packaging work; it is not evidence of private save deployment.

Stop after this audit. Application fixes, workflow edits, and final polish require the user's next instruction.
