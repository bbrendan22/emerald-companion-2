# Stage 2.2 — connected profile refinement

The profile information dashboard has one rounded boundary, no inter-section gaps,
and thin My Pokémon blue dividers. Its connected rows are:

1. Calculated Current Stats beside Role, with Ability/Held Item directly below Role.
2. Moves beside IVs.
3. EVs beside one combined Hidden Power/Friendship/Pokérus section.
4. Compact Origin.
5. Ribbons, always last, sized by actual content.

Record notes, if present, appear before Ribbons. The dashboard uses ordinary
vertical document scrolling. Its column pairs have shared edges and no empty grid
cells. Role and item controls are compact, while the split artwork showcase retains
contained artwork and wrapping identity text.

A shared `--page-gutter: 12px` is declared in page.css and applied only when the My
Pokémon page contains an individual profile. Safe-area insets are respected.
Collection, Trainer and other page margins are unchanged.

Stat labels are HP, Atk, Def, SpA, SpD, Spe. Current Stats uses the existing parser's
calculated stat values, retains the unchanged /714 bar formula, and now has a distinct
consistent color per stat. Current HP and explanatory/scale text are no longer shown.
IVs highlight exactly 31; EVs highlight 252 or higher. Both totals are single values.

Origin includes OT, Trainer ID and parsed origin game. Met location is omitted
because this project has no validated name table. No location names are invented.
No parser, calculations, persistence, collection design, navigation, save files,
dependencies, or original 1.0 project files were changed.

## Validation

Full automated suite and production build pass. Browser checks at 320px, 390px and
1440px confirm no horizontal overflow or overflowing card contents, connected section
edges, Role above Ability/Item, contained artwork, and Ribbons last. The ignored
synthetic harness checks long nickname wrapping, all 32 ribbon icons, IV 30 vs 31,
and EV 251 vs 252/255. Real-save checks confirm role persistence between Gallery and
Box and correct role-filter behavior. Previews remain in ignored artifacts/.

No commit or push performed.
