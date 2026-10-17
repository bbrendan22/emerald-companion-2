# Stage 2.3 — profile visual refinement and species stat bars

The connected dashboard now has dark page-background separators and no visible
outer outline. Showcase artwork and identity sizing are unchanged; its surface
uses a restrained graphite gradient. Section headings, including Ability/Held Item,
share typography and a thin underline. Role buttons put Frontier/Utility above
full-width Collection. Mechanics and compact Origin occupy the column beside EVs,
with Ribbons immediately beneath the combined row.

## Bar scaling

Current calculated stat values are unchanged. Only bar lengths use species base
stats, independently normalized per stat by `5 + 95 * (value-min)/(max-min)`, clamped
to 5–100. `src/pokemon/statBars.js` validates that the reference contains exactly
one record for every National Dex ID 1–386 and six complete base-stat fields.
Missing/incomplete reference data fails explicitly instead of deriving partial ranges.

| Stat | Minimum | Maximum |
| --- | ---: | ---: |
| HP | 1 | 255 |
| Atk | 5 | 160 |
| Def | 5 | 230 |
| SpA | 10 | 154 |
| SpD | 20 | 230 |
| Spe | 5 | 180 |

Ranges come from the existing validated Emerald reference. Deoxys uses its Emerald
Speed Forme, matching the existing parser; alternate forms are not additional species.
Shedinja's base HP of 1 maps to 5%, and Blissey's HP maps to 100%. IVs, EVs, nature
and level do not enter the bar calculation. Existing stat colors are preserved.

## Validation

Tests cover all 386 species and every stat, independent expected range extrema,
endpoints, midpoint, clamping, invalid/missing data, Shedinja, Deoxys, and invariance
under level/IV/EV/nature changes without mutating current calculated stats.
Full suite and production build pass. Browser checks cover narrow iPhone and desktop
layouts, connected dark separators, heading treatment, role ordering, lower grouping,
zero/multiple ribbons, and unchanged current values. Screenshots remain ignored.

No parser, current-stat formulas, save file, collection design, header/navigation,
role storage, dependencies, or original 1.0 project files changed. No commit or push.
