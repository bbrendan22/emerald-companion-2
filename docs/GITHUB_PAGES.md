# GitHub Pages deployment

Site: https://bbrendan22.github.io/emerald-companion-2/

## Repository setup

In GitHub Settings → Pages → Build and deployment, set **Source: GitHub Actions**.
If GitHub requires an environment approval or limits allowed actions, resolve that
in the repository settings. No personal access token or custom deployment secret
is required. Repository settings cannot be confirmed from local Git configuration.

`.github/workflows/deploy-pages.yml` runs on pushes to `main` and supports manual
runs. It uses official checkout/setup-node/Pages actions with Node 24, `npm ci`,
`npm run build`, uploads **only `dist`**, then deploys the artifact in the
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

The existing browser scripts exercise normal localhost behavior. The additional
`test/pagesDeployment.browser.mjs` exercises the production subdirectory via
`PAGES_URL` (default `http://127.0.0.1:5192/emerald-companion-2/`). It verifies
navigation, image decoding, synthetic save import/reload, no uploads, and every
public asset's production bytes. Browser scripts use an existing Playwright/Chrome
installation through `PLAYWRIGHT_MODULE` / `CHROME_EXECUTABLE`; no browser testing
dependency is added to the app.

## Save privacy and storage

Save import continues to parse files locally and store them in browser localStorage.
There is no save upload endpoint. Neither private fixtures nor repository-root files
are included in the Pages artifact. Browser storage is origin-specific: localhost,
the 1.0 origin, and the new Pages origin may have different saved data. Reimport your
save on the new site when necessary. GitHub Pages serves the app without localhost.

## Official references

- https://vite.dev/guide/static-deploy.html#github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
