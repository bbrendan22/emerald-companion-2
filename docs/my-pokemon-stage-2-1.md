# Stage 2.1 — modular profile layout

The individual profile is now one continuous page with a compact split showcase
and a five-column mobile grid. Moves and Current Stats occupy three columns;
Ability/Held Item and IVs occupy two. EVs sit beside the three smaller Hidden
Power, Friendship and Pokérus cards. Ribbons and Role share a row; Origin uses
two compact field columns. At desktop widths a ten-column grid places four main
cards across the first row. Cards adapt to their contents, including ribbon wrapping.

The showcase uses the existing normal/shiny high-resolution artwork, a Dex and
generation line, species and inline quoted nickname, type icons, and written
level/gender/nature. Long names wrap naturally. No location or gender symbol is shown.

Removed from the rendered profile: Summary/Advanced controls, Base Stats, Type
Matchups, experience, storage location, move PP, IV/EV bars and Pokérus images.
Current-stat bars retain the shared 0–714 scale and distinguish saved party values
from calculated PC/Day Care values. The existing stat calculations, ribbon decoding,
Hidden Power, Pokérus state, identities and persistent roles are unchanged.

Only the profile component and its scoped stylesheet changed for this redesign.
Collection markup/styles, Trainer, navigation, parser, save storage and original
1.0 project are unchanged. No dependencies or asset downloads were introduced.

## Validation

- Full automated test suite and production build pass.
- iPhone checks at 320px/390px and desktop at 1440px: no horizontal overflow,
  overlapping cards, clipped nickname, missing artwork or cut-off icons.
- Real-save browser checks: shiny dual-type Swampert with held item and no ribbons;
  non-shiny nicknamed single-type Ditto with no item; duplicate Ditto remain separate.
- A local ignored synthetic harness checks a long species name and ten-character
  nickname, empty moves, party HP and all 32 ribbon icons, including narrow layout
  and record-note placement. This harness uses no private save data.
- Role assignment survives moving between Gallery and Box profiles and is reflected
  in the Utility filter. Back navigation retains the collection search and view.
- Preview screenshots and the layout harness remain under ignored `artifacts/`.

No save files were modified. No commit or push was performed.
