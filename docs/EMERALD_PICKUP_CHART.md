# Emerald Pickup chart verification

Source: existing `src/resources/items/data/pickupResources.js` (`pickupBands` only).
Verified on 2026-10-18 against:
- https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c
  - `sPickupItems`, `sRarePickupItems`, `sPickupProbabilities`, `Cmd_pickup`.
- https://bulbapedia.bulbagarden.net/wiki/Pickup_(Ability)#Pokémon_Emerald
  - Confirms the ten brackets and 30%/10%/4%/1% rarity groups.
- Requested Psypoke URL: https://www.psypokes.com/lab/pickup.php?version=emerald
  - Direct retrieval failed; not used to override game data.

Each bracket uses nine normal slots (30,10,10,10,10,10,10,4,4%)
and two rare slots (1% each). No discrepancies between the existing Emerald
records and the game's normal/rare arrays were found. These brackets contain
no duplicate items; the aggregation helper is separately tested with duplicate
slots. Other games' Pickup data and Battle Pyramid Pickup are excluded.

Names come from existing canonical `itemNames`; machine sprites use existing
`machineIconIds`. Canonical spellings (including `Hp Up`, `Pp Up`, `Kings Rock`,
and TM codes) are retained without editing any item records.

Per-battle percentages are conditional item percentages divided by ten for one
eligible Pokémon with Pickup holding no item. Each bracket totals 100% per
Pickup and 10% per eligible battle. No party-level aggregation is performed.
