# Original Emerald ribbon sprites

These 32 transparent 32×32 PNGs use the original Emerald ribbon graphics and
palette selections from pret/pokeemerald revision
`731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

Sources:
- https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/graphics/pokenav/ribbons/icons_big.png
- `graphics/pokenav/ribbons/icons1.pal` through `icons5.pal` at that revision.
- https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokenav_ribbons_summary.c

The source has twelve 32×32 shapes stacked vertically. Each output uses the
shape and palette assigned by `sRibbonGfxData`; palette index zero is transparent.
No redrawing or rescaling was applied. Filenames reuse the existing ribbon
catalog mapping. The other ribbon assets remain unchanged.

Ownership follows the existing cumulative rank decoder and bits 15–26 of the
saved ribbon word; unused bits 27–30 and the fateful flag at bit 31 are not awards.
