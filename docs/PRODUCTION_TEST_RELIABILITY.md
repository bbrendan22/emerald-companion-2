# Production tests and Pages deployment reliability

October 18, 2026. Addresses M1 and M2 from `LIVE_DEPLOYMENT_AUDIT.md`. Application code, visual design, scrolling, navigation, reference data, calculations, battle mechanics, save parsing/storage, Vite configuration, and performance architecture are unchanged. Legacy 1.0 was read only.

## Changes

- `test/helpers/browserPaths.js` derives expected asset paths from the configured application URL. It never rewrites the application's actual image attributes. Two new unit tests cover root/Pages paths and existing environment-variable compatibility.
- Eighteen affected browser scripts now resolve expected paths with that helper, including exact arrays, browser-context checks, a fallback selector, and Move Coverage's 386 generated image requests. Image decoding and original behavior assertions are retained.
- `tools/runBrowserTests.mjs` discovers all 43 scripts, supports managed development/production servers or an external URL, runs two workers, writes separate temporary logs/results, and fails if any script fails or exceeds three minutes. Managed production explicitly targets `/emerald-companion-2/`; managed ports are strict and servers close on completion. `--smoke` runs the production Pages script only.
- `test/pagesDeployment.browser.mjs` retains its full Resources/public-asset/save checks and adds console/request failure assertions, a populated Trainer visit, a UI Frontier role assignment, opponent set selection, and damage-preview verification.
- `tools/verifyResources.mjs` explicitly separates CI-compatible verification from local legacy parity. The original six check scripts and their assertions are unchanged.
- `package.json` and `package-lock.json` pin Playwright 1.62.1 as a development dependency and add browser/integrity commands. Application dependencies are unchanged.
- `.github/workflows/deploy-pages.yml` requires unit tests, CI-compatible Resources integrity, production build, pinned Chromium installation, and the production-subdirectory smoke before uploading `dist`. Deployment still depends on the build job's success.
- `docs/GITHUB_PAGES.md` documents commands, expected paths, CI gates, local-only boundaries, and private-fixture handling. The earlier audit is preserved as a historical baseline.

Affected browser expectation scripts: `abilities`, `battleAccuracyCorrections`, `battleHeaders`, `battleHub`, `battleMatchup`, `battleTeams`, `emeraldPickup`, `items`, `moveCoverage`, `moves`, `resources`, `setSearch`, `speciesLearnset`, `speciesProfile`, `speciesStats`, `trainerDashboard`, `trainerSearch`, and `typeChart` (all under `test/`, suffix `.browser.mjs`). The nineteenth edited browser script is `pagesDeployment.browser.mjs`.

## Local verification

| Check | Result |
| --- | --- |
| Full unit suite, `npm test` | 420 passed; 0 failed/skipped/cancelled |
| Development browser suite, `http://127.0.0.1:5196/` | 43/43 passed; no timeout |
| Production browser suite, `http://127.0.0.1:5197/emerald-companion-2/` | 43/43 passed; no timeout |
| Standalone production smoke, port 5198 | Passed, including synthetic save, damage preview and all 3,225 public assets |
| Production build | Passed; unchanged `index-D6mZLtKs.js` / `index-DkPnuJ_k.css`; existing bundle-size warning remains |
| CI-compatible Resources command | Standalone item render check passed: 309 detail pages, 58 compatibility grids |
| Local Resources command with read-only 1.0 root | All six original checks passed |
| Application/reference diff | No changes to `src`, `public`, `index.html`, or `vite.config.js` |

The development run emitted React duplicate-child-key diagnostics (keys `22` and `26`) during the broad species checks. Existing script assertions still passed. These diagnostics are recorded, not suppressed; application diagnosis/fixes are outside this task. A separate Vite `Unknown Error: [object Event]` log corresponds to the existing Set Search test deliberately dispatching an image `error` event to verify fallback behavior. The production smoke passed its explicit console, exception, failed-request and HTTP-error checks.

Evidence remains in OS temporary files: `/tmp/reliability-unit.log`, `/tmp/reliability-resources.log`, `/tmp/reliability-resources-ci.log`, `/tmp/reliability-build.log`, `/tmp/reliability-browser-dev.log`, `/tmp/reliability-browser-production.log`, and `/tmp/reliability-smoke-final.log`. Each browser runner prints its unique log directory and writes per-script output plus `summary.json`; all 43 results were inspected for failures/timeouts. Temporary evidence is not part of the deployment artifact.

## CI versus local Resources checks

| Original check | CI status | Local result |
| --- | --- | --- |
| `verifyResourcesItemsRender.mjs` | Required, standalone | PASS |
| `verifyPokemonDatabase.mjs` | Local-only: original legacy imports | PASS |
| `verifyResourcesItems.mjs` | Local-only: original legacy hashes/data/icons/components | PASS |
| `verifyResourcesLearnset.mjs` | Local-only: original legacy data/helpers/rendered JSX | PASS |
| `verifyResourcesLocations.mjs` | Local-only: original legacy data/helpers/rendered JSX | PASS |
| `verifyMoveCoverageParity.mjs` | Local-only: original legacy roster/chart/helpers | PASS |

CI cannot run the five original cross-project comparisons without a separately approved reference source. They remain available through `npm run verify:resources:local -- <legacy-root>` and fail normally on discrepancies. CI does not fabricate fixtures, catch-and-ignore parity failures, or claim those five comparisons ran. It does run the full unit suite, including existing Resources integrity/data/asset tests, plus standalone rendering and production smoke.

## Privacy and publishing

Only `dist` is uploaded by the existing Pages artifact action. The workflow does not upload test logs, the repository root, local backups, or the separate legacy project. The only tracked file in `test/fixtures/real` is its README; private save/expectation files remain ignored. The full unit suite's seven existing private integration tests explicitly skip when the fixture is unavailable on a clean CI checkout. No private fixtures were changed or bundled. Browser tests use isolated synthetic saves, local parsing/storage, and verify absence of uploads. No credential or new external processing service was added.

The authorized commit and push are conditional on these checks passing. GitHub Actions and the live site are verified after pushing; their run URL, final commit, and deployment outcome are reported in the completion message rather than writing a self-referential commit hash here.

## Remaining work outside this task

- Diagnose the development React duplicate-key diagnostics in a separately authorized application change.
- The known bundle warning (M3), physical iPhone performance checks, scrolling, and final polish remain deferred.
- Five legacy parity comparisons remain local-only for the reasons above.
