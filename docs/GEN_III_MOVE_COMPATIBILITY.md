# Pokémon Emerald move damage compatibility audit

Audit date: 2026-10-24. Investigation only; no calculator, eligibility, state, or UI changes.

## Inventory and classification

The reference contains **355 entries: 354 actual moves (IDs 1–354), plus ID 0, `None`**. The generated battle move resource contains the 354 actual moves; `battleMove(0)` correctly returns null. Every reference ID has a row in [the complete CSV inventory](GEN_III_MOVE_COMPATIBILITY.csv), including its resource power/effect, observed availability, category, missing mechanic, required data, and priority.

| Category | Entries | Meaning |
| --- | ---: | --- |
| A — Fully supported connected-hit calculation | **140** | No additional move-specific damage adjustment identified within the implemented calculation scope below. |
| B — Baseline only / partially supported | **24** | Produces rolls, but omits a move-specific or move-targeting damage adjustment in at least one applicable situation. |
| C — Incorrectly unavailable conventional calculation | **13** | A conventional calculation can be resolved from existing reliable inputs, but the active eligibility/resolution path blocks it. Some need those inputs projected from existing data first. |
| D — Legitimately unavailable in the current conventional-hit contract | **178** | 138 zero-power non-direct moves, the None sentinel, and 39 attacks requiring a dedicated nonconventional/aggregate outcome model or unavailable execution history. |
| **Total** | **355** | **140 + 24 + 13 + 178** |

**Scope of “fully supported”:** damage for a successful connected hit against the selected defender, with exact required stats and the abilities/items already implemented. It does not mean a complete Emerald battle simulation, or correctness under every still-unimplemented ability, screen, volatile condition, accuracy check, or move-success rule. For example, charging, recharge, recoil, draining, flinching, and post-hit stat changes do not by themselves invalidate a connected-hit damage calculation. Under an unrestricted “every cartridge circumstance” definition, the app cannot yet certify any damaging move as universally complete because of the shared gaps described below.

Category D does **not** mean “impossible to implement” or “missing all required data.” Fixed damage and fixed two-hit attacks have sufficient inputs but are correctly kept out of an ordinary single-hit formula. Category C identifies conventional-hit eligibility/resolution defects; D identifies explicit special-result/state boundaries. This distinction prevents recommending a blanket allowlist expansion for every nonzero-power move.

## What the active application actually calls

`BattleMatchup.jsx` → `BattleMoveDetails.jsx` → `calculateAbilityScenarios()` → `calculateCoreDamage()` → `neutralBaseDamage()` / `applyCoreDamageModifiers()`.

The eligibility gate requires an allowlisted effect, integer power **2–255**, and a move ID other than Struggle (165). Power **1 is a placeholder**, not the actual power of Return, Hidden Power, fixed-damage moves, etc.

The older `basicDamage.js` pipeline calls `variableDamage.js`, `specialDamage.js`, and `fixedDamage.js`. The **active popup damage path does not**. Existing helper code/tests therefore do not establish current popup compatibility. `BattleMoveDetails.jsx` separately calls some resolvers for metadata, with `basicAttacker`/`basicDefender` arguments that the active matchup does not supply; metadata resolution is not damage resolution and can disagree with the actual calculation. Its metadata conditions also read `attacker.weather`, while the active damage path receives the separate weather prop.

The ability scenario system requires **exactly 16 nonnegative integer damage rolls**, then groups by the complete arrays. The old fixed-damage helper returns a one-element array. Multi-hit totals, Psywave, random base powers, healing branches, and delayed effects cannot simply be inserted into this contract without an explicit result policy. Preserve exact-distribution grouping when expanding it.

An exhaustive runtime sweep with known, valid synthetic matchup inputs returned **164 available / 191 unavailable**, identically through core and ability scenarios. Those 164 are A + B, not 164 fully supported moves. All available results had 16 rolls. These fixtures isolate eligibility; they are not a claim that every real, uncertain Frontier matchup has sufficient data.

## C: conventional moves incorrectly blocked — 13

| Moves | Why unavailable / missing calculation | Existing data and implementation requirement | Priority |
| --- | --- | --- | --- |
| **Return, Frustration** | Power-1 placeholder and effect rejected; friendship resolver bypassed. | Player friendship is parsed. For ordinary Tower and Anabel sets, use verified generation rules, not a species default; project reliable opponent friendship into the active model. | 1 |
| **Hidden Power** | Placeholder Normal/power 1 never becomes the IV-derived type and power before core eligibility/category selection. | Existing six-IV resolver; player IVs imported. Opponent IVs can be derived only from reliable trainer/set information, then must be projected. Unknown IVs must remain unavailable. | 1 |
| **Low Kick** | Power-1/effect rejected; existing weight resolver bypassed. | Defender canonical species ID and `weights.json` already provide weight. | 1 |
| **Flail, Reversal** | HP-dependent power resolver bypassed; placeholder rejected. | Attacker current/max HP already available. Implement Emerald HP buckets; retain normal Gen III critical-hit behavior (do not import the Gen II critical restriction). | 2 |
| **Eruption, Water Spout** | `ERUPTION` effect rejected even though resource power is 150. | Attacker current/max HP; resolve power before the ordinary formula. Doubles also requires the separate spread handling below. | 2 |
| **Weather Ball** | Effect rejected; static Normal/50 metadata is insufficient. | Existing weather determines type and power behavior; preserve supported ability interactions and the limits of unimplemented weather suppression. | 2 |
| **Self Destruct, Explosion** | `EXPLOSION` effect not allowlisted. | Existing Defense/stages suffice for the Gen III Defense-halving calculation. Damp prevention is a separate unimplemented ability and must not be claimed as supported. | 3 |
| **False Swipe** | `FALSE_SWIPE` effect not allowlisted. | Existing defender current HP permits capping each roll to leave at least 1 HP. | 3 |
| **Struggle** | Explicit ID exclusion. | Existing stats suffice, but implement its STAB/type-effectiveness bypass; simply allowing a Normal move would be wrong. Recoil/PP execution are separate concerns. | 3 |

These are **not** all one-line allowlist fixes. Resolve dynamic power/type before category selection; allow a legitimate resolved power of 1 where Emerald requires it; retain effect-specific stat or damage rules. Do not remove the power guard globally.

## B: currently displayed baseline omits damage mechanics — 24

| Mechanic | Affected available moves | What is missing / data availability |
| --- | --- | --- |
| Attacker status | **Facade** | Uses normal **70** power baseline even when poisoned, badly poisoned, burned, or paralyzed. Existing attacker status is sufficient for the missing Emerald damage multiplier. Sleep/freeze do not activate it. Preserve burn and Guts interaction. |
| Defender status | **SmellingSalt** | Omits doubled damage against a paralyzed defender. Status exists; the Substitute exception requires an untracked volatile, so a no-Substitute calculation must be explicitly scoped. |
| Weather | **SolarBeam** | Omits adverse-weather reduction in rain, sandstorm, and hail. Existing weather is sufficient. Charging in sun changes execution timing rather than this connected-hit range. |
| Switching | **Pursuit** | Omits switching-target double damage; switching event not tracked. |
| Earlier damage this turn | **Revenge** | Omits conditional double damage; source/turn damage history not tracked. |
| Airborne target | **Gust, Twister** | Omit doubled damage against Fly/Bounce airborne targets; volatile state absent. |
| Underground target | **Earthquake** | Omits doubled damage against an underground Dig target; volatile state absent. |
| Underwater target | **Surf, Whirlpool** | Omit doubled damage against an underwater Dive target; volatile state absent. |
| Minimize | **Stomp** | Omits doubled damage against a minimized target. A Minimize flag is required; evasion stages are not an equivalent substitute. |
| Doubles spread damage | **Razor Wind, Acid, Surf, Blizzard, Razor Leaf, Swift, Bubble, Rock Slide, Powder Snow, Icy Wind, Twister, Heat Wave, Hyper Voice, Air Cutter, Muddy Water** | Core ignores battle format and target metadata. Emerald halves these `MOVE_TARGET_BOTH` attacks when two opposing battlers remain. Format exists, but active second-defender/alive state does not. Surf/Twister also appear above; count each move once. |

The first nine rows contain 11 distinct moves; the spread row adds 13 others, for **24 distinct partial moves**. Eruption and Water Spout also have `MOVE_TARGET_BOTH`, but are counted in C because they currently return unavailable.

**Emerald-specific warning:** Surf targets both opponents, not the ally, and is subject to this spread reduction. Earthquake, Self Destruct, Explosion, and Magnitude use the foes-and-ally targeting path; do not apply a modern blanket spread multiplier to them. The current generated move resources omit `target`, so this information must come from the canonical move data in a future implementation. [Cartridge move targets](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h) and [base-damage spread/weather rules](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c) are the reference.

**Facade/Dig regression status:** both now pass active eligibility. Facade uses 70 and Dig uses **60**. In the audit fixture, Facade produced 40–48 whether healthy or poisoned, confirming its intentionally deferred status multiplier is still absent. Dig produced 23–28 and is category A for its connected hit; its charging/underground execution is not simulated. The underground bonus belongs to incoming Earthquake/Magnitude, not a universal multiplier on Dig itself.

## D: special attacks legitimately outside the current result contract — 39

| Group | All affected moves | Why a conventional 16-roll hit is inappropriate | Existing inputs / next requirement |
| --- | --- | --- | --- |
| Fixed/level/HP damage — 5 | **SonicBoom, Dragon Rage, Seismic Toss, Night Shade, Super Fang** | Dedicated damage: 20, 40, attacker level, attacker level, half defender current HP. Ordinary STAB/weather/random scaling is inappropriate. | Level/current HP exist. Reuse and validate the old fixed-damage rules behind a core/scenario-compatible boundary; preserve immunities. No new conditions control needed. |
| HP difference — 1 | **Endeavor** | Difference between current HP values, with failure/immunity rules. | Both current HP values exist. Dedicated result path; no new control needed. |
| Random level damage — 1 | **Psywave** | Emerald uses 11 level-scaled factors, 50%, 60%, …, 150%; these are not the ordinary 16 damage rolls. | Level exists; outcome representation must support this distribution. |
| Random power — 1 | **Magnitude** | Seven power outcomes, plus underground interaction. Static power 1 is a sentinel. | Can enumerate ordinary-target magnitude branches without a new control; underground state is unavailable. |
| Damage/healing branches — 1 | **Present** | Random 40/80/120-power damage or healing. A single conventional range conceals a qualitatively different outcome. | Stats/HP exist; needs a mixed-outcome policy, not invented deterministic power. |
| Random multi-hit — 12 | **DoubleSlap, Comet Punch, Fury Attack, Pin Missile, Spike Cannon, Barrage, Fury Swipes, Bone Rush, Arm Thrust, Bullet Seed, Icicle Spear, Rock Blast** | Need 2–5 separately resolved hits and total-outcome handling. A one-hit range is not full-move damage. | Base calculation inputs exist; introduce aggregate hit-count/damage outcomes and hit-stopping policy. No new conditions control is inherently necessary if outcomes are enumerated. |
| Fixed two-hit — 3 | **Double Kick, Twineedle, Bonemerang** | Need two separately resolved hits, not doubled final damage or doubled base power. | Known count and existing stats suffice for prospective connected-hit totals. Start multi-hit work here; aggregate distributions still need proper grouping. |
| Escalating hits — 1 | **Triple Kick** | Hit powers 10/20/30 and separate hit execution/accuracy. | Needs sequential outcome handling, not an ordinary single-hit vector. |
| Consecutive-use power — 3 | **Rollout, Ice Ball, Fury Cutter** | Streak counters/reset rules; Rollout/Ice Ball also depend on Defense Curl. | Those counters and the Defense Curl volatile flag are not tracked. Cannot infer them from stat stages or assume first use. |
| Stockpile — 1 | **Spit Up** | Stockpile-dependent damage and a special calculation path, not an ordinary static 100-power move. | Stockpile count is absent. |
| Party-based damage — 1 | **Beat Up** | Gen III uses eligible party members and species base stats rather than the active Pokémon's ordinary offensive stat. | Need reliably known participating party species, levels, HP, and statuses on both sides; active calculation receives only the selected pair. |
| Delayed damage — 2 | **Future Sight, Doom Desire** | Gen III stores cast-time base damage and later resolves a delayed attack, bypassing the normal STAB/type/critical path. | A prospective newly-cast preview can use current known stats; actual pending attacks require stored snapshots/turn state, which are absent. Do not apply modern delayed-move mechanics. |
| Damage-history retaliation — 3 | **Counter, Mirror Coat, Bide** | Depend on qualifying recorded damage, source, and timing. | History unavailable; stats alone cannot determine their damage. |
| OHKO — 4 | **Guillotine, Horn Drill, Fissure, Sheer Cold** | Success/level/accuracy and Sturdy rules, not ordinary damage variance. | Level/HP exist; an explicit outcome/accuracy model is needed. Unavailable is appropriate in the current conventional-range calculator. |

The remaining **139 D entries** are the **138 zero-power non-direct moves plus None**. Their exact names and IDs are all in the CSV. This group includes move callers/copiers (Metronome, Mirror Move, Sleep Talk, Assist, Nature Power, Mimic, Sketch), HP redistribution (Pain Split), indirect effects (Leech Seed, Nightmare, Curse, Spikes, Perish Song, Destiny Bond), status, recovery, and setup. “Zero power” does not mean “never causes HP loss”; it means these entries do not themselves specify an ordinary direct hit. Calling Nature Power would require resolving the environment and called move rather than feeding power 0 into the formula.

The special paths were checked against Emerald's [battle commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c) and [move-effect scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s), rather than inferred solely from metadata. These distinguish placeholder powers, scripted damage multipliers, sequential hits, and delayed snapshots.

## Data availability and reliability

| Input | Player | Opponent / active matchup |
| --- | --- | --- |
| Level and stats | Imported recorded/calculated values, validated by adapter. | Exact stat values only when candidate sets/trainer data resolve them; ranges/unknown strings intentionally fail core integer checks. |
| IVs | Six imported IVs available on player battle model. | Trainer/Anabel fixed IVs and set EVs/nature exist in source adapters. With no selected reliable trainer, the general adapter's 31-IV value is explicitly an assumption; the active stat-range path rejects that assumption. Active opponent object does not carry IVs. |
| EVs/nature | Imported. | Frontier set data exists; not attached as IV/EV/nature fields to the active opponent projection. Exact HP/stats alone do not prove a unique IV spread. |
| Friendship | **Parsed from the decrypted Growth substructure byte 9** in `readPokemon.js`; eggs use null. `pokemonAdapter.js` preserves it. | **No raw friendship field in any of the 882 ordinary sets or 6 Tower/Anabel sets.** Ordinary Tower creation and Frontier Brain creation explicitly set friendship 255, or 0 when the set contains Frustration. `frontierAdapter.js` already encodes this, but `BattleMatchup.jsx` does not project it. |
| Current/max HP | Conditions provide current HP; null represents full HP. Exact maximum HP comes from stats. | Same controls, independent per slot; an uncertain maximum HP cannot safely supply a numeric default. |
| Weight | Existing species-weight table; player adapter also exposes weight. | Canonical dex exists, so the same table can resolve it without a new field/control. |
| Ability | Known imported ability. | Possible Gen III species abilities, optionally narrowed by a reliable unique set; scenario system already enumerates combinations. |
| Held item | Imported actual item. | Observation/uniquely identified set item; explicit unknown remains null, and can make otherwise supported moves unavailable. Never infer from species. |
| Weather, status, stat stages, crit | Existing conditions, projected to each active side. | Same; attacker/defender ownership must be preserved in both directions. |
| Screens | Stored in slot conditions. | **Not projected into core damage**, and core has no screen modifier. Shared integration gap. |
| Battle format | Singles/Doubles available. | Only Tower is selectable. Format reaches battle context, but core does not use it for spread damage; active field does not model both opposing battlers. |
| Volatiles/history | Not reliably modeled. | No switching event, Minimize/Defense Curl flag, semi-invulnerable state, Substitute, Stockpile/streak count, prior damage record, or delayed-damage snapshot in the active pair. |

The friendship rule is confirmed in [ordinary Tower party creation](https://github.com/pret/pokeemerald/blob/master/src/battle_tower.c) and [Frontier Brain creation](https://github.com/pret/pokeemerald/blob/master/src/frontier_util.c). It applies to the app's ordinary Tower/Anabel sets, not universally to every possible Frontier opponent source. Factory generation differs, and recorded/e-Reader/apprentice parties require their own reliable provenance. Do not extend this rule to future facilities or arbitrary opponents by default. If multiple candidate sets remain and imply different friendship, retain uncertainty rather than choosing a value.

**Do not directly reconnect the legacy helpers without review:** `variableDamage.js` currently substitutes favorable player friendship if absent; the new work must preserve unavailable instead. Its HP precedence can favor `initialCurrentHp` over current HP outside supplied conditions. Metadata resolution with absent player data can also choose a fallback friendship. These are dormant-path risks, not evidence that current core resolves those moves correctly.

## Shared gaps and applicability caveats

- **Reflect/Light Screen:** existing controls are stored but not used by active core. This affects many otherwise ordinary moves; categories A/B are conditional on those shared unimplemented effects not applying. Brick Break's baseline hit works, but the app does not independently demonstrate screen bypass/removal because all screens are ignored.
- **Unimplemented abilities:** the scenario wrapper currently labels branches available even when an unimplemented ability could alter/prevent damage. Examples include Wonder Guard, Soundproof (Snore/Uproar/Hyper Voice), Damp (explosions), weather suppression, and copied/changed abilities. Matchup type indicators already recognize some additional immunities that actual core damage does not, so an indicator can disagree with a numeric result. These are ability coverage gaps, not new move eligibility bugs; no ability code was changed.
- **Unsupported conditional effects:** a defined `unsupported` scenario status exists, but core does not emit it for these omitted mechanics. “Available” currently means rolls were produced, not complete coverage of the cartridge state.
- **Hit success is not simulated:** Snore requires the attacker asleep; Dream Eater requires the target asleep; Fake Out needs first-turn eligibility; Focus Punch can be interrupted. Existing numeric ranges describe a hit that connects. Thunder/weather accuracy, high-crit probability, charging, Protect/Endure/Substitute, and recoil/drain aftermath are not execution predictions. The CSV notes representative cases rather than misclassifying every conditional-success move as a broken formula.
- **Unknown required data:** missing opposing Pokémon, ambiguous required stats/item/ability, or an uncertain Ditto transformation state with relevant Metal Powder can legitimately make any move unavailable. The counts isolate move compatibility under sufficient baseline inputs, not the availability rate across all partially identified opponents.

## Recommended small implementation sequence

Each step should use the **active core/scenario path**, preserve exact integer arithmetic and both attack directions, and add focused reference tests before proceeding.

1. **Resolve existing-data power/type inputs:** Return/Frustration, Hidden Power, Low Kick. First project verified opponent inputs; never use favorable friendship or assumed IV defaults. This restores 4 C moves with existing resources and no new controls.
2. **Add two status/weather multipliers:** Facade and SolarBeam, then SmellingSalt in an explicitly scoped no-Substitute context. These fix currently misleading displayed ranges using existing conditions; verify exact script modifier order, not just a larger displayed power.
3. **Add current-HP move power:** Flail/Reversal and Eruption/Water Spout, including normal Gen III critical behavior and low-HP edge cases. Then Weather Ball's dynamic type/power. No new controls for represented Singles conditions.
4. **Add small dedicated results:** fixed/level damage first, then Super Fang/Endeavor, False Swipe's per-roll HP cap, and separately explosions/Struggle. Keep fixed damage out of ordinary STAB/weather/random calculation and make its scenario result explicit. No new conditions controls needed; unimplemented immunity/prevention abilities remain a stated boundary.
5. **Design aggregate distributions:** Double Kick/Twineedle/Bonemerang first; then 2–5-hit moves and Triple Kick. Generalize exact outcome comparison rather than comparing rounded percentages or pretending all hits share one random roll. Follow with Magnitude/Psywave/Present branch models if desired. These need result architecture/presentation decisions, not inherently new Battle Conditions controls.
6. **Separate field/state follow-up:** reconnect existing screen data, then design reliable second-active-battler/alive-state handling for Doubles. After that, consider Pursuit/Revenge, volatile target bonuses, streak/Stockpile/history moves, Beat Up, and delayed snapshots. Do not invent absent state to avoid controls.

Steps 1–4 can largely proceed without adding Battle Conditions controls. Step 5 needs a result-model decision. Step 6 requires an explicit state design; format or stat stages alone do not supply the missing information. OHKO and indirect/status/calling moves should remain outside a conventional damage-range implementation unless separately approved.

## Verification and change boundary

- Enumerated every reference ID 0–354; checked generated move effect/power, active core eligibility, and actual scenario availability.
- Runtime fixture: level 50, exact 100 offensive/defensive stats, 200 HP, valid Normal types, known Immunity, no items, neutral stages/status/weather, Tower Singles. **164 core and scenario results available, each with 16 rolls; 191 unavailable; zero eligibility/availability mismatches.**
- Targeted probes confirmed Facade's unchanged healthy/poison rolls, SolarBeam's unchanged clear/rain rolls, and Dig's successful 60-power calculation.
- Source review covered the active UI-to-core path, legacy resolvers, save parsing/adapters, opponent set/IV/stat reliability, conditions, ability grouping, and canonical Emerald scripts/targets.
- Exhaustive inventory assertions verify unique IDs, every nonzero-power excluded move assigned a specific group, and category totals summing to 355. A second sweep checked both directions with different levels/stats: **710 directed move checks** through core and scenario wrapper; **328 available 16-roll results**, with matching eligibility/availability in every case.
- **Only this report and its CSV were added.** No tests or build were rerun for this documentation-only audit; no implementation correctness is claimed from an audit fixture alone. Existing workspace changes were preserved.

Await approval before changing calculation or UI code.

## Step 6B implementation follow-up

The audit above records the pre-implementation findings. The active core now
applies Facade's burn/poison/toxic/paralysis multiplier and SmellingSalt's
paralyzed-defender multiplier after base damage's `+2`, alongside critical hits,
before STAB, type effectiveness and all 16 random rolls. Their reference powers
remain 70 and 60. Burn still halves the physical subtotal unless Guts applies.
SolarBeam retains power 120 and halves the integer subtotal before `+2` in rain,
sandstorm and hail; clear weather and sun do not reduce it.

SmellingSalt assumes a connected hit against a defender without Substitute.
Substitute interactions are outside the currently tracked state. This calculation
does not cure paralysis or mutate either Pokémon. SolarBeam charging turns are
also outside scope. No new weather-suppression ability support is introduced.

Ordering references: [CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c),
[Facade and SmellingSalt scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s),
and [Cmd_damagecalc](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c).

## Step 6C implementation follow-up

The active dynamic resolver now supports Flail, Reversal, Eruption and Water
Spout before conventional eligibility, stat selection and damage. Flail/Reversal
use `max(1, floor(48 * currentHP / maxHP))` and inclusive bucket limits
`1, 4, 9, 16, 32, 48`, yielding powers `200, 150, 100, 80, 40, 20`.
Eruption/Water Spout use `max(1, floor(150 * currentHP / maxHP))`.
Both follow Emerald's [move commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
and [GetScaledHPFraction](https://github.com/pret/pokeemerald/blob/master/src/battle_interface.c).

Current HP must be an integer from 1 through the exact known maximum. Explicit
null means full HP only with a known maximum; missing, uncertain, invalid or
zero (fainted) HP returns unavailable. Existing Battle Conditions overrides
supply the active attacker HP in either direction; legacy initial HP fields
are not used. Popup power uses the same resolver and shows a dash when HP is
unresolved. Ordinary Gen III critical hits and the existing modifiers apply.
Doubles spread reduction remains deferred for Eruption and Water Spout.

## Step 6D implementation follow-up

Weather Ball now resolves its effective type/power before category selection and
all type-dependent modifiers: clear Normal/50, sun Fire/100, rain Water/100,
sandstorm Rock/100, hail Ice/100. Normal and Rock use Attack/Defense; the other
three use Special Attack/Special Defense. The popup uses the same resolver and
selected Battle Conditions weather.

Cartridge-order distinction: [Cmd_setweatherballtype](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
sets the type and a scripted damage multiplier of 2 in weather. Thus the displayed
100 effective power is represented internally as formula power 50 plus doubling
after `+2` (alongside critical hits), before STAB/types/random. This preserves
Emerald's integer rolls, including low-HP ability and weather rounding, which can
differ from substituting literal power 100 in the base formula. The resolved type
is used for abilities/items throughout, with ordinary sun/rain boosts applied
once. Cloud Nine/Air Lock suppression and Forecast form changes remain outside
this step. No spread damage, controls or new abilities/items were introduced.

## Step 6E implementation follow-up

The active core dispatches six canonical move IDs to a separate deterministic
calculator: Seismic Toss/Night Shade use attacker level, Dragon Rage uses 40,
SonicBoom uses 20, Super Fang uses `max(1, floor(defenderCurrentHP / 2))`, and
Endeavor uses `defenderCurrentHP - attackerCurrentHP` only when positive.
HP-dependent inputs use current Battle Conditions; null means full HP only with
an exact maximum. Unknown/invalid HP remains unavailable; fainted combatants fail.
Endeavor's HP failure check precedes type immunity, matching its Emerald script.
The legacy helper is not reconnected and its stale initial-HP fallbacks are not used.

Successful results are `{kind:'deterministic-damage', outcome:'damage', damage}`
(with a reason field), without a rolls array. Immune/failed outcomes have explicit
outcome/reason fields and zero damage, and display “Immune.” / “Move fails.”
Unavailable inputs remain separate. Scenarios compare outcome kind, amount and
reason; conventional arrays still compare all 16 rolls. Percentages use defender
maximum HP and precede the single HP amount using existing typography/classes.

STAB, nonzero type scaling, offensive/defensive stats, items, status modifiers,
weather boosts and critical multipliers do not change these amounts. Canonical
Gen III type immunities are retained. SonicBoom is absent from Emerald's
Soundproof list, so Soundproof does not block it. No new abilities were added:
unresolved Trace, nonimmune Wonder Guard branches and Night Shade against
Forecast remain explicitly unsupported instead of guessing. This remains a
connected-hit preview: accuracy, Protect/Endure/Substitute and other untracked
execution state are not simulated. Known fixed damage without exact defender
maximum HP cannot show a percentage and remains unavailable in the popup.

References: [damage/HP commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
[move scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s),
and [Emerald sound move list](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c).

## Step 6F implementation follow-up

Four canonical move IDs now enter a narrow special conventional path without
relaxing the shared legacy eligibility gate. False Swipe (40 power) computes
all 16 normal final rolls and then caps each independently at defender current
HP minus one. A defender at 1 HP produces sixteen zeros. The required HP uses
Battle Conditions, with explicit null meaning full HP only at an exact maximum;
unknown/invalid/fainted target HP remains unavailable. Type immunity is retained.
This assumes no Substitute, which remains outside tracked state.

Explosion (250) and Self Destruct (200) halve the item/Marvel Scale-adjusted
integer Defense before Defense stages and their critical-hit exceptions. Burn,
Attack abilities/items and the ordinary modifiers remain in the existing order.
Damp branches on either active Pokémon remain explicitly unsupported, including
when only one possible ability is Damp; they are not dropped or averaged with
available scenarios. Missing abilities remain unavailable and unresolved Trace
is unsupported. Additional field Pokémon/abilities and attacker fainting are not
simulated.

Struggle (50) uses physical Attack/Defense and the existing base formula,
including burn, items and abilities, but bypasses STAB, type chart and type-based
immunity in the final typecalc stage. Ghost defenders take normal damage. As on
cartridge, the formula still uses Normal for applicable type-item lookup; this
is distinct from the STAB/type-chart bypass. Recoil and PP depletion are excluded.
All four preserve 16 outcomes, percentage-before-HP presentation and existing
scenario grouping. Deterministic Step 6E results remain separate. Doubles spread
reduction, screens and other untracked execution mechanics remain deferred.

References: [CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c),
[Cmd_typecalc and Cmd_adjustnormaldamage](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c).

## Step 6G-1 implementation follow-up

Double Kick (Fighting/30), Twineedle (Bug/25) and Bonemerang (Ground/50) now use
two separate calls to the existing per-hit conventional calculation. All 256
ordered pairs of their two independent 16-roll arrays are counted. The new
`aggregate-damage` result stores two hit results plus a sorted `distribution`
of `{damage, count}`, `totalOutcomes: 256`, `hitCount: 2`, and total min/max.
Each count/256 is the exact probability conditional on the selected critical
policy and two connected hits. There is no conventional top-level rolls array.
Scenarios compare the entire frequency distribution, never endpoints or rounded
percentages. Conventional and deterministic result contracts remain unchanged.
The existing popup presents total percentage followed by total HP damage range.

Emerald's hit loop runs `critcalc`, `damagecalc`, `typecalc` and random damage
for each hit. Critical checks and random damage rolls are independent per hit.
**Existing Crit checkbox limitation:** unchecked conditions BOTH hits to
noncritical; checked conditions BOTH hits to critical (including each hit's stat
stage exceptions). Mixed noncritical/critical outcomes and critical occurrence
probabilities are not represented. This does not claim both hits share a random
critical event; it is a conditional preview policy without new controls.

Twineedle uses the same damage loop; its poison effect is excluded as requested.
It and Bonemerang do not make contact in Emerald; Double Kick does. Contact
abilities and Color Change can run between hits. Without implementing new ability
transitions, Color Change, Wonder Guard and unresolved Trace branches remain
unsupported; Double Kick against Flame Body, Effect Spore, Static or Poison Point
with an initially status-free attacker is also unsupported. An already present
major status prevents a new contact status. Other on-hit changes, item activation,
secondary effects, accuracy, recoil and attacker/target fainting between hits are
outside this two-connected-hit scope. Current tracked status/stats/types/items
are otherwise held constant between hits. No variable-hit moves were enabled.

References: [Emerald multi-hit loop and Twineedle script](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s),
[random damage and move-end handling](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
[contact/Color Change abilities](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c),
and [cartridge move flags](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h).

## Step 6G-2 implementation follow-up

The 12 approved variable multi-hit IDs now use the same private conventional
per-hit calculator and aggregate presentation: DoubleSlap, Comet Punch, Fury
Attack, Pin Missile, Spike Cannon, Barrage, Fury Swipes, Bone Rush, Arm Thrust,
Bullet Seed, Icicle Spear and Rock Blast. No other MULTI_HIT-effect entry or
exceptional move is admitted by the narrow ID guard.

Emerald selects 2/3/4/5 hits with exact probabilities 3/8, 3/8, 1/8, 1/8. The
calculator computes five independent per-hit 16-roll arrays and incrementally
convolves their unique damage frequencies. It retains each 2/3/4/5-hit prefix
distribution and its denominator `16^n`; it does not enumerate every `16^5` path.
The overall weighted distribution uses the common denominator `8 * 16^5 =
8,388,608`, with integer frequency weights `count * numerator * 16^(5-n)`.
Every stored `count / totalOutcomes` is exact, including overlap between hit-count
branches and immunity outcomes. The top-level aggregate has `hitCount: '2-5'`,
`hitCounts` for the four conditional branches, and the weighted `distribution`.
No top-level conventional rolls array is manufactured. Fixed two-hit aggregates,
conventional rolls and deterministic outcomes retain their existing contracts.

Ability scenarios compare complete weighted frequency distributions. The popup
uses their overall minimum/maximum and defender maximum HP, displaying total
percentage range before total HP range with the existing design and controls.
Skill Link is not a Gen III ability and is neither implemented nor assumed.

The Step 6G-1 critical policy remains explicit: Crit off conditions ALL connected
hits to noncritical; Crit on conditions ALL to critical. Independent per-hit
random damage is convolved within that condition. Mixed critical outcomes and
critical occurrence probabilities are not modeled. Between-hit state is held
constant: accuracy, secondary effects, consumable item activation, recoil and
attacker/target fainting stops are excluded. Unmodeled Trace, Wonder Guard and
Color Change remain unsupported when relevant. Contact-status transition guards
also apply to DoubleSlap, Comet Punch, Fury Attack, Fury Swipes and Arm Thrust;
the other seven approved moves are noncontact. Existing tracked status prevents
new contact status, consistent with the fixed two-hit boundary.

References: [Cmd_setmultihitcounter and hit-loop commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
[Emerald multi-hit script](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s),
and [canonical move powers/contact flags](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h).

## Step 6G-3 implementation follow-up

Triple Kick (ID167) now uses three independent conventional hit calculations at
Fighting-type powers 10, 20 and 30, followed by the existing compact frequency
convolution. Its aggregate has `hitCount: 3`, `hitPowers: [10,20,30]`, an exact
`distribution` with denominator `16^3 = 4096`, and
`condition: 'all-three-connected'`. No variable 2–5-hit weights or accuracy
probabilities are applied, and no partial one-/two-hit Triple Kick outcomes are
included. Scenario grouping compares the entire three-hit frequency distribution.

Emerald checks accuracy inside the Triple Kick loop, then increments power by10,
recalculates critical chance and damage, and draws a new damage roll for each
successful hit. Later attacks occur only after preceding hits connect. This
preview is explicitly conditional on ALL THREE hits connecting: the popup keeps
percentage first and HP second, adds the compact existing-style explanation
“If all 3 hits connect”, and shows `10 / 20 / 30` in its existing Power field.
No controls or layout redesign were introduced.

The existing Crit policy is unchanged: off conditions every hit to noncritical;
on conditions every hit to critical. Mixed critical outcomes, hit/miss odds,
secondary effects, consumable item activation, between-hit state transitions,
and attacker/target fainting stops are not modeled. Triple Kick makes contact,
so the same unsupported contact-status/Color Change/Trace/Wonder Guard boundaries
as the other multi-hit paths apply. Existing supported stats, status, abilities,
held items, STAB and type effectiveness are evaluated separately for each power.
All conventional, deterministic, fixed two-hit and variable 2–5-hit result
contracts and presentations are unchanged outside Triple Kick.

References: [BattleScript_TripleKickLoop](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s)
and [canonical Fighting/10/contact metadata](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h).

## Step 6H-1 implementation follow-up

Existing Battle Conditions screens now project into each active damage model.
Only the defender's matching screen is used: Reflect for Gen III physical types,
Light Screen for special types, after dynamic type resolution. In Singles the
integer damage subtotal is halved BEFORE `+2`, STAB, type effectiveness and random
rolls. Reflect acts after burn; Light Screen acts before weather. Critical hits
bypass screens regardless of stat-stage signs, retaining the existing critical
stage exceptions, burn, ability and item handling. Brick Break previews its hit
after screen removal, as in its script, without mutating stored conditions.

Doubles uses `2 * floor(subtotal / 3)` only when TWO living active battlers remain
on the defending side; with ONE it uses Singles' `floor(subtotal / 2)`. This is
not interchangeable with `floor(2 * subtotal / 3)`. The existing app records a
selected pair and per-slot conditions, not reliable living active-side counts.
Consequently a matching, noncritical screen in Doubles returns explicit
unsupported reason `unknown-defender-side-count` rather than guessing. Trusted
standalone callers can supply `battleContext.defenderSideAlive` as 1 or 2; the UI
supplies neither. Team size, roster entries and selected species are never used
to infer that count. Criticals, Brick Break, irrelevant/inactive screens and
fixed/deterministic damage do not require it. No new controls were added.

All supported multi-hit paths apply screens to EACH hit before convolution.
Exact aggregate frequencies/weights and full-distribution scenario grouping
remain unchanged. Fixed/deterministic damage bypasses screens entirely. The
existing all-noncritical/all-critical multi-hit limitation remains explicit.
Popup typography, range ordering, controls and dismissal are unchanged. Screens
retain the existing per-slot condition storage; this step does not simulate
screen duration, switching-wide propagation or Brick Break's later state changes.
Doubles spread reduction and all deferred abilities remain outside scope.

References: [CalculateBaseDamage and CountAliveMonsInBattle](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c)
and [Brick Break script](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s).

## Step 6H-2 implementation follow-up

The active calculator now supports defensive Wonder Guard, Soundproof and Damp.
These updates supersede their unsupported boundaries in earlier step notes;
legacy damage helpers remain separate from the active calculator.

Wonder Guard checks the resolved move type (including Hidden Power and Weather
Ball) against the defender's complete type product. Applicable damaging moves
must be super effective overall; weakness cancelled by resistance is blocked.
Ordinary type immunity remains distinct. Emerald's fixed/level/HP-damage scripts
run `typecalc` before overwriting damage: Seismic Toss, Night Shade and Dragon
Rage pass only against weaknesses; SonicBoom, Super Fang and Endeavor cannot be
super effective and are blocked unless ordinary immunity or an earlier failure
applies. Endeavor's HP failure precedes type calculation. Struggle bypasses
`typecalc` entirely, so Wonder Guard does not block its typeless damage. Charging
moves remain connected damaging-turn previews, not charging-turn simulation.

Soundproof uses Emerald's exact `sSoundMovesTable` identities: Growl, Roar, Sing,
Supersonic, Screech, Snore, Uproar, Metal Sound, Grass Whistle and Hyper Voice.
Only Snore, Uproar and Hyper Voice enter the existing supported damage path.
SonicBoom is deliberately absent. Heal Bell and Perish Song check Soundproof in
separate nondamaging scripts; those effects remain outside this damage preview.
No modern sound list, name matching or broad move-eligibility relaxation is used.

Damp on either selected active Pokémon prevents Explosion and Self Destruct
before type calculation, including against Ghosts. The existing scenario
enumerator pins each possible ability rather than choosing from a slash list.
This models only the selected pair, never untracked additional Doubles battlers.
Trace remains unsupported where its unresolved copied ability matters; a known
Damp on the other Pokémon already guarantees prevention. No fainting is applied.

Prevention reuses the deterministic terminal-result contract with
`outcome: 'blocked'`, zero damage and a specific `reason` (`wonder-guard`,
`soundproof`, `damp`), without rolls or aggregate distributions. It is distinct
from `immune`, `failed`, unsupported and unavailable outcomes. Scenario grouping
compares outcome and reason; different prevention abilities remain separate,
while equivalent Damp prevention from either holder can group together.
The existing popup message field displays “Blocked by Wonder Guard”, “Blocked
by Soundproof” or “Prevented by Damp”. Successful damage keeps percentage first.

Allowed multi-hit damage retains the complete per-hit rolls, exact convolution
and hit-count weights. Wonder Guard's obsolete multi-hit unsupported guard is
removed; Color Change, Trace and relevant contact-status transitions keep their
existing boundaries. All-noncritical/all-critical conditioning, no mixed crits,
no between-hit changes, and all prior screen limitations remain unchanged.
Cloud Nine/Air Lock, extra abilities, extra battlers, accuracy, KO probabilities,
spread reduction and post-move state changes are not implemented in this step.

References: [Cmd_typecalc, Cmd_tryexplosion, Heal Bell/Perish Song commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
[sSoundMovesTable and ABILITYEFFECT_MOVES_BLOCK](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c),
and [fixed/HP-damage and explosion scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s).

## Step 6H-3 implementation follow-up

Cloud Nine and Air Lock now suppress weather effects in the active calculator
when either selected Pokémon has the ability. This supersedes earlier notes
deferring these two abilities. `resolveEffectiveWeather` validates the selected
weather and reuses `battleWeather` to derive the calculation-only weather; it
never mutates field conditions or the imported Pokémon. Suppression is shared
by core calculations, individual multi-hit calculations and Weather Ball's
dynamic resolver. Rain/Sun Fire/Water modifiers and SolarBeam's rain/sand/hail
reduction use clear-weather behavior while suppressed, with their existing
integer ordering. Neither ability removes weather: effects resume as soon as
neither selected ability suppresses it. Charging turns remain outside scope.

Weather Ball becomes Normal/50 under suppression, selecting Physical stats,
Normal STAB/effectiveness/items and Reflect before the ordinary calculation.
Its original formula power50 and post-+2 script multiplier1 are preserved; no
residual weather boost or second doubling remains. All current weather states
are handled. Pinch abilities, Thick Fat, absorption/prevention abilities and
type-boosting items continue to use the resolved type. No currently supported
direct-damage item has a separate weather-dependent effect. Weather-dependent
speed/accuracy/end-turn effects are not added to this damage preview.

Each ability scenario resolves effective weather independently. Uncertain
Cloud Nine/Air Lock choices retain every branch; equivalent complete roll
arrays, deterministic outcomes or full aggregate distributions can still group.
Weather Ball also stores `{type,power}` metadata on each branch. Different
metadata stays attributable even if its resulting damage happens to match.
Known suppression displays Normal/50 globally. When branches disagree, the
existing Power field shows `50 / 100`, the single global type icon is omitted,
and existing ability labels include each branch's type and power. Unknown
abilities show unavailable metadata rather than a guessed type or power. No
controls, explanatory panels or popup layout redesign were introduced.

Only the selected pair is checked: additional Doubles battlers and spread
reduction remain excluded. Forecast form simulation is still outside active
core coverage; a newly suppressed conventional Forecast interaction returns
`unsupported: unmodeled-forecast` instead of assuming its battle types. Existing
form-independent deterministic behavior and prior explicit Forecast boundaries
remain unchanged. No new weather-related abilities or post-move state changes
are implemented. Multi-hit probabilities and all-noncritical/all-critical
conditioning, prevention outcomes and screen limitations are unchanged.

References: [WEATHER_HAS_EFFECT and WEATHER_HAS_EFFECT2](https://github.com/pret/pokeemerald/blob/master/include/battle_util.h),
[CalculateBaseDamage weather gate](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c),
and [Cmd_setweatherballtype](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c).

## Step 6I-1 implementation follow-up

Pursuit and Revenge now expose TWO independent connected-hit previews, never
one combined range: Pursuit normal/switching (effective power40/80), Revenge
normal/qualifying earlier damage (effective power60/120). Pursuit is Dark and
Special in Gen III; Revenge is Fighting and Physical. Each case retains all16
integer rolls and the existing stages, burn/Guts, items, criticals, screens,
weather suppression, STAB, effectiveness and prevention handling.

**Cartridge ordering clarification:** despite the usual “doubled power” wording,
Emerald sets `sDMG_MULTIPLIER = 2` for BOTH bonuses. `Cmd_damagecalc` multiplies
`CalculateBaseDamage` AFTER its subtotal, burn/screens/weather and `+2`, alongside
critical, BEFORE STAB/type/random. The calculator therefore retains literal
formula power40/60 with a script multiplier1/2; popup labels describe effective
power40/80 or60/120. Replacing the formula power with80/120 would be inaccurate.
For example, Lv50 equal100 stats, no STAB: Pursuit is19 before random, boosted38
(literal80 gives37). Revenge versus Normal is56, boosted112 (literal120 gives108).

Revenge's exact gate is a nonzero `physicalDmg` whose `physicalBattlerId` matches
the CURRENT target, OR a nonzero `specialDmg` with matching `specialBattlerId`.
These are turn-local damage records. It is not inferred from missing current HP.
Passive HP updates (including recoil/residual loss), Pain Split and damage to
Substitute do not populate qualifying records. The app has no source/turn damage
history, so it displays both hypotheses rather than guessing from HP or status.

Pursuit's intercept script uses normal `critcalc`, `damagecalc`, `typecalc` and
damage adjustment; critical and screen rules remain intact. Its intercept path
has no ordinary accuracy check, but all previews already condition on a connected
hit. Cartridge execution checks selected Pursuit/target, sleep/freeze, Truant and
the switcher's survival before interception. Those execution checks, switch
legality, switching method, turn order, replacement Pokémon and any fainting or
switch-out ability changes are NOT simulated. The boosted case assumes an
executed qualifying interception; it does not assert the selected Pokémon will
actually intercept a switch. No further damage-formula exception is applied.

The core returns `kind: 'conditional-damage'` with two `conditions`, each holding
its own existing result (including prevention or unavailable), without top-level
rolls, endpoints or condition probabilities. Ability enumeration returns a
separate outer conditional dimension: each case has its own complete `scenarios`
and `groups`. Both cases are calculated once per pinned ability pair; grouping
remains within a condition and compares complete outcomes, never overlapping
ranges. Identical blocked/immune cases remain separate condition sections.

The existing popup's Power field shows both effective powers. Existing compact
label typography introduces each condition, with percentage above HP damage and
ability labels nested underneath when necessary. Existing messages, scrolling,
tap/Escape dismissal and layout are preserved; no controls or probabilities are
added. The dynamic resolver, conventional eligibility allowlist, legacy damage
helpers and all unrelated result contracts remain unchanged. No Doubles mechanics,
streak moves, volatile-target interactions or further Step6I mechanics are added.

References: [Cmd_damagecalc, Cmd_doubledamagedealtifdamaged, Cmd_datahpupdate and Cmd_jumpifnopursuitswitchdmg](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
and [BattleScript_EffectRevenge, BattleScript_ActionSwitch and BattleScript_PursuitDmgOnSwitchOut](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s).

## Step 6I-2 implementation follow-up

Rollout (Rock/Physical), Ice Ball (Ice/Special) and Fury Cutter (Bug/Physical)
now use the existing ordered conditional-result architecture. Each entry is the
damage from ONE successful attack at that stage, not cumulative damage across
turns. No stage probabilities, turn history or assumption of the active stage
is introduced. Unrelated conventional, deterministic, aggregate and Step6I-1
conditional contracts remain unchanged.

Emerald's `Cmd_rolloutdamagecalculation` starts dynamic power at30, doubles it
according to the five-turn counter, then doubles it again if the Defense Curl
status bit is set. Both Rollout and Ice Ball use this command. Thus normal
powers are30/60/120/240/480; Defense Curl powers are60/120/240/480/960. These are
true dynamic base powers BEFORE the damage formula, unlike Pursuit/Revenge's
post-+2 multiplier. Every case is recalculated from its own power before stat
division, burn, screens, +2, critical, STAB, types and random truncation. For
Lv50/equal100 stats/no STAB, powers30/60/480/960 give base15/28/213/424, not
rounded first-hit multiples. Defense Curl's ordinary Defense stage change is
not simulated or added to existing Battle Conditions stages.

`Cmd_furycuttercalc` increments its successful-use counter to a maximum of5,
sets dynamic power10 and doubles once for each preceding stage. Five stages
are therefore10/20/40/80/160, with160 persisting at the cap. The final popup label
is “HIT 5+”. Misses/no-effect and interrupted sequences can reset cartridge
progression, but this preview does not simulate resets, accuracy, PP, locking,
switching, incoming attacks or state changes between turns.

Rollout/Ice Ball expose ten ordered cases: each numbered hit followed by its
clearly labeled Defense Curl alternative. Fury Cutter exposes five cases.
Each case retains all16 conventional rolls or its existing blocked, unsupported
or unavailable result. Duplicate-power cases remain distinct hypotheses. The
shared ability resolver calculates all cases once per pinned ability pair and
groups equivalent full outcomes only WITHIN each case; it never combines
stages or selects an uncertain ability. Rock/Ice/Bug have no ordinary Gen III
type-chart immunity; Wonder Guard prevention is preserved where applicable.

The narrow internal conditional dispatch accepts only these canonical moves.
The base formula additionally admits verified consecutive-use powers480/960
for Rollout/Ice Ball only; ordinary effect eligibility and its255-power guard
remain unchanged. No general high-power escape or extra conditional move is
enabled. Swarm and other existing abilities/items retain their existing operand
ordering. Screens and critical rules apply separately to every stage.

The popup reuses Step6I-1's compact condition labels and existing scrollable
panel, showing percentage above HP damage for every case. Its Power field uses
compact normal/Curl ranges (`30–480 / 60–960`), or `10–160` for Fury Cutter;
every individual stage below shows its exact power. No controls, CSS redesign,
history tracking or new abilities are added. Current stats/status/HP/items are
held constant across hypothetical stages. Existing screen/Doubles, Forecast,
ability and multi-hit limitations are preserved; no new Doubles mechanics or
KO probabilities are implemented.

References: [Cmd_rolloutdamagecalculation and Cmd_furycuttercalc](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
[Rollout/Ice Ball and Fury Cutter scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s),
and [canonical move data](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h).

## Step 6I-3 implementation follow-up

Magnitude (Ground/Physical) now has seven ordered results in the existing
conditional-damage model. Emerald's `Cmd_magnitudedamagecalculation` selects
thresholds5/15/35/65/85/95 from a0–99 roll, yielding this selection table:

| Magnitude | Base power | Selection chance |
| --- | ---: | ---: |
| 4 | 10 | 5% |
| 5 | 30 | 10% |
| 6 | 50 | 20% |
| 7 | 70 | 30% |
| 8 | 90 | 20% |
| 9 | 110 | 10% |
| 10 | 150 | 5% |

Each case retains its `level`, `power`, matching `formulaPower`, multiplier1,
and a separate `probability: {numerator, denominator: 100}`. Integer selection
weights sum to100; they are not folded into, or used to scale, the16 damage
rolls. No weighted overall range/distribution or KO probability is introduced.
All earlier nonrandom conditions continue to omit probabilities.

Every strength is independently calculated with its actual dynamic base power
before the ordinary Gen III formula, preserving type-based Physical stats,
integer divisions, abilities/items, burn/Guts, stages, screens, criticals, STAB,
effectiveness and random damage. At Lv50/equal100 stats/no STAB, the seven base
results are6/15/24/32/41/50/68. Scaling the rounded first result is incorrect.
Flying/Levitate immunity and Wonder Guard prevention retain their distinct
existing result contracts; unavailable and unsupported cases remain explicit.

The ability resolver needs no new path: each pinned pair calculates all seven
strengths once and groups complete outcomes independently WITHIN each level.
Equal damage endpoints, identical immunity results or overlapping strength
ranges never merge Magnitude levels. Selection metadata is preserved on each
outer case, independently of ability uncertainty.

The popup reuses existing conditional sections, ordered Magnitude4 through10.
Each compact label shows level, exact power and chance, e.g.
`MAGNITUDE 7 · 70 POWER · 30%`; damage percentage stays above HP damage.
The existing Power field shows `10–150`. Existing typography, scrolling,
tap/Escape dismissal and ability labels are retained; no controls or CSS
redesign are added. The ordinary eligibility gate and legacy helpers remain
unchanged; only canonical Magnitude is added to conditional dispatch.

Magnitude's Dig/underground bonus, additional field participants, Doubles spread
damage, battle-history simulation, Psywave, Present and further conditional
moves remain outside scope. Existing weather, screen, ability and multi-hit
limitations are preserved. These are connected-hit results conditional on the
selected strength, not an accuracy, PRNG-state or turn-outcome simulator.

References: [Cmd_magnitudedamagecalculation](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
and [Magnitude script](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s).

## Step 6J-1 implementation follow-up

Psywave now uses the existing direct-special-damage validation/immunity path,
then returns a separate `kind: 'level-damage'` result. Its11 equally likely
entries are `floor(level * (50 + 10r) / 100)` for integer r0..10.
Finalization Step 5 removed the earlier artificial minimum-one floor. Emerald
rejection-samples values0..15 until at most10, so these are not conventional
85–100% rolls. The result retains all11 `rolls`, including duplicates, exact
`distribution` counts with denominator `totalOutcomes: 11`, and endpoints.
Level50 gives25/30/35/40/45/50/55/60/65/70/75; level60 gives30..90 in steps6;
level100 gives50..150 in steps10. The actual attacking level is used in either
direction. No Attack/Defense, STAB, resistance/weakness damage scaling, critical,
weather, screens or item damage modifiers enter the formula.

Dark immunity and applicable Wonder Guard prevention still apply, matching the
script's preliminary `typecalc`; Psywave can pass Wonder Guard against a Psychic
weakness without scaling its HP amount. Fainted/missing inputs and existing
Trace boundaries retain their direct-special-result behavior. The formatter
shows one percentage/HP range plus “11 possible level-based damage rolls”,
never11 cards. Grouping compares the full11-entry distribution and keeps this
kind distinct from conventional, deterministic and aggregate outcomes.

**Cartridge boundary (corrected in finalization Step 5):** the earlier requested
minimum-one policy has been removed. `Cmd_psywavedamageeffect` uses integer
division; `Cmd_adjustsetdamage` and `Cmd_datahpupdate` do not raise zero to one.
Level 1 therefore produces five zero rolls and six one rolls. The result validator
accepts zero while retaining all eleven outcomes and exact duplicate frequencies.
Levels 2–100, including all ordinary Frontier levels, are unchanged.

Present's damaging branches are independent Normal/Physical dynamic powers
40/80/120. Emerald's low-byte thresholds102/178/204 imply exact unconditional
weights102/256,76/256,26/256, with52/256 reserved for healing. The popup displays
39.84375%,29.6875%,10.15625% and a healing note at20.3125%; these are the exact
cartridge fractions behind the usual approximate40/30/10/20 description. Damage
weights are not renormalized after excluding healing and are not combined with
the16 conditional damage rolls.

The Present script checks types first, selects dynamic power, then jumps to
the ordinary critical/base damage/type/random commands for damaging outcomes.
The Gold/Silver type-index/Attack5-or10 formula bug does NOT apply in Emerald.
Existing stats, stages, STAB, types, burn/Guts, screens, criticals, abilities and
items therefore use the normal Gen III ordering at each selected power.
Ghost immunity and Wonder Guard prevention remain distinct from unavailable
inputs. Ability uncertainty is enumerated/grouped independently within each
power, and the healing possibility remains informational even when a damage
branch is blocked. It is never represented as zero damage or a fourth attack;
neither Pokémon's HP is changed and healing success/failure is not simulated.

The popup uses existing conditional labels, notes, typography, scrolling and
dismissal. No new controls, CSS redesign, Doubles mechanics or additional moves
are enabled. Ordinary eligibility and all prior damage contracts remain intact.
Accuracy/turn outcomes, Focus Band/Endure execution, Substitute tracking, copied
ability state, healing and prior documented unsupported boundaries remain outside
this connected-hit preview. Counter/Mirror Coat, Bide, OHKO moves, delayed attacks,
Beat Up and Step6J-2 are not implemented.

References: [Cmd_psywavedamageeffect, Cmd_adjustsetdamage and Cmd_presentdamagecalculation](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c),
[Psywave/Present scripts and ordinary damage commands](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s),
and [Emerald base formula](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c).
