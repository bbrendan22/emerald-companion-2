# Nidoran species-name symbol alignment

## Cause and current correction

The application uses the system font stack. A Chrome platform-font inspection
on macOS showed `.SF NS` for “Nidoran” and `.CJK Symbols Fallback SC` for U+2640
and U+2642. The fallback glyphs have different vertical ink metrics. A text
presentation selector still selected that fallback font. The initial 0.08em
adjustment improved the Mac rendering but the user's actual iPhone screenshots
showed that the glyphs still sat below the names. That offset is now removed.

`src/ui/components/PokemonName.js` is the shared formatting boundary. It matches
only the Nidoran♀ / Nidoran♂ species token (case-insensitive), preserving the
original characters, suffixes and optional variation selectors. Other strings
return directly without wrappers. No stored names or National Dex IDs change.

Only the visible species gender sign is drawn as a small inline SVG. Its box is
0.75em high and sits directly on the name's text baseline. It inherits the name
color and scales with the current text size, with no platform-font glyph or
platform-specific vertical offset. The circle/arrow or circle/cross paths are
shared everywhere; no per-page fixes or font downloads are used.

The original gender character remains as ordinary inline text within the symbol
wrapper, with zero opacity. This retains its text geometry, copied text and
accessible name in both Chrome and WebKit. The vector is aria-hidden and not
focusable. The outer symbol box has fixed em dimensions and hidden overflow,
which gives it a stable inline-block baseline independently of its text's font
metrics. The SVG is absolutely positioned inside that box. Neither the SVG nor
its original text inserts a space or line break into the name. A zero-area
hidden-text variant was rejected because WebKit omitted its gender from
`innerText`; the retained inline-text approach passes exact name checks.

The name token stays nonwrapping and retains its original font size, weight and
color. No global rules modify standalone gender indicators, trainer classes,
other species, controls or application fonts.

## Rendering audit

The shared renderer covers visible names in:

- Resources home search, Pokédex rows, species profile headings/evolutions.
- My Pokémon gallery and individual profile headings/nicknames.
- Battle set results, matchup/condition headings, team lists and team-editor
  pickers/slots.
- Resources Pokémon Sets and expanded Trainers grids.
- Move learners, Ability species lists and Move Coverage results.
- IV/Stat Calculator suggestions and Showcase suggestions.
- Item machine-compatible species and source notes, location acquisition/trade
  references and learnset source-species references.

Image alternatives, accessible labels, query input values, dataset keys and
search/filter algorithms retain canonical strings. Separate Male/Female
metadata continues through its existing path. No data, save handling, battle
calculations, page layout, navigation, scrolling or legacy 1.0 changes were made.

## Verification

The read-only legacy parity tools adapt exact Nidoran species tokens in legacy
HTML text nodes through the shared renderer before comparing full markup.
Learnset affects only Dex 31/34 evolution-source notes; Locations affects only
Dex 29/32 trade notes. All surrounding comparisons and data/hash assertions
remain unchanged. The other four Resources checks require no adaptation.

All 432 unit tests pass. They cover exact text/case/set-label preservation,
both species, no inserted spaces, optional selectors, unrelated names and
standalone gender indicators. Female remains National Dex 29; male remains 32.
The production build passes with its existing bundle-size warning and retains
`/emerald-companion-2/`.

The updated targeted browser test passes in Chrome and WebKit (iPhone 13
emulation), at 320/375/390/430px. It checks both species across actual screens,
searches, separate gender metadata, font inheritance, no horizontal overflow,
and inherited 8/10/12/16/20/28px sizing. It inserts a zero-height baseline marker
next to each sign and compares the symbol bottom with the actual text baseline;
it no longer assumes a particular top offset means correct alignment.
Exact `innerText` and text content, accessible heading species/gender names
(with accessibility whitespace normalized), and aria-hidden SVG handling are
also checked. The preceding shared-renderer integration passed
all 22 relevant existing Chrome browser regressions; this revision retains the
same call sites and confines its change to the shared gender rendering.

Screenshots are `/private/tmp/{chromium|webkit}-nidoran-profile-{29|32}-{width}.png`,
`{engine}-nidoran-frontier-{width}.png`, `{engine}-nidoran-battle-{width}.png`,
`{engine}-nidoran-battle-sets-{width}.png`,
`{engine}-nidoran-trainer-grid-{width}.png`, and
`{engine}-nidoran-font-sizes-{width}.png` in `/private/tmp`.
These are engine/emulation checks, not a physical iPhone capture. The user’s
phone remains the final visual review. No commit or push was performed.
