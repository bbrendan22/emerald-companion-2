# GitHub Pages deployment

Site: https://bbrendan22.github.io/emerald-companion-2/

## Repository setup

In GitHub Settings → Pages → Build and deployment, set **Source: GitHub Actions**.
If GitHub requires an environment approval or limits allowed actions, resolve that
in the repository settings. No personal access token or custom deployment secret
is required. Repository settings cannot be confirmed from local Git configuration.

`.github/workflows/deploy-pages.yml` runs on pushes to `main` and supports manual
runs. It uses official checkout/setup-node/Pages actions with Node 24, `npm ci`,
the full unit suite, CI-compatible Resources rendering integrity, `npm run build`,
and a production-subdirectory browser smoke test. It uploads **only `dist`** after
all checks succeed, then deploys the artifact in the
`github-pages` environment. Build has contents/pages read access; deployment has
only pages write and OIDC token write access. Production deployments are serialized.

## Base paths and assets

`vite.config.js` uses `/emerald-companion-2/` for builds and previews, `/` for
normal development. Existing app navigation is React state, with no history-router
paths or server API to rewrite. The manifest already uses relative scope/start
and icon URLs; HTML icon/manifest links already use Vite's `%BASE_URL%`.

`src/assets/publicAsset.js` prefixes root-relative public image identifiers with
Vite's base at rendering boundaries. External/relative/data/blob URLs and already
prefixed URLs pass through. Image directories, canonical records, calculations,
styles, DOM structure and error handlers remain unchanged.

Run:

```sh
npm ci
npm test
npm run build
npm run preview
# Open http://localhost:4173/emerald-companion-2/
npm run dev
# Open http://localhost:5173/
```

## Browser regression testing

Playwright is an exact, lockfile-pinned development dependency. CI installs its
matching Chromium and Linux system dependencies with
`npx --no-install playwright install --with-deps chromium`. It is not shipped in
the production app. Locally, either install Chromium with that command (omit
`--with-deps` on macOS if unnecessary), or set `CHROME_EXECUTABLE` to an existing
Chrome executable. `PLAYWRIGHT_MODULE` remains supported for an existing runtime.

```sh
npm run test:browser:dev
npm run build
npm run test:browser:production
npm run test:pages
# Alternate ports, with strict conflict detection:
npm run test:browser:dev -- --port 5200
npm run test:browser:production -- --port 5201
# An already-running server, including live Pages:
npm run test:browser -- --url http://localhost:5201/emerald-companion-2/
```

The shared runner discovers all `test/*.browser.mjs` scripts (currently 43), runs
every one, records individual logs and a JSON summary in an OS temporary directory,
and exits nonzero if any script fails or times out. It runs two workers by default
(`--workers 1` through `4` supported), with a three-minute limit per script.
Managed servers bind to loopback, refuse occupied ports, and close when the runner
finishes. Defaults: development 5196, production 5197. `--url` requires a trailing
slash and uses a server managed separately.
The managed production target is explicitly `/emerald-companion-2/`, so a future
incorrect Vite base cannot silently move the smoke test to a different mount.

The runner sets `BROWSER_URL` and the existing `BATTLE_URL`, `SHOWCASE_URL`, and
`PAGES_URL` variables to one application URL. `test/helpers/browserPaths.js`
derives expected asset paths from that URL's pathname, independently of actual
application output. Thus exact filenames remain asserted under `/` in development
and `/emerald-companion-2/` in production. Browser-context assertions receive the
resolved expectation as a serialized argument. The Move Coverage test's generated
386 image requests use the same helper. Original decoding, fallback, content,
layout, and behavior assertions are retained. No app URL normalization or network
rewriting is used to make tests pass.

`npm run test:pages` runs only `pagesDeployment.browser.mjs` against a managed
production preview. It covers all Resources destinations, species tabs, decoded
images, real-file-input synthetic save import/reload, a Frontier role assignment,
trainer/sets views, opponent selection and damage preview. It rejects runtime,
console, HTTP and failed-request errors, root-path requests and save uploads, and
compares every nonhidden public asset's response bytes. CI runs this representative
smoke rather than all 43 browser scripts. The deploy job depends on the verified
build job; neither artifact upload nor deployment can run after a required check
fails.

## Resources integrity: CI and local boundaries

```sh
npm run verify:resources:ci
npm run verify:resources:local -- /absolute/path/to/emerald-companion
```

All six original checks are preserved, without fabricated legacy snapshots or
changed assertions:

| Existing check | GitHub Actions | Local verification |
| --- | --- | --- |
| `verifyResourcesItemsRender.mjs` | Required: 309 item/machine detail renders and 58 grids | Required |
| `verifyPokemonDatabase.mjs` | Local-only: imports original legacy species/data/helpers | Required, read-only legacy root |
| `verifyResourcesItems.mjs` | Local-only: original legacy hashes/data/component/icon comparisons | Required, read-only legacy root |
| `verifyResourcesLearnset.mjs` | Local-only: original legacy hashes/data/helpers/rendered JSX | Required, read-only legacy root |
| `verifyResourcesLocations.mjs` | Local-only: original legacy hashes/data/helpers/rendered JSX | Required, read-only legacy root |
| `verifyMoveCoverageParity.mjs` | Local-only: original legacy roster/chart/helper comparisons | Required, read-only legacy root |

Five full legacy parity checks cannot run on a clean checkout of this repository:
their comparison source is the user's separate local 1.0 directory. CI explicitly
reports this limitation; it does not silently catch their failures or pretend to
run them. The standalone rendering check and full unit suite (including existing
Resources/data/asset integrity tests) run on CI. Local verification runs all six
original scripts and fails on any error. Future parity CI would need an approved,
independently maintained public reference source; no private directory is uploaded
or fetched as a workaround.

The full unit command is unchanged. Its seven existing private-save integration
tests explicitly skip when the ignored fixture is absent on CI; synthetic parser,
storage, calculator, and Resources tests still run. No private save or expectation
file is required by either new runner or the production smoke test.

## Verification record

The October 18 deployment audit is retained in `LIVE_DEPLOYMENT_AUDIT.md` as a
historical baseline; its 18 production test failures predate the shared path helper.
Current reliability verification results are recorded in
`PRODUCTION_TEST_RELIABILITY.md`.

## Save privacy and storage

Save import continues to parse files locally and store them in browser localStorage.
There is no save upload endpoint. Neither private fixtures nor repository-root files
are included in the Pages artifact. Browser storage is origin-specific: localhost,
the 1.0 origin, and the new Pages origin may have different saved data. Reimport your
save on the new site when necessary. GitHub Pages serves the app without localhost.

## Official references

- https://vite.dev/guide/static-deploy.html#github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
