# Emerald Companion 2.0

A phone-first React application shell with a dark graphite theme. Trainer opens by default; the drawer contains Trainer, My Pokémon, Battle, and Resources. Settings opens from the header gear. Trainer displays imported save data; the other main sections remain placeholders. Navigation uses local React state and resets on reload.

## Run

Use Node 22.12+ (or a newer supported LTS release).

```sh
npm install
npm run dev
```

Open http://localhost:5173. The dev server also listens on your local network for phone testing.

```sh
npm test          # Existing parser regression suite
npm run build    # Production output in dist/
npm run preview  # Serve the build at http://localhost:4173/emerald-companion-2/
```

## Folder structure

- `src/main.jsx` — browser entry point.
- `src/ui/App.jsx` — page/drawer state and shared layout.
- `src/ui/pages/` — Trainer card and Pokédex progress; Settings save import.
- `src/ui/useImportedSave.js` — browser import lifecycle.
- `src/storage/saveStorage.js` — validated, atomic local save persistence.
- `src/ui/navigation.js` — four section names and accent colors; separate Settings metadata.
- `src/ui/components/` — shared shell components, Gym Badges, and Hall of Fame.
- `src/ui/styles/` — base, header, drawer, and page styles.
- `src/save/` — validated save decoding, calculations, Hall of Fame records, and Trainer snapshot assembly.
- `src/data/` — parser reference data.
- `test/` — Node tests, independent synthetic fixtures, and private real-save regressions.
- `docs/SAVE_PARSER.md` — parser API, scope, and provenance.

The shell supports natural document scrolling, iPhone safe areas, and reduced motion. Imports persist in localStorage on the same browser and origin (including port). Offline caching and iPhone installation remain a later scoped task. There are no external fonts or runtime services.

With the private fixture available, `npm test` runs 52 tests, including all prior 43 tests and nine Stage 2 additions. Seven are real-save regressions. Without the private fixture, those seven explicitly skip. Keep private saves and manifests out of application assets and version control. See [save validation](REAL_SAVE_VALIDATION.md) and [parser documentation](docs/SAVE_PARSER.md).

This application is separate from Emerald Companion 1.0.

## Trainer Stage 1

1. Start the app, open the header gear, and choose your raw 128 KiB Emerald `.sav` in Settings.
2. Open Trainer in the drawer. The card shows the save’s Brendan/May artwork, identity, playtime, money, and spendable BP.
3. Refresh or reopen the same URL to verify persistence. An invalid import or failed storage write keeps the previous save intact. Saves stay in this browser; nothing is uploaded. Clearing browser data removes them.

Caught counts unique National Dex caught flags out of 386. Owned counts individual party, PC, and deposited Day Care Pokémon, including duplicates and eggs. Shinies counts those owned Pokémon with a shiny PID/OT combination. A pending Day Care egg is not an owned record. Corrupt Pokémon records reject the import rather than producing incomplete counts.

New gender (`SaveBlock2 + 0x08`) and spendable Battle Points (`SaveBlock2 + 0xEB8`, not lifetime card BP) follow [pret/pokeemerald global.h](https://github.com/pret/pokeemerald/blob/master/include/global.h). They have synthetic coverage, but are not yet independently pinned in the private manifest or confirmed in-game. Occupied Day Care counting has synthetic coverage; the real fixture has empty Day Care slots. Day Care gained experience is not calculated. Unknown gender has no guessed portrait; invalid playtime or out-of-range money displays Unavailable. Existing parser text/layout limitations still apply.

## Trainer Stage 2

Gym Badges uses the existing eight save flags in Hoenn Gym order. Earned badges are shown in color, unearned badges dimmed, with an earned total. Hall of Fame uses the game-clear flag (`0x864`) for the Champion indicator; it does not infer individual Pokémon ribbons.

The independent `readHallOfFame` decoder reads physical sectors 28–29, validating both signatures and special checksum fields before joining their payloads. It reads the earliest valid retained team in recorded party order and maps internal species IDs to National Dex sprite filenames. Shiny status uses the recorded PID and original Trainer ID. Missing, corrupt, or unsupported records have explicit empty/unavailable states; the current party is never substituted. Damaged Hall of Fame history does not block importing otherwise valid Trainer data.

Emerald retains at most 50 chronological teams, so the earliest remaining team is not guaranteed to be the first championship team. These sectors are shared across normal save slots and do not carry normal slot-generation counters. Unsupported egg artwork is shown as text. Existing Western-text and special-form sprite limitations still apply.

Existing imports automatically gain the new sections on refresh: raw bytes were already persisted. Use Settings to import a newer `.sav` if needed. The real fixture’s Champion flag and six-member recorded team were checked by `test/fixtures/inspect_hall_of_fame.py`, a separate Python reader. Its pinned private expectations are kept alongside the original manifest without replacing it. In-game Hall of Fame screen confirmation remains outstanding.

Source: [save sector handling](https://github.com/pret/pokeemerald/blob/master/src/save.c), [Hall of Fame structure and retention](https://github.com/pret/pokeemerald/blob/master/src/hall_of_fame.c), and [game-clear/badge flags](https://github.com/pret/pokeemerald/blob/master/include/constants/flags.h).

## GitHub Pages

Production is built for `/emerald-companion-2/`; localhost development remains at `/`.
See [deployment setup and verification](docs/GITHUB_PAGES.md).
