# Damage calculator restart — Step 6A

Only five fixed-damage moves are added to the new calculator. Ordinary damage, item/ability modifiers and the existing move allowlist otherwise remain unchanged. There are no new controls, persistent state, KO estimates or simulated turns.

## Files changed

- New `src/battle/fixedDamage.js`: explicit stable IDs69,101,82,49,162; independent fixed arithmetic, target-HP validation, immunity-only checks and deterministic outcome.
- `src/battle/basicDamage.js`: dispatch the five fixed IDs before ordinary stat/formula preparation; format their deterministic result as one percentage and one HP value. Ordinary ranges retain their existing format.
- `src/battle/damageModifiers.js`: extract the already-supported direct immunity gate unchanged for sharing; no ordinary modifier order/behavior changes.
- `src/ui/components/BattleMoveDetails.jsx`: explicitly pass defender current HP from its existing Battle Conditions projection. Popup markup, styling and dismissal are unchanged.
- New `test/fixedDamage.test.js` and `test/fixedDamage.browser.mjs`.
- `test/basicDamage.test.js`: remove only Dragon Rage/Seismic Toss from the former unsupported list; their detailed coverage is in the new tests. All other exclusions remain.
- This document and the historical-status pointer in the Step 5 record.

No changes to Conditions UI/reducers/persistence, cards, Stats/bars, moves rows, headers, other tabs, save data or pages. The retired engine/preview/KO modules remain outside the application import graph.

## Cartridge checks and separate scripts

Primary references: [Emerald's move scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s), [typecalc, dmgtolevel and damagetohalftargethp commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c), and [the Gen 3 sound-move list](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c).

Each relevant script was checked:

| Move | ID | Script path after typecalc | Raw damage |
| --- | --- | --- | --- |
| Seismic Toss |69| EffectLevelDamage: clear weakness/resistance flags, dmgtolevel, adjustsetdamage | Attacker's actual level |
| Night Shade |101| Same level-damage script | Attacker's actual level |
| Dragon Rage |82| EffectDragonRage: clear weakness/resistance flags, overwrite40, adjustsetdamage |40|
| SonicBoom |49| EffectSonicboom: clear weakness/resistance flags, overwrite20, adjustsetdamage |20|
| Super Fang |162| EffectSuperFang: clear weakness/resistance flags, damagetohalftargethp, directly proceed to hit animation | floor(current HP/2), minimum1 on a valid living target |

The scripts preserve type-immunity flags but overwrite damage after typecalc, so ordinary STAB/weakness/resistance values do not scale the fixed amount. The new path uses the canonical reference type for the stable move ID and the existing chart only to test immunity, never to scale damage. Attacking/defending stats are not needed or read by the fixed arithmetic. There are no critical, stage, weather-damage, burn, screen, item or offensive ability boosts, and no85–100% roll generation. The deterministic outcome has one value.

Super Fang's script notably skips `adjustsetdamage`, unlike the other four. No Focus Band/Endure or survival behavior is introduced for any move in Step 6A; these script distinctions are recorded for a future separately approved survival/KO step. Fixed raw damage is not capped to the target's remaining HP.

## Immunities and ability boundaries

- Seismic Toss does0 to Ghost; Night Shade does0 to Normal; SonicBoom and Super Fang do0 to Ghost. Dragon has no chart immunity among the17 Gen 3 types; Steel resistance still leaves Dragon Rage at40.
- Existing Forecast and Cloud Nine/Air Lock projections are used for the target's effective types. This can change immunity (e.g. Night Shade against Normal Castform versus rainy Water Castform), but never changes a nonimmune fixed amount.
- The shared Step 5 immunity gate remains available, but none of these five canonical types is Water, Electric, Fire or Ground. Water Absorb, Volt Absorb, Flash Fire and Levitate therefore do not block these moves merely by being present.
- SonicBoom is absent from Emerald's sound-move table: Soundproof does not block its20 HP. No modern sound classification is substituted.
- Guts, Thick Fat, Marvel Scale and critical protection do not scale fixed damage. Gen 3 Sturdy does not block these ordinary fixed-damage moves; they are not OHKO-class moves.
- Step 5's unknown Trace/copied-ability and unimplemented Wonder Guard boundaries remain omitted, rather than fabricating an outcome. No new ability mechanics are added.
- Items, including Focus Band and customizable Enigma effects, do not alter the *raw* fixed amount here. No activation, consumption, survival, healing or recovery is simulated.

Foresight, Substitute, Endure and other untracked volatile/history mechanics remain outside this informational preview. A living target's current HP must be an integer in1…max HP for Super Fang. At0/invalid current HP, its section is omitted rather than inventing a1-HP hit. Other fixed amounts are independent of current HP.

## Formatting and numerical tests

Fixed results use `25.0% · 50 HP`, not repeated deterministic endpoints. Zero remains `0.0% · 0 HP`. Ordinary damage formatting is unchanged. Percentages always divide by defender maximum HP, while Super Fang's damage alone uses current HP. No displayed attack subtracts HP.

Independent expected values include:

- Seismic Toss/Night Shade at actual levels47,50,100:47,50,100 damage. Against maxHP200:23.5%,25.0%,50.0% respectively.
- Dragon Rage:40 against maxHP160 gives `25.0% · 40 HP`. SonicBoom stays20 against Normal, Rock, Steel and Soundproof targets unless chart-immune.
- Seismic Toss against Normal/Rock and Night Shade against Ghost/Psychic still deal the actual level, despite4x ordinary chart products.
- Super Fang maxHP200/currentHP101 or100 gives50 damage and25.0%; at3,2,1 currentHP it gives1 damage and0.5%. A0-HP target is omitted.
- Browser fixture: Lv47 Machamp vs Onix#1/maxHP131: Toss or Shade `35.9% · 47 HP`; Dragon Rage `30.5% · 40 HP`; SonicBoom `15.3% · 20 HP`. Choice Band, matching STAB, selected critical, burn, stages and screens cannot alter them.
- Super Fang against Onix currentHP131 gives65 damage (`49.6%`); currentHP100 or101 gives50 (`38.2%`); currentHP1 gives1 (`0.8%`). The selected HP remains unchanged.
- Opponent Spinarak Night Shade at Level50 does50 to Machamp's maxHP156 (`32.1%`). Open100 does100 (`64.1%`), while the player remains Lv47. Switching to Normal Raticate immediately gives0.
- Reverse Raticate Super Fang into Machamp maxHP156: currentHP47 gives23 damage (`14.7%`),48 gives24 (`15.4%`),1 gives1 (`0.6%`).

Tests use literal outcomes and stable IDs, including renamed move-display text and spoofed special-effect names. Existing ordinary arithmetic, STAB/table order, items/abilities and condition regressions remain active.

## Remaining exclusions

Hidden Power, Return/Frustration, Low Kick, Flail/Reversal, Weather Ball, Psywave, Endeavor, OHKO-class moves and other special-case moves remain unsupported. No KO probabilities, recovery, residual damage or turn simulation is implemented.

Stop after Step 6A for review before Step 6B.

## Verification results

All 255 automated tests and all 20 browser scripts passed. Production build passed with the existing large-chunk warning. Live checks cover all five moves, both directions, Level50/Open100 and actual player47, immunity changes when switching Pokémon, Soundproof/SonicBoom, Super Fang even/odd/1/0 currentHP, maximum-HP percentages, no boosts under simultaneous conditions/items, unchanged controls/bars/save data and no retired modules loaded. Popups fit at 320/375/430px; the 320px screenshot was visually reviewed. No commits or pushes were made.

## Subsequent approved stage

Step6B adds six variable-power moves; see [BASIC_DAMAGE_STEP_6B.md](BASIC_DAMAGE_STEP_6B.md). The exclusions above describe the Step6A snapshot.
