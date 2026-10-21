# Typography

This is the single typography guide for Emerald Companion 2.0. Shared tokens live
in `src/ui/styles/base.css`; component styles assign them to their own hierarchy.
Home is the reference for visual cleanliness, not a layout template for every page.

Keep the root browser size at its normal 16px. Set default text on `body`, so rem
sizes and existing dimensions retain their meaning. Use the existing system font
stack; on iPhone this resolves to Apple's system font. Do not add a web font.

## Shared tokens

### Family, size and weight

| Token | Value | Use |
| --- | --- | --- |
| `--font-family-system` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | App text; controls inherit it |
| `--font-size-large` | 1rem / 16px | Prominent identities, Trainer name, species profile name, app brand |
| `--font-size-heading` | .8125rem / 13px | Page/section headings and popup titles |
| `--font-size-body` | .75rem / 12px | Values, stats, moves, database entries, navigation and links |
| `--font-size-small` | .625rem / 10px | Labels, metadata and secondary notes |
| `--font-weight-regular` | 400 | Normal text and values |
| `--font-weight-semibold` | 600 | Headings, emphasis and selected states |

Use weight and existing colors for additional hierarchy rather than adding sizes.
Component declarations use these tokens directly, rather than a global override
that flattens every descendant's typography. The base styles supply low-specificity
fallbacks for headings, labels, controls and emphasis.

### Line height and letter spacing

| Token | Value | Use |
| --- | --- | --- |
| `--line-height-heading` | 1.2 | Default headings and identity text |
| `--line-height-body` | 1.4 | Default body text and values |
| `--line-height-compact` | 1.35 | Existing compact Home lists, gallery and short labels |
| `--line-height-relaxed` | 1.5 | Multi-line descriptions and explanatory text |
| `--letter-spacing-normal` | `normal` | Standard text, names and headings |
| `--letter-spacing-label` | .025em | Existing uppercase/compact metadata that needs tracking |
| `--letter-spacing-brand` | -.025em | Existing app wordmark only |

Line heights are unitless so they follow font size. Prefer Heading or Body for new
components; use Compact or Relaxed for a concrete layout need. Never introduce a
new line-height value just to create hierarchy. Existing tighter fixed rows and
long-form copy are exceptions below. Do not apply uppercase or tracking to all
labels. `.text-tracked-label` is an explicit opt-in for suitable metadata.

### Text palette and semantic roles

These are exact aliases of existing colors, not a new palette. Choose the role
that describes the text; retain the established surface variant when migrating
an existing component. Colors below are text tokens, not background/border tokens.

| Token | Existing color | Role |
| --- | --- | --- |
| `--text-primary` | #f3f4f6 | Main app text |
| `--text-primary-resource` | #e3e6eb | Main resource text |
| `--text-secondary` | #b5bbc5 | Home/Collection neutral text |
| `--text-secondary-resource` | #b8c0cc | Resource descriptions and supporting text |
| `--text-muted` | #939ba6 | Resource labels and subdued metadata |
| `--text-muted-soft` | #a2a9b4 | Existing Home/Battle/Settings explanatory text |
| `--text-label` | #9da7b3 | Collection labels and secondary details |
| `--text-status-success` | #69d99a | Existing positive Battle states |
| `--text-status-warning` | #ffd85c | Existing warning/active-filter emphasis |
| `--text-status-error` | #ed8493 | Existing error text |

The current Home neutral-text rule and green/yellow headings remain. Existing
`--trainer-*`, `--resources-*`, `--pokemon-*` and `--stat-color` variables still
control accents and meaningful data colors. Preserve Pokémon type, nature,
gender, shiny, ribbon, stat and matchup colors. A female symbol or a decreased
nature stat is data, not an error: do not assign it an error role just because the
hex color happens to match. Less common legacy text shades remain where replacing
them with a different semantic shade would visibly change the component. Reuse
an exact existing alias when available; do not add a near-duplicate color token.

### Numbers

| Token / utility | Value / purpose |
| --- | --- |
| `--font-numeric-tabular` | `tabular-nums`: equal-width digits |
| `--font-numeric-proportional` | `proportional-nums`: normal text digit spacing |
| `.text-tabular` | Opt in for a numeric value |
| `.text-proportional` | Explicitly return to proportional digits |

Use tabular numbers for stats, IVs/EVs, HP/PP, IDs, Dex numbers, counts, totals and
other values that benefit from aligned digits. Existing numeric tables and stat
rows use the same token directly. Keep names and prose proportional; avoid putting
`tabular-nums` on an entire page. Preserve current locale formatting, zero-padding,
decimal precision, units and calculations: typography does not reformat data.

## Alignment, wrapping and truncation

- Components own alignment. Left-align prose and field values by default; center
  artwork-associated labels or compact grid cells where that layout calls for it.
  Right-align numeric columns when they are compared vertically. Do not globally
  center labels or right-align all `dd` elements.
- Allow normal wrapping in descriptions and values. In flex/grid containers, use
  `min-width: 0` on shrinkable text tracks; use `minmax(0, 1fr)` where appropriate.
  `overflow-wrap: anywhere` is a fallback for long names/identifiers, not a global
  word-breaking rule.
- Keep genuinely atomic strings such as IDs, PP fractions and compact metadata
  together. Avoid `nowrap` on long item, ability or move descriptions.
- Use ellipsis only in deliberately bounded identity/list slots. It needs
  `overflow: hidden`, `white-space: nowrap`, and `text-overflow: ellipsis` together.
  Preserve the full accessible name or existing `title`/detail view. Do not shorten
  the underlying Pokémon name to make it fit.
- The shared `PokemonName` component keeps Nidoran symbols aligned to the font
  baseline. Keep its inherited font/gender glyph treatment; do not replace it with
  custom spacing or alter its SVG dimensions during typography work.
- Do not apply generic wrapping/truncation utility overrides to every descendant.
  Check both horizontal overflow and clipping inside the component, including
  long species, moves, abilities, held items and translated/unknown data labels.

## Page-specific assignments

All pages use the same tokens; their layouts determine the roles.

| Area | Application |
| --- | --- |
| Home | Trainer name and prominent counts Large; Trainer/Resources and section headings Heading; values, resource links, directories and search results Body; field labels and secondary notes Small. Preserve its compact 1.35 lines and measured inherited `normal` line boxes. |
| Collection gallery | Names and role/filter actions Body; level/Dex and other metadata Small. Keep the four-column gallery, existing ellipsis and full button names. |
| Collection Pokémon detail popup | Prominent species name Large/Semibold; gender, level, Dex and generation Small; role dropdown Body; section headings Heading/Semibold; moves, stats and values Body; labels, PP and explanatory notes Small. Preserve the three-part header, existing bounded-name ellipsis and role placement. Numeric values use tabular digits. |
| Resources and popups | Database entries, links, move names and values Body; page/section headings and popup titles Heading; species profile identity Large; labels, Dex metadata and notes Small. Preserve existing resource palette variants, native popup scrolling and deliberate label wrapping. |
| Battle | Page and dialog headings Heading; moves, values, tabs and results Body; secondary metadata Small. Compact identities can remain Body/Heading where Large would break a multi-column layout. Preserve the dense set-row exceptions. |
| Settings | Page/panel headings Heading; explanatory copy and actions Body; labels and storage notes Small. File controls inherit typography without changing dimensions or behavior. |
| Navigation | App brand Large/Semibold; menu entries Body/Regular. Preserve wordmark tracking, menu alignment, control sizes and glyph-based icons. |

A role is semantic, not a particular HTML tag: an `h2` used as a compact identity
may need a different role from a page heading. Assign its size in the existing
component selector, not in a competing high-specificity page-wide override.

## Intentional exceptions

- Touch inputs/selects/textareas use the Large token to prevent Safari focus zoom.
  Home search keeps its existing scaled-input technique: a 16px input scaled by
  .75 gives 12px visible text. Its container follows Body and Compact tokens.
  Keep native pinch zoom and input focus behavior.
- Home preserves inherited `normal` line boxes and explicit Compact/Relaxed lines.
  Switching every line to 1.4 would expand its current two-column geometry.
- Battle set search results retain original 8–11px text, a fluid 7.5–10px move
  line, and fixed 16px line boxes. These three-row results place six stats and four
  moves beside identity/item data; increasing them needs a separate layout task.
- The dense 18-type chart retains its container-dependent 9–13px cell text.
- Frontier set popup facts start at Body, then use existing measured shrinking
  only when long abilities/EV spreads cannot fit the single-line row. Its numeric
  fit is a technical exception, not an extra design size.
- Other existing compact rows retain their 1.25/1.3/1.45 or fixed 20px line boxes when
  tied to table, icon or control geometry. Existing longer help/storage prose can
  retain 1.55–1.7 leading. These local values are not new defaults for components.
- Glyph close/clear controls and the gallery shiny star retain their physical
  sizes because they function as icons. The brand retains its subtle negative
  tracking. Neither exception should be copied to ordinary text.
- Existing accents, status variants and meaningful data colors remain; no color
  approximation or global palette replacement is part of this cleanup.

## Audit and maintenance

The audit covered Home, Collection/gallery/profile, Resources/databases/popups,
Battle, Settings, and shared navigation. Sizes/weights were already tokenized.
Remaining findings were repeated family declarations, multiple line-height variants
(including fixed rows and inherited values), several negative tracking values,
repeated text hex colors, uneven numeric opt-in, and component-owned alignment,
wrapping and ellipsis. Exact common colors and line heights now use shared tokens;
standard heading tracking is normal, and numeric opt-ins share one definition.
Local measured/dense exceptions remain visible instead of being hidden by a broad
reset. Consolidate redundant declarations only when the final cascade is unchanged.

For a new component:

1. Choose a role and existing size/weight; inherit the system font.
2. Choose Heading/Body leading, then justify Compact/Relaxed if needed.
3. Use normal tracking and an existing semantic text color or meaningful data
   color. Use the tracked-label utility sparingly.
4. Opt numeric values into tabular digits and choose alignment at the component.
5. Select wrapping/ellipsis deliberately and test long real data at 375px/430px.
6. If the shared values would break a compact layout, document a narrow exception
   here and beside the rule. Do not redesign the component as a side effect.

`test/typography.browser.mjs` checks the four sizes/two weights, representative
hierarchy, documented exceptions, artwork dimensions, compact Home geometry,
Safari input behavior and overflow at 375px and 430px. Run WebKit with
`TYPOGRAPHY_WEBKIT=1`. The Home-only mode can capture and compare temporary exact
computed-style/geometry baselines with `TYPOGRAPHY_HOME_ONLY=1` plus
`TYPOGRAPHY_CAPTURE_BASELINE=1` or `TYPOGRAPHY_COMPARE_BASELINE=1` on the same machine
and browser. These local before/after snapshots are not portable golden files.
Also run the Collection interaction/navigation and resource-popup tests, then a
production build. Browser-engine checks do not replace physical-device checks of
iPhone Safari's browser chrome and momentum scrolling.
