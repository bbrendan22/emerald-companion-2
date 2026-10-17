# Stage 2.4 — layout polish and ribbon collection

The split showcase allocates more space to artwork and shifts identity slightly
right. Reduced vertical padding keeps the height close to the previous design.
Artwork remains contained with its aspect ratio preserved. Headings now have
content-width underlines, including Ability and Held Item.

The three dashboard bands use stretched Grid columns and natural-height nested
stacks, without fixed heights: Stats beside Role/Ability, Moves beside IVs, and EVs
beside mechanics/Origin. Mechanics uses tighter internal spacing. Existing margins,
dark separators, stat values/scaling/colors, role controls, collection, navigation,
parser and storage are unchanged.

## Ribbon catalogue

The deterministic catalogue reuses `earnedRibbons` labels and asset mappings:

1. Cool: Normal, Super, Hyper, Master.
2. Beauty: Normal, Super, Hyper, Master.
3. Cute: Normal, Super, Hyper, Master.
4. Smart: Normal, Super, Hyper, Master.
5. Tough: Normal, Super, Hyper, Master.
6. Champion, Winning, Victory, Artist, Effort, Marine, Land, Sky, Country, National,
   Earth, World.

These are the 20 contest awards and 12 one-bit awards in Gen 3. The existing decoder
expands highest contest rank cumulatively and reads other ribbon flags from bits
15–26. The catalogue includes all 32 assets; it does not change earned-state decoding
or set flags in a save. Unused and fateful-encounter bits remain excluded. Some award
types were never distributed, but are still real Gen 3 ribbon fields and assets.
The field layout was verified during Stage 2 against
[Emerald's record structure](https://github.com/pret/pokeemerald/blob/master/include/pokemon.h).

The grid is eight columns/four rows, with full-color earned icons and grayscale,
slightly dimmed unearned icons. Each ribbon is a labeled native button. A small
viewport-clamped anchored tooltip shows its name and earned state. Tapping another
ribbon switches it; outside pointer presses and Escape close it. Enter/Space work
through native buttons. The tooltip is portaled to the document body so the dashboard's
rounded clipping boundary cannot cut it off. Scroll and resize update its position.

## Validation

Full tests and production build pass. Added catalogue tests confirm all names,
ordering, unique 32 assets, and one-bit decoder alignment. Browser checks at 320px,
390px and 1440px confirm equal heights in each major band, no horizontal/card overflow,
8×4 icons, short underlines, and popups within the viewport. Enter, Space, Escape,
ribbon switching and outside dismissal were exercised. Synthetic and real records
cover all-earned, no-earned, long names and earned/unearned appearance. Screenshots
and the synthetic layout harness remain ignored in artifacts/.

No dependencies or assets added; no original 1.0 files or saves changed. No commit/push.
