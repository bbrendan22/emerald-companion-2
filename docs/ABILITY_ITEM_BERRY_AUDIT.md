# Emerald Companion 2.0 — abilities, held items and berries audit

**Read-only review before calculator Step 6. No production code, tests or UI were changed.** Only this report, its three inventory CSVs and its diagnostic JSON were added under `docs/`.

The current calculator has a substantial accurate foundation, but ability/item coverage is **not ready to certify as complete**. Preserve the main formula and completed move handling. Correct a few narrow automatic effects and make unsupported states consistently explicit; do not add berry activation simulation.

## 1. Scope, evidence and complete inventories

The inventories cover **77 nonzero Emerald ability identifiers** (76 functional abilities plus unused Cacophony), **48 non-berry items with defined held effects**, and **all 43 berries**. Ability ID 0 is the None sentinel. Ordinary bag items held without a held effect have no automatic battle effect; they are not additional damage modifiers.

- [Complete ability inventory](ABILITY_ITEM_BERRY_AUDIT_ABILITIES.csv)
- [Complete non-berry held-effect inventory](ABILITY_ITEM_BERRY_AUDIT_HELD_ITEMS.csv)
- [Complete berry inventory](ABILITY_ITEM_BERRY_AUDIT_BERRIES.csv)
- [Read-only diagnostic outputs](ABILITY_ITEM_BERRY_AUDIT_PROBES.json)

Classification:

- **K — Keep exact:** accurate automatic effect or an accurate, explicitly manual current-state representation.
- **S — Simplify:** a bounded correction or missing state/gate is needed.
- **U — Unavailable / Not applicable:** history-dependent behavior must remain unsupported in the applicable calculation, or lies outside connected-hit damage.
- **N — Not applicable:** no initial connected-hit damage modifier.

Evidence is separate from classification:

- **V:** independently checked against the cited Emerald source for the stated scope, with arithmetic/runtime probes where relevant. This does not certify complete battle execution.
- **I:** current behavior inspected, but the full event implementation was not independently reverified. Do not promote it to verified simulation.
- **M:** missing/incorrect handling confirmed by code inspection and a diagnostic or direct source conflict.
- **U:** intentionally unsupported; the existing safeguard was identified.

The ability-ID inventory matches [Emerald's constants](https://github.com/pret/pokeemerald/blob/master/include/constants/abilities.h). The held-effect inventory follows the app's canonical Emerald resource projection and [held-effect constants](https://github.com/pret/pokeemerald/blob/master/include/constants/hold_effects.h). Tables below classify every entry, including irrelevant and unused entries, rather than hiding them behind a damaging-ability shortlist.

## 2. Actual active path and data boundaries

`BattleMatchup → BattleMoveDetails → calculateAbilityScenarios → calculateCoreDamage`

Important active files:

- `src/ui/components/BattleMatchup.jsx`: projects actual per-slot HP/status/stages/screens, selected weather/crit, and item/ability uncertainty.
- `src/ui/components/BattleMoveDetails.jsx`: passes the battle context and selected scenario/hit count.
- `src/battle/abilityScenarios.js`: pins known abilities or enumerates legitimate alternatives, then groups full outcomes/distributions.
- `src/battle/coreDamage.js`: conventional formula and dispatch into fixed, variable, selected-hit, conditional and OHKO paths.
- `src/battle/heldItemModifiers.js`: item IDs, species restrictions and offensive/defensive raw-stat operands.
- `src/battle/dynamicMoves.js`, `deterministicDamage.js`, `twoHitDamage.js`, `ohkoDamage.js`: the specialized contracts completed in Steps 1–5.
- `src/ui/components/BattleMatchupConditions.jsx` and `src/battle/matchupConditions.js`: the active controls and state.

`basicDamage.js`, `fixedDamage.js`, `variableDamage.js`, `specialDamage.js` and the broader `directDamageModifiers()` implementation are older helper paths. For example, the older modifier helper suppresses critical hits for armor abilities and refuses several unresolved abilities/Enigma states. Those protections **do not establish coverage in the active core**, which calls only the smaller `directDamageImmune()` helper from that module.

### Import and Frontier data

- The save reader decrypts/checks the secure blocks, reads the 16-bit held-item ID from the Growth block, and extracts the stored ability slot, IVs and EVs. The battle adapter preserves the canonical item name, species identity, raw stats, actual friendship and IVs. The layout agrees with [Emerald's Pokémon structures](https://github.com/pret/pokeemerald/blob/master/include/pokemon.h).
- Ability/item stat boosts are applied at battle calculation time, not baked into imported base stats. That is correct and avoids automatic double-counting.
- The active Battle Conditions initialize a healthy snapshot; they do not treat a save's party status as a complete current battle state. Use the current controls deliberately.
- All **888 supported Tower rows** (882 ordinary sets plus six Anabel sets) use recognized item names: **43 distinct names, zero unresolved item-name mappings**. Spacing/apostrophe variants normalize correctly, including Deep Sea Scale, Bright Powder and Kings Rock.
- Independently sampled cartridge mappings agree: Sunkern 1 → Lax Incense; Azurill 1 → Cheri; Caterpie 1 → Focus Band; Furret 2 → Choice Band. See the [Frontier set table](https://github.com/pret/pokeemerald/blob/master/src/data/battle_frontier/battle_frontier_mons.h) and [item indirection table](https://github.com/pret/pokeemerald/blob/master/src/battle_tower.c#L78-L125).
- This audit verified name resolution across all rows and sampled source mappings; it did **not** independently re-extract and compare every one of the 888 item assignments from cartridge data. Full assignment equivalence remains **I**, rather than a new blanket certification.
- Known trainer/Brain IVs remain distinct from the helper adapter's explicit perfect-IV assumption. The active popup does not silently replace unknown opponent IVs with 31. Hidden Power remains unavailable where required IVs are unresolved.

## 3. Verified automatic effects to preserve

The source-derived spot checks passed for all **18 type-item mappings**, odd-stat rounding, species restrictions, Frontier Soul Dew suppression, Huge Power/item order, and all four one-third-HP thresholds. Existing dedicated unit tests also pass.

| Mechanic | Verified active behavior |
| --- | --- |
| 17 ordinary type boosters | Matching raw Attack or SpA ×1.10, floored; category follows the Gen III type split |
| Sea Incense | Water raw SpA ×1.05, floored |
| Choice Band | Physical Attack ×1.5, floored; no Special boost |
| Huge/Pure Power | Physical Attack ×2 before item boosts and stages |
| Hustle/Guts | Physical Attack ×1.5, floored before stages; Guts uses current major status and suppresses burn reduction |
| Thick Fat | Halves the relevant Fire/Ice SpA operand before stages, not final damage |
| Marvel Scale | Current major status raises raw Defense ×1.5 before stages |
| Overgrow/Blaze/Torrent/Swarm | Matching power ×1.5, floored, at current HP ≤ floor(maxHP/3) |
| Light Ball / Thick Club / DeepSeaTooth / DeepSeaScale | Correct Gen III operand and species restrictions |
| Soul Dew | Suppressed for Frontier context, including missing-context default |
| Levitate / absorption / defensive Flash Fire | Applicable direct immunity retained; frozen Flash Fire's Gen III exception retained |
| Wonder Guard / Soundproof / Damp / Sturdy | Supported prevention retained, including the Step 4 OHKO contract |
| Cloud Nine / Air Lock | Effective weather suppressed per represented ability branch; stored weather is not destroyed |

The operand ordering is checked against [CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c#L3012-L3255), rather than an approximation that multiplies the final damage range. Defensive immunity uses the [Emerald ability handler](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2537-L2625).

These are conditional-on-connection calculations. An accuracy penalty or crit-rate bonus does not change the amount of a chosen ordinary/critical hit.

## 4. Confirmed gaps and misleading-result cases

Diagnostic numbers below use controlled level-50, 100-stat inputs to isolate modifiers. They are not claims about the legality of a complete synthetic species/EV spread. Direct core probes are paired with active call-path inspection; these are not new production tests.

### A. Battle Armor and Shell Armor — automatic correction, highest priority

With Crit selected, the active core still doubles damage, ignores positive defensive/negative offensive stages, and bypasses screens against either armor ability. A neutral Strength fixture returns **94–111 HP** instead of the noncritical **46–55 HP**.

Source `Cmd_critcalc` prevents the crit itself. Therefore the fix must resolve the effective critical flag **before** base damage, stage/screen exceptions and final doubling. Merely dividing final damage by two is insufficient. The current API already supplies the defender's pinned ability; no control is needed. [Source](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L1200-L1231)

This also breaks uncertainty: real Kabuto alternatives Swift Swim/Battle Armor currently merge into one critical distribution. They should retain normal-versus-critical alternatives when Crit is requested.

### B. Forecast — missing automatic battle-type projection

The active matchup constructs types from the species database. `battleTypes()` exists but is not used by the core's STAB/effectiveness path. Castform in rain can therefore be calculated as Normal even though the selected weather is Rain.

A Weather Ball fixture returns **59–70 HP** with the current species types, versus **89–105 HP** with the required Water-form STAB. Incoming type effectiveness is also exposed. Existing suppression/Forecast guards cover a subset of cases, not ordinary selected rain/sun/hail. Reuse the existing projection per pinned ability pair; do not add form selectors. [Forecast source](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2284-L2333)

### C. Trace — unsupported boundaries are inconsistent

Fixed/Psywave, OHKO, Explosion and multi-hit paths have Trace boundaries. Ordinary conventional hits can still treat unresolved Trace as a neutral ability. A controlled outgoing Trace-versus-Huge Power fixture returns **46–55 HP**, while a resolved Huge Power attacker gives **91–108 HP**.

Do not automatically copy the currently selected opponent: the copied ability depends on entry/history and may no longer equal that opponent's current ability. Until a reliable resolved ability is supplied, consistently retain unavailable/unsupported results when the copied ability can matter. [Trace implementation](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c)

### D. Custom Enigma effects — accepted as neutral without metadata

The active item helper recognizes the name/ID Enigma Berry but has no custom effect or parameter. The importer does not provide that data. Emerald instead consults per-battler custom Enigma data in damage, accuracy, critical and item-event logic.

For illustration, current Enigma Surf gives **36–43 HP**; a custom matching Water-power held effect would require a different operand (the ordinary Mystic Water fixture gives **39–47 HP**). This does not assert that every Enigma has that effect; it demonstrates why “unknown custom effect = no effect” is unsafe. Gate relevant unresolved custom effects, or parse/validate them separately. No Enigma popup selector is recommended. [Damage lookup](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c#L3038-L3058)

### E. Activated offensive Flash Fire — not represented by existing controls

Defensive Flash Fire is already supported. The offensive activation flag is not: even a supplied `flashFireActive:true` is ignored. The unactivated baseline is legitimate, but it is not a calculation of the activated state.

A neutral Fire fixture has base **43** unactivated. The activated source subtotal produces base **63**; using SpA +1 instead produces base **64**. Stages therefore cannot reproduce this effect exactly, especially with other modifiers. Never suggest a +1 SpA workaround. Either add one narrowly scoped activation condition after approval or keep activated-state requests unavailable. [Activation](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2584-L2607), [damage placement](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c#L3249-L3254)

### F. Plus / Minus — missing on-field SpA modifier

The active core omits the modifier. With the opposite ability present, a controlled Thunderbolt fixture gives **36–43 HP** instead of **54–64 HP** from raw SpA ×1.5.

Important Emerald detail: the literal `ABILITY_ON_FIELD2` lookup traverses the field without a same-side restriction. Do not implement a modern ally-only assumption. A known opposing Plus/Minus Singles pair is enough to expose the omission; full Doubles field state remains unavailable. Use the [macro](https://github.com/pret/pokeemerald/blob/master/include/battle_util.h#L33-L35), [lookup](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L2985-L3013), and [damage operand](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c#L3103-L3108) together.

### G. Shell Bell plus pinch ability during a multi-hit attack — missing safety gate

Selected-hit aggregation reuses the starting HP for every hit. Emerald's multi-hit loop runs move-end handling between hits; Shell Bell can heal the attacker during that sequence.

Example: Overgrow, Grass typing, Shell Bell, **66/200 HP**, three successful Bullet Seed hits. Current output is **30–36 HP**. The first hit deals **10–12 HP**, heals at least 1 HP, and moves the attacker above the one-third threshold. Later hits deal **7–9 HP** each, giving **24–30 HP** for this fixture.

The HP control can represent the state before/after an attack but cannot express this transition within one total. Prefer a targeted unavailable safeguard when healing can change later hit power, rather than approximating or building a full battle simulator. Ordinary one-hit Shell Bell damage remains valid. [Multi-hit loop](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s#L581-L632), [move-end item processing](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L4094-L4103), [Shell Bell](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L3643-L3661)

### H. Other boundaries — scope limits, not blanket arithmetic defects

- Metal Powder Ditto's unknown transformation state is already unavailable for physical defense. Preserve this safeguard. The UI has no resolved transformation input; species/ability/stat copying is not simulated. Its rare transformed-into-Ditto edge was not independently certified by this audit.
- Color Change has a valid initial-type single-hit baseline and a guarded multi-hit path. A prior changed type cannot be represented with current controls; a species-type baseline must not be advertised as a resolved post-activation state.
- Item removal/swapping/consumption is not tracked as battle history. Imported player items and opponent set-identification items are not a general current-held-item override. Knock Off/Trick outcomes that change guaranteed modifiers need a reliable snapshot or an explicit unsupported boundary.
- Unseen Doubles partners can affect field abilities, weather suppression, Damp and screens. The app does not acquire complete field state merely by selecting Doubles. Keep its existing unknown-side-count safeguards; do not treat this audit as implementing spread damage or full Doubles simulation.

## 5. Berry findings and activation policy

**Do not add automatic consumed boosts or cures from the held item name.** A holder at low HP may still be before the relevant activation check, and a prior activation may have been followed by Recycle, switching, another stat change or healing. Current state is authoritative.

All seven pinch/stat/critical berries were probed while held at 1 HP: the active code does **not** add their consumed boosts. This is correct for the chosen manual-state policy and must remain so.

### Activation mechanics and controls

The full 43-row inventory is in the berry appendix and CSV. Core rules verified in [ItemBattleEffects](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L3098-L3480) and [item definitions](https://github.com/pret/pokeemerald/blob/master/src/data/items.h#L1480-L1973):

- Stat and critical berries: eligible at HP ≤ floor(maxHP/4), not a later-generation Gluttony threshold. Respect stage/Focus Energy caps. Activation is processed at the applicable item-event check; low HP alone is not proof of an already-consumed boost.
- Liechi/Ganlon/Salac/Petaya/Apicot: use actual net Atk/Def/Spe/SpA/SpD stages after activation. At +5, a +2 event caps at +6; do not add raw stat multipliers on top of the stages.
- Starf: record the actual resolved stat; do not choose Attack or average five outcomes. If the resolved state is unknown, it is unknown.
- Lansat: sets the Focus Energy condition (+2 crit-chance stages), not a guaranteed crit. It does not stack a second separate Focus Energy flag. The existing Crit checkbox models a chosen critical outcome, not activation or its probability.
- Oran restores **10 HP** and Sitrus **30 HP**, not a percentage. Figy/Wiki/Mago/Aguav/Iapapa restore **1/8 max HP** (minimum 1) and can confuse for a disliked flavor. These HP berries use eligible half-HP checks; cap recovery at max HP and do not revive.
- Figy/Wiki/Mago/Aguav/Iapapa use spicy/dry/sweet/bitter/sour flavor respectively. Their nature/Own Tempo confusion interaction and confusion self-hits are not simulated. This does not require a berry-specific control for the ordinary hit preview.
- Cheri/Chesto/Pecha/Rawst/Aspear cure the corresponding major status. Persim cures confusion. Lum covers major status and confusion. Set an actually cured major status to None; this also updates Guts, Facade, Marvel Scale and frozen Flash Fire behavior through existing inputs.
- Leppa restores PP, not damage. There is no PP-recovery/turn-use simulator.
- Pomeg/Kelpsy/Qualot/Hondew/Grepa/Tamato affect EVs/friendship when fed outside battle, not by being held. Reimport actual EVs/friendship after such changes. Replacing EV changes with a stat stage is not exact. The full feeding algorithm was not independently re-audited here.
- The fourteen remaining Pokéblock/contest berries have no held battle effect. Gen IV resistance berries and later berry/ability mechanics are not part of Emerald's inventory.
- Enigma is the exception that needs missing-data handling: its customized effect cannot be inferred safely from its name. Do not substitute the later-generation super-effective-hit healing effect. Regional Ruby/Sapphire e-Reader names are not extra Emerald item IDs; any relevant custom variant must be resolved through its actual Enigma data.

**Timing matters:** Emerald routes HP/stat/critical berries through its normal/end-turn item checks; status-curing items/White Herb also have move-end handling. Do not assume later-generation “all berries activate between every hit” behavior. Existing contact-status safeguards remain necessary. [Event scheduling](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L1412-L1425), [move-end cure cases](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c#L3484-L3624)

### Adequacy of existing controls

| State/effect | Current representation | Audit decision |
| --- | --- | --- |
| Stat berry already activated | Enter actual net stage in existing five stage controls | Adequate; no automatic boost and no berry selector |
| HP berry/Leftovers/Rain Dish/absorption already resolved | Enter actual Current HP | Adequate for next snapshot; recalculates HP-dependent moves/pinch abilities |
| Status berry/cure already resolved | Set Status to actual result | Adequate for represented major statuses |
| Lansat, Scope Lens, Stick, Lucky Punch | Crit off/on gives conditional ordinary/critical amount | Adequate for chosen outcome; not a critical-probability model |
| Starf's random stat is unknown | No reliable resulting stage | Do not silently pick a boost |
| Intimidate/Speed Boost/White Herb event resolved | Actual net stages, with prevention/caps already accounted for | Adequate for damage-relevant stats; accuracy/evasion outside scope |
| Current rain/sun/sand/hail | Weather dropdown | Adequate; do not infer permanent current weather from a setter's presence |
| Reflect/Light Screen | Existing defender-side screen controls | Adequate within existing Singles/Doubles count boundaries |
| Activated offensive Flash Fire | No exact existing representation | Material gap; stage substitution is wrong |
| Trace/changed types/Transform | No reliable copied ability/type/species state | Gate unresolved cases; do not approximate with stages |
| Custom Enigma | No custom metadata | Gate relevant unresolved effects |
| Within-attack Shell Bell HP transition | Cannot change Current HP between selected hits | Targeted safety gate recommended |
| Focus Band survival, confusion, PP, infatuation, hit chance | Not represented by damage controls | Outside connected-hit amount; no simulator recommended |

The active stat rows display raw underlying stats, rather than certifying effective Speed/order or every staged/ability-adjusted value. A Speed stage can be stored without implying automatic turn-order simulation.

## 6. Ability and item uncertainty

- Player abilities come from the save's actual ability slot and are checked against species. Do not infer a second ability because a species can have it.
- Opponent alternatives come from legitimate Gen III species abilities, narrowed only when set data genuinely establishes one. The core is called once per pinned pair.
- Equivalent complete roll/distribution outcomes collapse; distinct prevention, unsupported and OHKO outcomes remain distinct. Preserve these contracts.
- The framework works for implemented mechanics, but cannot repair missing mechanics: armor alternatives currently collapse incorrectly because both branches calculate a crit. Fixing the branch's calculation restores legitimate alternatives without redesigning grouping.
- Items are not guessed as ability alternatives. An unknown active item is explicit `null`; conventional damage fails safely rather than substituting None. The standalone helper's omitted-item default does not change the active UI's explicit-unknown handling.
- Item observations are tied to compatible Frontier sets. They are not a substitute for modeling a current item gained through Trick. A generic current-item snapshot would require a separate approved design; no berry-specific selector is warranted.
- Known ordinary berries are neutral to the initial formula until their effects are represented as actual battle state. Unknown Starf outcomes and custom Enigma effects must not be silently invented.

## 7. Double-counting risks

No automatic pinch-berry boost is currently being double-counted. The main risks are manual workarounds or future implementation:

1. **Type/stat items and direct abilities:** do not add a stage to compensate for Soft Sand, Choice Band, Thick Club, Huge Power, Guts or Marvel Scale. The active operands already apply them.
2. **Consumed stat berries:** enter the net resulting stage once. Do not also multiply stats or add another boost from the still-displayed held item.
3. **Pinch abilities:** set actual HP; do not also add an Attack/SpA stage. The ability changes power at its own rounding point.
4. **Lansat/crit items:** do not automatically enable Crit, add an extra damage multiplier, or stack a second Focus Energy flag. Crit-rate changes are not damage multipliers.
5. **Healing/cures:** Current HP and Status should describe the chosen snapshot. Do not auto-heal or auto-clear them again because a berry is listed.
6. **Intimidate/White Herb:** use actual net stages; do not replay entry/item events on every recalculation.
7. **Import stats:** recorded/calculated stats already contain nature/IV/EV effects. Do not reapply those while adding battle-only modifiers.
8. **Flash Fire:** an SpA +1 workaround is both inexact now and would double-count after a proper activation condition was added.

## 8. Ranked recommendations

| Priority | Recommendation | Minimal scope |
| --- | --- | --- |
| P1 | Suppress effective crit for Battle Armor/Shell Armor | Resolve pinned defender ability before base/stage/screen/final modifiers; test uncertainty and all hit modes |
| P1 | Project Forecast types in the active core | Reuse existing effective-weather/type helper per branch; test STAB, incoming types and suppression |
| P1 | Make unresolved Trace boundaries consistent | Prefer explicit unavailable results over neutral-ability assumptions; do not infer history from current opponent |
| P1 | Stop treating unknown custom Enigma as neutral | Gate only calculations for which missing custom data can matter; preserve unrelated fixed amounts where justified |
| P2 | Guard state-changing Shell Bell multi-hit cases | Unavailable when healing can change later power; no approximation or simulator |
| P2 | Resolve Plus/Minus when field evidence is sufficient | Apply source operand order; retain unknown Doubles-field boundaries |
| P2 | Support activated Flash Fire only through an exact condition, if approved | One relevant per-attacker activation input, or keep activated state unavailable; never fake a stat stage |
| P3 | Clarify initial/current item/type assumptions | If changed-item/type scenarios are needed, design one generic snapshot mechanism; otherwise keep unsupported boundaries explicit |
| P3 | Clarify base accuracy versus hit probability | Accuracy/crit-rate items need no new damage control; optional metadata wording can avoid implying execution odds |
| Preserve | Keep consumed berry effects manual | Existing stages/HP/status/Crit suffice for ordinary snapshots; no berry popup controls |

## 9. Proposed minimal implementation sequence — not authorized by this audit

1. Fix armor critical resolution and add focused regression tests, including uncertainty, screens/stages and multi-hit crit policy.
2. Reuse Forecast projection in the active path; validate weather suppression and Weather Ball without changing the formula.
3. Close Trace/Enigma unsupported-state gaps. Add the narrow Shell Bell multi-hit safety gate rather than a state simulator.
4. Add the source-correct Plus/Minus modifier where field state is known, with conservative Doubles handling.
5. Decide whether exact Flash Fire activation support is worth one contextual condition. If not, explicitly retain its activated state as unavailable. No stage approximation.
6. Document the consumed-item policy and any initial item/type assumptions. Add no automatic berry stage/HP/status mutations.
7. After those separately approved fixes, run their regression checks and seek approval to resume the previously planned calculator Step 6.

This is an approval proposal, not implementation. It does not reopen completed move categories, implement spread damage, or authorize new berry-specific controls.

## 10. Validation and limits

- **814 existing unit tests passed unchanged.** Passing tests did not detect the newly identified gaps; several older tests intentionally lock an unactivated baseline or omit the relevant critical condition.
- Temporary read-only probes confirmed the seven gap examples and the existing correct stat/item behavior. The JSON records controlled inputs' outcomes and the verification categories.
- No new production test was written during this audit. No browser/build run was needed to establish these calculation-path findings; this audit makes no new physical-device/layout claim.
- A before/after SHA-256 comparison covers **583 production/test files**. All must remain byte-for-byte unchanged; documentation artifacts are the only repository additions from this audit.
- Full custom Enigma decoding, arbitrary transformed/copied battle states, every Frontier set-to-cartridge assignment and complete event timing for every non-damage ability are not certified. Such limits are labeled explicitly in the inventories.

**Stop for review. No implementation and no calculator Step 6 have begun.**

## Appendix A — all ability IDs

See the evidence/classification definitions in section 1. For N/A entries, the short effect description is an inventory boundary, not an assertion that the app simulates that event.

| ID | Ability | Class | Evidence | Current handling and conditions |
| --- | --- | --- | --- | --- |
| 1 | Stench | N | I | No connected-hit damage modifier; encounter/escape/post-battle effect. |
| 2 | Drizzle | K | V | Weather-setting event is not inferred from presence; current selected weather is used. Weather: rain / sand / sun; actual last weather event wins. |
| 3 | Speed Boost | K | V | No automatic end-turn simulation; enter the actual accumulated Speed stage. Speed stage. |
| 4 | Battle Armor | S | M | Critical immunity is missing in the active core; Crit currently doubles damage and bypasses stages/screens. Automatic suppression required before all critical-dependent calculations. |
| 5 | Sturdy | K | V | OHKO immunity is automatic; no later-generation full-HP survival rule. |
| 6 | Damp | K | V | Damp prevents Explosion/Self-Destruct from either represented battler; no unseen Doubles allies modeled. |
| 7 | Limber | K | I | Status prevention/cure is not simulated. Supply a legal current major status; no independent direct-hit multiplier. Status after the event; none for a cured status. |
| 8 | Sand Veil | N | V | Accuracy/evasion affects connection chance, not the conditional damage amount; probability is not simulated. |
| 9 | Static | U | V | Contact status can change later hits. Existing multi-hit guards preserve unsupported branches; ordinary first-hit damage ignores later status. Current Status only represents resolved state before an attack. |
| 10 | Volt Absorb | K | V | Matching incoming type is immune; healing is not added to the damage result. Current HP for state after absorption. |
| 11 | Water Absorb | K | V | Matching incoming type is immune; healing is not added to the damage result. Current HP for state after absorption. |
| 12 | Oblivious | N | I | Infatuation/confusion/flinch prevention is outside connected-hit damage; no new volatile-state simulator. |
| 13 | Cloud Nine | K | V | Suppress selected weather per pinned represented ability pair; weather itself is not erased. Existing Weather remains selected; missing Doubles field occupants are outside scope. |
| 14 | Compound Eyes | N | V | Accuracy/evasion affects connection chance, not the conditional damage amount; probability is not simulated. |
| 15 | Insomnia | K | I | Status prevention/cure is not simulated. Supply a legal current major status; no independent direct-hit multiplier. Status after the event; none for a cured status. |
| 16 | Color Change | U | U | After-hit type history is not represented. Multi-hit results are guarded; ordinary species-type baseline is valid only before activation. No existing type override; do not approximate via stat stages. |
| 17 | Immunity | K | I | Status prevention/cure is not simulated. Supply a legal current major status; no independent direct-hit multiplier. Status after the event; none for a cured status. |
| 18 | Flash Fire | S | M | Defensive immunity, including freeze exception, is exact; activated offensive boost is absent. No exact existing control for activation; Special Attack stages are not equivalent. |
| 19 | Shield Dust | N | I | Secondary-effect prevention/chance does not modify the initial connected-hit amount. |
| 20 | Own Tempo | N | I | Infatuation/confusion/flinch prevention is outside connected-hit damage; no new volatile-state simulator. |
| 21 | Suction Cups | N | I | Switching/trapping restrictions affect execution, not the selected connected-hit formula. |
| 22 | Intimidate | K | V | Do not reapply Intimidate each calculation. Enter actual net Attack stage after prevention/earlier events. Attack stage on affected side. |
| 23 | Shadow Tag | N | I | Switching/trapping restrictions affect execution, not the selected connected-hit formula. |
| 24 | Rough Skin | N | V | Contact retaliation changes attacker HP/continuation, not initial defender damage. Full attack survival is not simulated. Current HP for the next snapshot. |
| 25 | Wonder Guard | K | V | Type-based prevention retained for ordinary, fixed, Psywave, multi-hit and OHKO paths. |
| 26 | Levitate | K | V | Ground immunity is automatic, including Fissure; no modern grounding-state simulator. |
| 27 | Effect Spore | U | V | Contact status can change later hits. Existing multi-hit guards preserve unsupported branches; ordinary first-hit damage ignores later status. Current Status only represents resolved state before an attack. |
| 28 | Synchronize | K | I | Status return/cure event is not simulated; use the actual resulting status. Status. |
| 29 | Clear Body | K | I | Prevention of incoming stat reductions is not simulated; supply actual resulting net stages. Relevant stat stages; do not automatically apply an Intimidate drop. |
| 30 | Natural Cure | K | I | Status return/cure event is not simulated; use the actual resulting status. Status. |
| 31 | Lightning Rod | N | V | Gen III redirection is not Electric immunity or a Special Attack boost; missing Doubles targeting is outside scope. |
| 32 | Serene Grace | N | I | Secondary-effect prevention/chance does not modify the initial connected-hit amount. |
| 33 | Swift Swim | N | V | Speed helper doubles Speed in matching effective weather; active popup computes hit damage, not turn order. Weather and Speed stage; displayed raw stats do not certify effective order. |
| 34 | Chlorophyll | N | V | Speed helper doubles Speed in matching effective weather; active popup computes hit damage, not turn order. Weather and Speed stage; displayed raw stats do not certify effective order. |
| 35 | Illuminate | N | I | No connected-hit damage modifier; encounter/escape/post-battle effect. |
| 36 | Trace | S | M | Trace is guarded in several special paths, but ordinary single hits may silently calculate without resolving the copied ability. No copied-ability state control; unresolved relevant branches should be unavailable. |
| 37 | Huge Power | K | V | Raw physical Attack doubled before item modifiers/stages; Special damage unaffected. |
| 38 | Poison Point | U | V | Contact status can change later hits. Existing multi-hit guards preserve unsupported branches; ordinary first-hit damage ignores later status. Current Status only represents resolved state before an attack. |
| 39 | Inner Focus | N | I | Infatuation/confusion/flinch prevention is outside connected-hit damage; no new volatile-state simulator. |
| 40 | Magma Armor | K | I | Status prevention/cure is not simulated. Supply a legal current major status; no independent direct-hit multiplier. Status after the event; none for a cured status. |
| 41 | Water Veil | K | I | Status prevention/cure is not simulated. Supply a legal current major status; no independent direct-hit multiplier. Status after the event; none for a cured status. |
| 42 | Magnet Pull | N | I | Switching/trapping restrictions affect execution, not the selected connected-hit formula. |
| 43 | Soundproof | K | V | Emerald sound table blocks applicable damaging sound moves. SonicBoom is not in that table; status moves are descriptions only. |
| 44 | Rain Dish | K | V | Rain healing is not added to attack damage; represent resulting HP. Weather and Current HP. |
| 45 | Sand Stream | K | V | Weather-setting event is not inferred from presence; current selected weather is used. Weather: rain / sand / sun; actual last weather event wins. |
| 46 | Pressure | N | I | PP use may affect later move availability; connected-hit amount is unchanged. |
| 47 | Thick Fat | K | V | Fire/Ice offensive Special Attack operand is halved before stages, preserving integer rounding. |
| 48 | Early Bird | N | I | Sleep duration affects whether a move executes, not connected-hit damage. Status after waking. |
| 49 | Flame Body | U | V | Contact status can change later hits. Existing multi-hit guards preserve unsupported branches; ordinary first-hit damage ignores later status. Current Status only represents resolved state before an attack. |
| 50 | Run Away | N | I | No connected-hit damage modifier; encounter/escape/post-battle effect. |
| 51 | Keen Eye | N | I | Accuracy-stage prevention does not modify connected-hit damage; accuracy stages are outside current controls. |
| 52 | Hyper Cutter | K | I | Prevention of incoming stat reductions is not simulated; supply actual resulting net stages. Relevant stat stages; do not automatically apply an Intimidate drop. |
| 53 | Pickup | N | I | No connected-hit damage modifier; encounter/escape/post-battle effect. |
| 54 | Truant | N | I | Skipping an action is not a damage multiplier; preview assumes the chosen hit executes. |
| 55 | Hustle | K | V | Physical Attack gets a floored 50% boost before stages. Accuracy penalty is outside connected-hit preview. |
| 56 | Cute Charm | N | I | Contact infatuation is an execution-state effect; no first-hit damage modifier. |
| 57 | Plus | S | M | Opposite Plus/Minus on-field boost is absent. Emerald on-field lookup includes both sides, not only an ally. Known Singles pair can be resolved automatically; unknown Doubles field needs support or gating. |
| 58 | Minus | S | M | Opposite Plus/Minus on-field boost is absent. Emerald on-field lookup includes both sides, not only an ally. Known Singles pair can be resolved automatically; unknown Doubles field needs support or gating. |
| 59 | Forecast | S | M | Species types reach the active core unchanged; existing Forecast projection helper is not applied there. Weather Ball STAB and incoming effectiveness can be wrong. Weather alone does not currently update active damage types. |
| 60 | Sticky Hold | N | I | Item theft/removal prevention changes later item state; current item must already describe the snapshot. |
| 61 | Shed Skin | K | I | Status return/cure event is not simulated; use the actual resulting status. Status. |
| 62 | Guts | K | V | Major status boosts raw physical Attack 50%; active Guts bypasses burn reduction. Status, not an extra Attack stage. |
| 63 | Marvel Scale | K | V | Major status boosts raw Defense 50% before Defense stages. Status, not an extra Defense stage. |
| 64 | Liquid Ooze | N | V | Drain retaliation changes attacker HP, not initial defender damage. Current HP for a later snapshot. |
| 65 | Overgrow | K | V | Matching move power gains a floored 50% boost at HP <= floor(maxHP/3). Current HP; do not also add an attack stat stage. |
| 66 | Blaze | K | V | Matching move power gains a floored 50% boost at HP <= floor(maxHP/3). Current HP; do not also add an attack stat stage. |
| 67 | Torrent | K | V | Matching move power gains a floored 50% boost at HP <= floor(maxHP/3). Current HP; do not also add an attack stat stage. |
| 68 | Swarm | K | V | Matching move power gains a floored 50% boost at HP <= floor(maxHP/3). Current HP; do not also add an attack stat stage. |
| 69 | Rock Head | N | I | Applicable recoil prevention changes attacker HP after the hit; no initial target-damage multiplier. |
| 70 | Drought | K | V | Weather-setting event is not inferred from presence; current selected weather is used. Weather: rain / sand / sun; actual last weather event wins. |
| 71 | Arena Trap | N | I | Switching/trapping restrictions affect execution, not the selected connected-hit formula. |
| 72 | Vital Spirit | K | I | Status prevention/cure is not simulated. Supply a legal current major status; no independent direct-hit multiplier. Status after the event; none for a cured status. |
| 73 | White Smoke | K | I | Prevention of incoming stat reductions is not simulated; supply actual resulting net stages. Relevant stat stages; do not automatically apply an Intimidate drop. |
| 74 | Pure Power | K | V | Raw physical Attack doubled before item modifiers/stages; Special damage unaffected. |
| 75 | Shell Armor | S | M | Critical immunity is missing in the active core; Crit currently doubles damage and bypasses stages/screens. Automatic suppression required before all critical-dependent calculations. |
| 76 | Cacophony | N | V | Unused Cacophony slot; no app species has it. Do not enable a sound-immunity effect merely from the unused name. |
| 77 | Air Lock | K | V | Suppress selected weather per pinned represented ability pair; weather itself is not erased. Existing Weather remains selected; missing Doubles field occupants are outside scope. |

## Appendix B — all 48 defined non-berry held-effect items

This includes Berry Juice, which is relevant HP recovery but is not a berry. Values are for Emerald. Canonical item IDs are supplied in the CSV; held objects without a battle held effect remain outside the damage inventory.

| Item ID | Item | Class | Evidence | Effect/current behavior | State/control |
| --- | --- | --- | --- | --- | --- |
| 44 | Berry Juice | K | V | Held HP recovery of 20 at eligible half-HP item check, capped at maximum HP; consumed. | Enter post-activation current HP; do not auto-heal from mere possession |
| 179 | Bright Powder | N | V | Accuracy calculation x0.90; ordinary damage on connection unchanged. | Popup accuracy is base metadata, not effective hit chance |
| 180 | White Herb | K | V | Consumed when negative stages are restored to neutral; positive stages remain. | Set each affected negative damage/Speed stage to 0; accuracy/evasion outside scope |
| 181 | Macho Brace | N | V | Speed halving exists in helper; training EV benefit is not an in-battle damage boost. | Speed is not an operand in any Gen III direct-damage formula here |
| 182 | Exp. Share | N | I | Training experience/EV distribution; no connected-hit modifier. | Imported stats already include earned EVs/level |
| 183 | Quick Claw | N | V | Order activation parameter 20; does not raise actual Speed or damage. | No turn-order probability model |
| 184 | Soothe Bell | N | I | Future friendship gains, not instant extra Return power. Imported actual friendship is already used. | Reimport updated friendship; never add a damage boost simply for holding it |
| 185 | Mental Herb | N | V | Gen III cures infatuation only, not later-generation Taunt/Encore/Disable effects. | Infatuation execution is not simulated |
| 186 | Choice Band | K | V | Physical Attack x1.5 before stages; no Special boost. Move-lock execution is outside scope. | Do not duplicate using Attack stages |
| 187 | Kings Rock | N | V | 10% flinch on eligible flagged moves; not a damage multiplier. | No flinch/turn execution simulation |
| 188 | SilverPowder | K | V | BUG raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 189 | Amulet Coin | N | I | Prize-money effect; no damage modifier. | None |
| 190 | Cleanse Tag | N | I | Wild encounter effect; no damage modifier. | None |
| 191 | Soul Dew | K | V | No stat boost in Frontier. Outside-Frontier helper supports Latias/Latios SpA/SpD x1.5. | Frontier rules passed automatically |
| 192 | Deep Sea Tooth | K | V | Clamperl Special Attack x2. | No manual stage adjustment |
| 193 | Deep Sea Scale | K | V | Clamperl Special Defense x2. | No manual stage adjustment |
| 194 | Smoke Ball | N | I | Escape effect; no damage modifier. | None |
| 195 | Everstone | N | I | Evolution/breeding use; no damage modifier. | None |
| 196 | Focus Band | U | V | 10% survival check; cannot be modeled as a guaranteed reduction to damage or permanent 1-HP cap. | HP can represent a resolved survival event; no survival probability simulator |
| 197 | Lucky Egg | N | I | Experience effect; no connected-hit modifier. | Imported level/stats |
| 198 | Scope Lens | K | V | Critical chance stage +1; does not force a critical hit or change conditional hit damage. | Crit for a chosen critical-hit scenario; no probability model |
| 199 | Metal Coat | K | V | STEEL raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 200 | Leftovers | K | V | End-turn HP recovery; not added to or subtracted from a connected attack range. | Enter actual current HP after recovery |
| 201 | Dragon Scale | N | I | Evolution use; not a Dragon damage booster. | None |
| 202 | Light Ball | K | V | Pikachu Special Attack x2 only; no Gen IV physical boost. | No manual stage adjustment |
| 203 | Soft Sand | K | V | GROUND raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 204 | Hard Stone | K | V | ROCK raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 205 | Miracle Seed | K | V | GRASS raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 206 | BlackGlasses | K | V | DARK raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 207 | Black Belt | K | V | FIGHTING raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 208 | Magnet | K | V | ELECTRIC raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 209 | Mystic Water | K | V | WATER raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 210 | Sharp Beak | K | V | FLYING raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 211 | Poison Barb | K | V | POISON raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 212 | NeverMeltIce | K | V | ICE raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 213 | Spell Tag | K | V | GHOST raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 214 | TwistedSpoon | K | V | PSYCHIC raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 215 | Charcoal | K | V | FIRE raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 216 | Dragon Fang | K | V | DRAGON raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 217 | Silk Scarf | K | V | NORMAL raw Attack/SpA x1.10 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 218 | Up-Grade | N | I | Evolution use; no connected-hit modifier. | None |
| 219 | Shell Bell | S | M | Post-hit recovery is omitted. Multi-hit healing can cross a pinch-ability HP threshold and change later hit power. | HP covers later snapshots, not changes within one selected multi-hit total |
| 220 | Sea Incense | K | V | WATER raw Attack/SpA x1.05 with integer flooring; automatic, type-based Gen III category. | No manual stage adjustment |
| 221 | Lax Incense | N | V | Accuracy calculation x0.95 in Emerald; not a direct damage reduction. | No accuracy/evasion controls required for conditional damage |
| 222 | Lucky Punch | K | V | Chansey critical chance stage +2; no benefit on other species. | Crit selects outcome, not probability |
| 223 | Metal Powder | U | V | Physical Defense x2 for resolved Ditto state; active UI lacks transformed flag and correctly returns unavailable for physical defense. Special defense is unchanged. | No transformation/species/type override in current controls |
| 224 | Thick Club | K | V | Cubone/Marowak physical Attack x2. | No manual stage adjustment |
| 225 | Stick | K | V | Farfetch’d critical chance stage +2; no benefit on other species. | Crit selects outcome, not probability |

## Appendix C — all 43 Gen III berries

All ordinary entries are consumed only by an applicable activation/use event, not by entering the damage popup. CSV rows additionally record missing-state/double-counting cautions.

| Item ID | Berry | Class / evidence | Emerald effect | Activation | Existing control |
| --- | --- | --- | --- | --- | --- |
| 133 | Cheri Berry | K / V | Cures paralysis | Matching status at an applicable item check | Set Status to None after cure |
| 134 | Chesto Berry | K / V | Cures sleep | Matching status at an applicable item check | Set Status to None after cure |
| 135 | Pecha Berry | K / V | Cures poison/toxic | Matching status at an applicable item check | Set Status to None after cure |
| 136 | Rawst Berry | K / V | Cures burn | Matching status at an applicable item check | Set Status to None after cure |
| 137 | Aspear Berry | K / V | Cures freeze | Matching status at an applicable item check | Set Status to None after cure |
| 138 | Leppa Berry | N / V | Restores up to 10 PP to an exhausted move | An eligible move has 0 PP at item check | No PP editing in Battle Conditions; chosen connected-hit damage unchanged |
| 139 | Oran Berry | K / V | Restores 10 HP | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped post-heal Current HP |
| 140 | Persim Berry | K / V | Cures confusion | Confusion at an applicable item check | Confusion is outside controls; selected connected-hit damage is unchanged |
| 141 | Lum Berry | K / V | Cures major status and confusion | Any eligible status/confusion | Status=None for cured major status; confusion outside controls |
| 142 | Sitrus Berry | K / V | Restores 30 HP in Gen III | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped post-heal Current HP; not 25% healing |
| 143 | Figy Berry | K / V | Restores max(1,floor(maxHP/8)); may confuse if nature dislikes spicy | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped Current HP; confusion/self-hit not modeled |
| 144 | Wiki Berry | K / V | Restores max(1,floor(maxHP/8)); may confuse if nature dislikes dry | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped Current HP; confusion/self-hit not modeled |
| 145 | Mago Berry | K / V | Restores max(1,floor(maxHP/8)); may confuse if nature dislikes sweet | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped Current HP; confusion/self-hit not modeled |
| 146 | Aguav Berry | K / V | Restores max(1,floor(maxHP/8)); may confuse if nature dislikes bitter | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped Current HP; confusion/self-hit not modeled |
| 147 | Iapapa Berry | K / V | Restores max(1,floor(maxHP/8)); may confuse if nature dislikes sour | Alive; HP <= floor(maxHP/2) at normal/end-turn item check | Enter capped Current HP; confusion/self-hit not modeled |
| 148 | Razz Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 149 | Bluk Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 150 | Nanab Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 151 | Wepear Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 152 | Pinap Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 153 | Pomeg Berry | N / I | Outside-battle EV reduction (HP) and friendship change; no held activation | Fed through outside-battle item use, not held in combat | Reimport actual EVs/friendship and resulting stats; stages are not a substitute |
| 154 | Kelpsy Berry | N / I | Outside-battle EV reduction (Attack) and friendship change; no held activation | Fed through outside-battle item use, not held in combat | Reimport actual EVs/friendship and resulting stats; stages are not a substitute |
| 155 | Qualot Berry | N / I | Outside-battle EV reduction (Defense) and friendship change; no held activation | Fed through outside-battle item use, not held in combat | Reimport actual EVs/friendship and resulting stats; stages are not a substitute |
| 156 | Hondew Berry | N / I | Outside-battle EV reduction (Special Attack) and friendship change; no held activation | Fed through outside-battle item use, not held in combat | Reimport actual EVs/friendship and resulting stats; stages are not a substitute |
| 157 | Grepa Berry | N / I | Outside-battle EV reduction (Special Defense) and friendship change; no held activation | Fed through outside-battle item use, not held in combat | Reimport actual EVs/friendship and resulting stats; stages are not a substitute |
| 158 | Tamato Berry | N / I | Outside-battle EV reduction (Speed) and friendship change; no held activation | Fed through outside-battle item use, not held in combat | Reimport actual EVs/friendship and resulting stats; stages are not a substitute |
| 159 | Cornn Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 160 | Magost Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 161 | Rabuta Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 162 | Nomel Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 163 | Spelon Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 164 | Pamtre Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 165 | Watmel Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 166 | Durin Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 167 | Belue Berry | N / V | No battle-held effect; Pokéblock/contest use | No held activation | None |
| 168 | Liechi Berry | K / V | Attack stage +1 (cap +6) | Alive; HP <= floor(maxHP/4), normal/end-turn item check, relevant stage below +6 | Enter actual net Attack stage after activation |
| 169 | Ganlon Berry | K / V | Defense stage +1 (cap +6) | Alive; HP <= floor(maxHP/4), normal/end-turn item check, relevant stage below +6 | Enter actual net Defense stage after activation |
| 170 | Salac Berry | K / V | Speed stage +1 (cap +6) | Alive; HP <= floor(maxHP/4), normal/end-turn item check, relevant stage below +6 | Enter actual net Speed stage after activation |
| 171 | Petaya Berry | K / V | Special Attack stage +1 (cap +6) | Alive; HP <= floor(maxHP/4), normal/end-turn item check, relevant stage below +6 | Enter actual net Special Attack stage after activation |
| 172 | Apicot Berry | K / V | Special Defense stage +1 (cap +6) | Alive; HP <= floor(maxHP/4), normal/end-turn item check, relevant stage below +6 | Enter actual net Special Defense stage after activation |
| 173 | Lansat Berry | K / V | Sets Focus Energy state (+2 critical chance stages); does not force crit | Alive; HP <= floor(maxHP/4), normal/end-turn item check, Focus Energy flag absent | Crit checkbox represents a chosen critical outcome; probability not represented |
| 174 | Starf Berry | K / V | Random eligible Attack/Defense/SpA/SpD/Speed stage +2, capped +6 | Alive; HP <= floor(maxHP/4), normal/end-turn check, at least one eligible stat below +6 | Enter actual observed net stage(s); never guess the random stat |
| 175 | Enigma Berry | U / M | Custom e-Reader/save-defined held effect and parameter | Depends on actual custom data; cannot infer from item name | No current custom-effect inputs |
