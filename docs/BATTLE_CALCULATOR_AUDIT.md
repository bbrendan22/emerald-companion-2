> Historical calculator record. The old preview/KO system was retired; its remaining source dependencies were removed in [Pass 2](BATTLE_CLEANUP_PASS_2.md). See [current Battle architecture](BATTLE_ARCHITECTURE.md) for the active implementation and recovery location.

# Battle Calculator Accuracy Audit

Date: 2026-10-17. Scope: Emerald Companion 2.0, Battle Tower Singles, current working tree.

Investigation only. No calculation, UI, data, or existing test changes were made. Legacy 1.0 was read only. This report is the only permanent file created or modified for this audit. Findings are recommendations, not authorization to implement them.

## Executive assessment

The ordinary Gen 3 damage formula is substantially sound. The recent Surf/Focus Band and Ice Beam/repeated-use fixes behave correctly within their supported assumptions. However, weather-dependent typing, modifier order, Speed highlighting, and unmodeled transitions can still produce incorrect or misleading battle advice.

| Severity | Count | Confirmed bugs | Known limitations | Suspected issues |
| --- | ---: | ---: | ---: | ---: |
| Critical | 0 | 0 | 0 | 0 |
| High | 6 | 4 | 2 | 0 |
| Medium | 6 | 2 | 4 | 0 |
| Low | 3 | 2 | 1 | 0 |
| Total | 15 | 8 | 7 | 0 |

“Confirmed bug” means a reproducible calculation/display/documentation mismatch. “Known limitation” means a reproducible boundary or assumption of the present model, rather than incorrect arithmetic under that assumption. All findings below have confirmed confidence; uncertainty about exhaustive cartridge parity is listed separately. Severity measures practical impact, not whether a feature was previously approved. In particular, stage-only display values, manual conditions, and compact conditional KO summaries were deliberate design choices; their consequences should be reviewed before changing those contracts.

The five highest-priority topics are Forecast typing (H01), recovery in repeated-use estimates (H02), Speed highlighting (H03), Weather Ball arithmetic (H04), and dual-type rounding order (H05).

## Method and independent references

The review traced imported records and Frontier sets through adapters, condition projection, the Gen 3 engine, `damagePreview.js`, and `BattleDamageResults.jsx`. It also reviewed `BattleMatchupShell`, stat/Speed/effectiveness presentation, condition reducers, Rules, retaliation, existing tests, and the legacy utilities.

Primary references, fetched read-only on the audit date:

- [Emerald pokemon.c](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c): `CalculateBaseDamage`, stat generation, nature/stage tables, Frontier EV distribution, and Emerald Deoxys stat override.
- [Emerald battle_script_commands.c](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c): type processing, random rolls, Focus Band, Weather Ball, Psywave, fixed damage, and variable-power handling.
- [Emerald battle_main.c](https://github.com/pret/pokeemerald/blob/master/src/battle_main.c): ordered type-effectiveness table and `GetWhoStrikesFirst`.
- [Emerald battle_util.c](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c): Forecast, ability activation, recovery items, and field effects.
- [Emerald battle scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s): multi-hit execution, Super Fang, Counter/Mirror Coat, Facade, SmellingSalt, and Brick Break.
- [Frontier sets](https://github.com/pret/pokeemerald/blob/master/src/data/battle_frontier/battle_frontier_mons.h), [trainers](https://github.com/pret/pokeemerald/blob/master/src/data/battle_frontier/battle_frontier_trainers.h), [trainer pools](https://github.com/pret/pokeemerald/blob/master/src/data/battle_frontier/battle_frontier_trainer_mons.h), [Tower rules](https://github.com/pret/pokeemerald/blob/master/src/battle_tower.c), and [Brain data/generation](https://github.com/pret/pokeemerald/blob/master/src/frontier_util.c).
- [Move records](https://github.com/pret/pokeemerald/blob/master/src/data/battle_moves.h) and [species records](https://github.com/pret/pokeemerald/blob/master/src/data/pokemon/species_info.h).

The references are the unmodified Emerald decompilation, not a modern-generation calculator or an expansion hack. Links track `master`; this is a dated inspection, not a pinned-ROM certification.

Independent diagnostics were kept in `/private/tmp`, including `emerald-audit-diagnostics.mjs`, `emerald-audit-cases.mjs`, `audit-modifier-check.mjs`, and `audit-independent-ko.py`. Their important fixtures and results are recorded here so the report does not depend on temporary files surviving.

- An independently written arithmetic transcription checked 432 combinations: Normal/Water attacks; none/sun/rain; critical on/off; burn on/off; screens on/off; attacking and defending stages -2/0/+2. All 16 rolls matched in every case. This verifies that subset, not every move or modifier interaction.
- Independent enumeration of 16×16 damage pairs exposed recovery-item differences in H02. It did not call the app engine to generate expected probabilities.
- Cartridge-ordered type-table processing exposed H05; a separate Weather Ball calculation exposed H04.
- All 882 ordinary Frontier sets were compared for species, moves, item labels, nature, and EV allocations. Nidoran gender notation was normalized; it was not a data discrepancy.
- All 300 trainer IV tiers matched cartridge thresholds. All 300 trainer pools matched after expanding source macros with the C preprocessor.
- Move power, accuracy, PP, priority, effect, and effect chance matched for the 354 supported move records. This checks records, not implementation of every effect.
- Ordinary set ability lists matched the local species reference. Species base-stat comparisons matched after accounting for Nidoran identities and Emerald's explicit Speed-form Deoxys override. Ability behavior itself remains subject to the limitations below.
- All six Anabel sets were inspected against Tower Brain data: moves, items, natures, IVs (Silver 24, Gold 31), and EV order matched.
- Legacy `battleDamage.js` differs from 2.0 only in imports/weight lookup and a migration comment; the central arithmetic and inherited shortcomings are the same. Legacy agreement is not independent verification.

## Critical findings

None confirmed. This is not a guarantee that no undiscovered Critical defect exists.

## High findings

### H01 — Forecast does not update Castform's battle types

- **Severity / classification / confidence:** High; confirmed bug; confirmed.
- **Affected:** `src/battle/battleDamage.js::calculateBattleDamage`, `pokemonAdapter.js`, `frontierAdapter.js`, and `BattleMatchupShell.jsx::PokemonCard`.
- **Description:** All battle types remain their species-reference values. There is no Forecast projection when weather changes. This affects both STAB and incoming effectiveness, beyond artwork/form presentation.
- **Example:** Castform 2 in rain using Water Pulse; Castform defending against a Grass attack in rain.
- **Expected:** With active Forecast and effective rain, Castform is Water-type; its Water moves get STAB and Grass is super effective. Cloud Nine/Air Lock must suppress the form/type change appropriately.
- **Actual:** Castform remains Normal; Water STAB is absent, and Grass is treated as neutral. Its card also remains Normal-type.
- **Evidence / reproduction:** Adapt Castform 2, set `weather:'rain'`, and compare damage to an otherwise identical copy with `types:['WATER']`; the adapter/engine never replaces `types:['NORMAL']`. Cartridge reference: `CastformDataTypeChange` in `battle_util.c`. No manual type control compensates for this.
- **Suggested fix:** Project effective types per ability/weather scenario before STAB, immunity, and effectiveness calculations; share that projection with presentation. Add offensive/defensive Forecast and suppression fixtures.

### H02 — Recovery transitions are omitted from repeated-use KO estimates

- **Severity / classification / confidence:** High; known limitation with misleading real-battle implications; confirmed.
- **Affected:** `src/battle/damagePreview.js::koChancesByHits`; also multi-hit paths in `battleDamage.js` for effects that occur between strikes.
- **Description:** The state propagated between uses is only remaining HP. Recovery items, item consumption, residual damage, and intervening turns are not simulated. This is valid for a no-intervening-effects model, but not automatically a prediction of actual successive battle turns.
- **Example:** Level-50 controlled Strength fixture: Normal STAB, power 100, Attack/Defense 100, 130/130 target HP, rolls `58,59,60,60,61,62,62,63,64,64,65,66,66,67,68,69`.
- **Expected:** If a normal intervening turn is modeled, Leftovers restores 8 HP; Sitrus Berry restores 30 HP when triggered in Gen 3. Independent two-roll enumeration gives 0.390625% by two uses with Leftovers and 7.03125% with Sitrus Berry. The no-recovery answer is 28.125%.
- **Actual:** All three item cases receive 28.125%, displayed as 28.1% chance to 2HKO.
- **Evidence / reproduction:** Enumerate the 256 pairs, applying recovery after a surviving first hit, before comparing the second hit to remaining HP. In `koChancesByHits`, only `currentHp` changes; item/status/stages are reused unchanged. Recovery behavior is independently visible in `ItemBattleEffects` in `battle_util.c`.
- **Suggested fix:** Explicitly decide whether summaries model successful uses without intervening effects or actual turns. For actual-turn estimates, carry item consumption/recovery/residual state; otherwise suppress affected claims or provide a targeted conditional label. Do not silently treat the present values as recovery-aware.

### H03 — Matchup Speed highlighting can identify the slower Pokémon as faster

- **Severity / classification / confidence:** High; confirmed display bug relative to battle Speed; confirmed.
- **Affected:** `BattleMatchupShell.jsx`, `matchupPresentation.js::stagedMatchupStats/fasterSide`; compare `battleConditions.js::battleSpeedValues` and `setSpeedComparison.js::candidateIsFaster`.
- **Description:** Matchup compares stage-adjusted raw Speed, ignoring paralysis, Swift Swim/Chlorophyll, Macho Brace, and weather suppression. The Sets comparison uses the more complete helper, so the two tabs can disagree.
- **Example:** Player Speed 100, paralyzed, versus opponent Speed 90 at neutral stages.
- **Expected:** Effective Speeds are 25 and 90; opponent is faster. A rain Swift Swim case can reverse the result in the other direction.
- **Actual:** Player's displayed 100 is highlighted green. Independent calls to `battleSpeedValues` produce `[25]` and `[90]`, while `fasterSide` selects `player`.
- **Evidence / reproduction:** Apply paralysis in Battle Conditions. `playerDisplay`/`opponentDisplay` receive only stages; `fasterSide` compares those objects. Cartridge reference: `GetWhoStrikesFirst` in `battle_main.c`.
- **Suggested fix:** Preserve approved stage-only number/bar presentation if desired, but calculate the highlight from effective Speed scenarios. With uncertain abilities, avoid asserting one faster side unless the comparison is consistent across possibilities. Do not equate Speed alone with priority or Quick Claw turn order.

### H04 — Weather Ball doubles power instead of post-base damage

- **Severity / classification / confidence:** High; confirmed arithmetic bug; confirmed.
- **Affected:** `src/battle/battleConditions.js::weatherMove`, consumed by `battleDamage.js::calculateBattleDamage`.
- **Description:** Weather Ball is changed from power 50 to 100 before the base calculation. Emerald instead changes type and sets a ×2 damage multiplier after `CalculateBaseDamage`, including its +2. These are not rounding-equivalent.
- **Example:** Controlled level-50 fixture with Special Attack/Special Defense 100, no STAB, neutral target, rain, Weather Ball.
- **Expected:** Base at power 50: `floor(floor(100*50*22/100)/50)=22`; rain gives 33; +2 gives 35; ×2 gives 70. Range 59–70 HP.
- **Actual:** Power 100 gives 44; rain gives 66; +2 gives 68. Range 57–68 HP.
- **Evidence / reproduction:** Call the engine with a Normal-type attacker, `weather:'rain'`, and the stats above. This deliberately isolates the multiplier issue from H01. Cartridge reference: `Cmd_setweatherballtype` and `Cmd_damagecalc` in `battle_script_commands.c`.
- **Suggested fix:** Keep dynamic type separate from base power; apply the Gen 3 multiplier at its cartridge position. Include weather/screen/critical/low-damage combinations and avoid compensating for Forecast with a second erroneous adjustment.

### H05 — Dual-type modifiers use species order rather than cartridge table order

- **Severity / classification / confidence:** High; confirmed arithmetic bug; confirmed.
- **Affected:** `src/battle/battleDamage.js::calculateBattleDamage`, the loop over `defender.types`.
- **Description:** Flooring makes ×0.5 then ×2 different from ×2 then ×0.5 for odd damage. Emerald applies modifiers in `gTypeEffectiveness` table order, not the Pokémon's displayed type order.
- **Example:** Ice Beam from a level-50 Ice-type attacker with Special Attack 103, against Charizard with Special Defense 100 and current HP 67, no other modifiers.
- **Expected:** Base 45, STAB 67; the Ice table processes Flying ×2 before Fire ×0.5, preserving 67. Range 56–67 and a 6.25% OHKO chance at 67 current HP.
- **Actual:** Charizard's `['FIRE','FLYING']` order halves 67 to 33 and doubles it to 66. Range 56–66 and 0% OHKO.
- **Evidence / reproduction:** Use `battleMove('Ice Beam')` with the stated fixture. The independent source-table evaluator also found 44 discrepant species/type cases in a wider controlled scan; that is a fixture count, not 44 independently observed saved-game failures. Reference: `Cmd_typecalc` and `gTypeEffectiveness`.
- **Suggested fix:** Apply the Gen 3 ordered type table with per-step flooring. Keep product-only helpers for labels where order is irrelevant. Add odd-damage mixed-resistance/weakness threshold regressions.

### H06 — Triggered ability state is not represented

- **Severity / classification / confidence:** High; known limitation; confirmed.
- **Affected:** `conditionState.js`, `battleDamage.js`, and Battle Conditions controls.
- **Description:** Intimidate entry effects, activated Flash Fire, and copied Trace abilities have no automatic transition or explicit activation state. An ability's name alone is not sufficient to represent these mechanics.
- **Example:** A physical attack into newly entered Intimidate Gyarados at default stages; Houndoom's Flamethrower after absorbing Fire; Anabel Silver Alakazam after Trace copies an ability.
- **Expected:** Model the known activation, accept explicit state, or report the unsupported context. Intimidate can be represented manually by Attack -1, but the user must know to do so.
- **Actual:** Default Intimidate changes nothing; Flash Fire only supplies immunity, not its activated damage bonus; Trace remains the literal ability name.
- **Evidence / reproduction:** Inspect the supported modifiers in `calculateBattleDamage` and the condition state schema; no activation/copy flag exists. Compare switch-in/Trace handling and the Flash Fire resource flag in Emerald's source.
- **Suggested fix:** Add narrowly scoped activation/copy inputs or targeted unavailability/conditional results. Do not automatically apply Intimidate on every render or silently overwrite manual stages.

## Medium findings

### M01 — Super Fang incorrectly receives Focus Band protection

- **Severity / classification / confidence:** Medium; confirmed edge-case bug; confirmed.
- **Affected:** `src/battle/battleDamage.js::fixedBattleDamage`.
- **Description:** All fixed-damage effects go through the same Focus Band outcome helper, but Super Fang's cartridge script bypasses the Focus Band adjustment command.
- **Example:** Super Fang against a nonimmune target at 1 current HP holding Focus Band.
- **Expected:** Super Fang's minimum damage is 1; this path KOs on a connecting attack without a Focus Band check.
- **Actual:** Engine outcomes are 0 damage at 10% and 1 damage at 90%, producing 90% OHKO.
- **Evidence / reproduction:** Call `calculateBattleDamage(battleMove('Super Fang'), attacker, {...target,currentHp:1,item:'Focus Band'})`. Compare `BattleScript_EffectSuperFang` and `Cmd_damagetohalftargethp`: the script goes directly to the attack-animation path instead of `adjustsetdamage`.
- **Suggested fix:** Apply survival checks per move script rather than to every fixed effect. Preserve the correct checks for Night Shade/Seismic Toss/Dragon Rage/Psywave.

### M02 — Moves and popup metadata ignore effective weather type

- **Severity / classification / confidence:** Medium; confirmed display inconsistency; confirmed.
- **Affected:** `matchupPresentation.js::matchupEffectiveness/movePopupValues`, `BattleMatchupShell.jsx::Moves`, `BattleMoveDetails.jsx`.
- **Description:** Move-row effectiveness intentionally forces `weather:'none'`; popup metadata also starts from base type. The damage section does use projected conditions.
- **Example:** Weather Ball in rain against a Rock target.
- **Expected:** If the row describes the present matchup, Water type and super effectiveness should agree with the calculation. Alternatively clearly distinguish base reference information from effective information.
- **Actual:** Row/header retain Normal type; effectiveness is the Normal-versus-Rock value even while the engine calculates a Water attack. Hidden Power is dynamically resolved, making Weather Ball's static treatment particularly inconsistent.
- **Evidence / reproduction:** `matchupEffectiveness(WeatherBall, {...attacker,weather:'rain'}, target)` returns the base Normal type; the engine returns Water. The explicit `weather:'none'` is in the presentation helper.
- **Suggested fix:** Use the same effective move/type projection for current matchup labels, with safe uncertainty handling. No layout redesign is needed.

### M03 — “Guaranteed” KO results are conditional on a fixed critical setting and execution assumptions

- **Severity / classification / confidence:** Medium; known limitation/wording ambiguity; confirmed.
- **Affected:** `damagePreview.js::koChancesByHits/koSummary`, `BattleDamageResults.jsx`, shared Critical Hit condition.
- **Description:** Critical Hit on means every modeled use is critical; off means none is. Ordinary accuracy is intentionally excluded, and sleep/freeze/flinch/action denial are not generally execution probabilities. The compact summary does not repeat those assumptions.
- **Example:** A low-accuracy attack displaying Guaranteed 2HKO, or any 2HKO that becomes guaranteed only with Critical Hit enabled.
- **Expected:** Interpret these as conditional successful-use results, with the chosen critical scenario. They are not overall battle win chances or natural critical-rate estimates.
- **Actual:** The single word “Guaranteed” can be read more broadly than the model supports. The arithmetic itself follows the selected scenario.
- **Evidence / reproduction:** Change only ordinary accuracy: KO percentages stay the same. Enable Critical Hit: the same flag is retained across every DP step. Triple Kick separately labels its later accuracy checks.
- **Suggested fix:** Retain the agreed conditional model, but consider a concise accessible label/help description for this contract. Do not add accuracy or natural critical rates silently, and do not restore a bottom disclaimer without design approval.

### M04 — Many valid repeated-use calculations remain intentionally unavailable

- **Severity / classification / confidence:** Medium; known limitation; confirmed.
- **Affected:** `damagePreview.js::repeatSupported/noRepeat`.
- **Description:** Multi-hit/random-power attacks and almost all secondary-effect moves are excluded from repeated-use enumeration. The Ice Beam exception is safe for its currently modeled damage, but this is not general coverage of damaging moves.
- **Example:** Psychic when it cannot OHKO; Flamethrower; Double Kick; Magnitude.
- **Expected:** Either enumerate every relevant transition/distribution or return an explicit unavailable result, distinct from zero chance.
- **Actual:** Such moves can show “Multi-hit KO unavailable” even when a useful repeated-use estimate could be supported by a richer model. The current refusal is safer than fabricating probabilities.
- **Evidence / reproduction:** Psychic's effect chance fails `repeatSupported`; `hitRanges` and `outcomeRanges` also force rejection. Existing tests assert these boundaries. “Multi-hit” here ambiguously means repeated uses rather than several strikes in one move.
- **Suggested fix:** Expand one supported transition class at a time. Special Defense drops require branching; healing needs consumed-item state. Rename the unavailable label to distinguish repeated uses from multi-strike moves.

### M05 — Several unrepresented battle contexts receive ordinary damage rather than a targeted limitation

- **Severity / classification / confidence:** Medium; known limitation; confirmed.
- **Affected:** `battleDamage.js::calculateBattleDamage`, `damagePreview.js`, condition schema.
- **Description:** Context inputs such as Substitute, Endure, Foresight, Minimize, Charge, Water/Mud Sport, semi-invulnerability, and transformed types/species are absent. Some moves are explicitly unsupported, while other context-dependent bonuses are silently treated as absent.
- **Example:** Stomp into a Minimized target; an Electric attack after Charge; a lethal attack into Endure/Substitute; Gust against Fly.
- **Expected:** Use explicit context or clearly limit the result to the represented situation.
- **Actual:** Standard damage/KO results are returned without those context changes. A selected Pokémon at 0 HP is correctly rejected; this finding concerns other unsupported states, not fainted-state handling.
- **Evidence / reproduction:** Compare supported state fields and modifier branches against the corresponding cartridge scripts/field modifiers. There is no way to encode the listed contexts in the current Conditions controls.
- **Suggested fix:** Publish a supported-context contract and prioritize Frontier-relevant controls/targeted messages. Do not attempt to infer hidden turn history.

### M06 — Repeated-use summaries do not consider remaining PP

- **Severity / classification / confidence:** Medium; known limitation; confirmed.
- **Affected:** `damagePreview.js::koChancesByHits/koSummary`, imported move `currentPp`.
- **Description:** The DP can forecast two to five successful uses even when the imported move has fewer uses remaining. Pressure consumption is also absent.
- **Example:** A move at 1 current PP displaying a 2HKO or 3HKO; attacking Anabel's Pressure Pokémon with limited PP.
- **Expected:** For an executable sequence, cap uses by available PP and relevant consumption. For a hypothetical damage comparison, make that interpretation explicit.
- **Actual:** `currentPp` never restricts enumeration. A controlled 58–69 damage/130 HP fixture gives the same 28.1% 2HKO with `currentPp:1` as with full PP.
- **Evidence / reproduction:** Pass otherwise identical moves with `currentPp:1` and full PP to `damagePreview`; results match. The existing UI correctly displays imported PP separately.
- **Suggested fix:** Decide whether KO summary is hypothetical or immediately executable; cap/qualify only the latter. Preserve current PP data and do not deduct PP from viewing a popup.

## Low findings

### L01 — Earliest-possible KO is not always the most useful practical summary

- **Severity / classification / confidence:** Low; known UX limitation, not a probability bug; confirmed.
- **Affected:** `damagePreview.js::koSummary`.
- **Description:** The first positive chance wins even when a later count has a far more useful chance. This follows the current explicit product requirement.
- **Example:** A very small threshold-crossing 2HKO chance wins over a guaranteed 3HKO. Focus Band at one HP gives 90% OHKO, so 99% by two and 99.9% by three are intentionally hidden.
- **Expected:** Under the approved contract, retain the earliest result. A different practical-summary policy would require a design decision, not an arithmetic fix.
- **Actual:** Only the earliest positive result is displayed, including tiny probabilities rendered as `<0.1%`.
- **Evidence / reproduction:** `findIndex(chance > 1e-9)` in `koSummary`; actual roll-threshold fixtures in the existing tests exercise the behavior.
- **Suggested fix:** Keep the compact default. Consider optional detail or an agreed probability threshold only if the user wants to revise the policy. Do not silently replace it with the first guaranteed count.

### L02 — Calculator documentation describes obsolete UI and KO behavior

- **Severity / classification / confidence:** Low; confirmed documentation bug; confirmed.
- **Affected:** `docs/DAMAGE_CALCULATOR.md`.
- **Description:** The document still describes only two-use estimates, a KO-versus-OHKO label switch at reduced HP, and assumptions stated in the UI.
- **Example:** Current code supports up to five uses and always labels the one-use summary OHKO; the general bottom disclaimer has been removed as requested.
- **Expected:** Documentation should describe the current implementation and its actual limitations.
- **Actual:** A maintainer can mistake historical descriptions for present guarantees.
- **Evidence / reproduction:** Compare its “KO probabilities and assumptions” section with `MAX_KO_HITS`, `koSummary`, and `BattleDamageResults.jsx`.
- **Suggested fix:** Update that document after audit review. It was intentionally not modified during this documentation-only-file-limited audit.

### L03 — Embedded precomputed stat tables contain values different from runtime stats

- **Severity / classification / confidence:** Low; confirmed dormant data inconsistency; confirmed.
- **Affected:** `src/battle/data/frontierPokemon.js`, `frontierBrains.js` precomputed `level50Stats/level100Stats`; compare `frontierAdapter.js::frontierSetStats`.
- **Description:** Some copied stat tables differ from the cartridge-style runtime formula, even though current Matchup uses the formula and not these stale fields.
- **Example:** Graveler 1's copied Level-50 Attack is 150; runtime is 149: `floor((floor((2*95+31+floor(170/4))*50/100)+5)*1.1)=149`. Anabel Gold Raikou's copied Level-50 SpA is 149; runtime gives 148 for its actual EV allocation.
- **Expected:** A single authoritative calculation, or accurately generated cached tables.
- **Actual:** Runtime calculation is correct for these examples; dormant tables disagree. This is not evidence of wrong displayed Graveler HP or wrong active Matchup Attack.
- **Evidence / reproduction:** Compare the source data fields with `toTowerOpponent` results; `frontierSetStats` uses base stats/IVs/EVs/nature directly.
- **Suggested fix:** Generate or remove obsolete tables in a future data cleanup, after verifying consumers. Do not change the runtime formula to match the copied table.

## Mechanics checked and appearing correct

These conclusions apply to the reviewed paths and fixtures, not every conceivable interaction.

### Ordinary damage and modifiers

- Gen 3 physical/special split is by type, including physical Ghost and special Dark. Weather Ball switches category with its effective type, although its multiplier and Forecast have the findings above.
- The ordinary integer formula, +2 placement, STAB, random 85–100 integer percentage rolls, and ordinary single-type effectiveness matched independently derived examples.
- Burn, Guts override, normal singles Reflect/Light Screen, critical ×2, critical stage bypass, critical screen bypass, and Shell Armor/Battle Armor handling agree with the inspected source paths. The 432-combination independent check supports the core ordering.
- Choice Band, Huge/Pure Power, Hustle, Thick Fat, Marvel Scale, Light Ball's Gen 3 special-only behavior, Thick Club, Deep Sea items, Metal Powder, type boosters, and Sea Incense were reviewed against the source modifier order. Soul Dew correctly does not boost Frontier battles. Not every numerical combination of these items was independently enumerated.
- Sun/rain modifiers and weather suppression are handled in ordinary damage. SolarBeam uses the actual reference spelling and applies the adverse-weather reduction. No Gen 4 sandstorm Rock SpD bonus was incorrectly added.
- Starter/Swarm low-HP thresholds, Hidden Power bit ordering/type/power, Low Kick weight thresholds, friendship-based power, Flail/Reversal brackets, and Eruption/Water Spout HP scaling were checked structurally. Independent cartridge execution of every boundary was not performed.
- Facade and SmellingSalt double calculated damage at the appropriate pre-STAB stage; Brick Break's own hit ignores screens. The calculator does not mutate manual screen state, consistent with its informational role.

### Special moves and probabilities

- Fixed-damage attacks do not acquire ordinary STAB/weather/type scaling; relevant immunity paths remain separate. Sturdy does not protect against ordinary lethal attacks. OHKO moves explicitly remain unsupported.
- Psywave's eleven outcomes match Emerald's rejection-sampling/scaling path, rather than a modern continuous distribution.
- Ordinary 2–5-strike count weights are 3/8, 3/8, 1/8, 1/8; damage is rerolled per strike. Present's 102/256, 76/256, 26/256 damage branches and 52/256 healing branch match the source. Magnitude weights/powers match the source.
- The critical toggle intentionally applies the selected critical scenario to every strike/use; it is not a natural critical probability model (M03).
- The one-use KO chance sums actual damage-outcome weights against **current** HP. Damage percentages use **maximum** HP. The two values are deliberately different denominators.
- Supported 1–5-use DP carries absorbed KO probability forward, enumerates surviving remaining-HP states, and sums probability **by** N successful uses. It does not merely add minimum/maximum damage or compute only the Nth-use death probability.
- Focus Band is genuinely present on Graveler 1. Surf at the reviewed Swampert SpA 95 fixture gives 244–288 HP, 161.6–190.7% of max HP, and 90% OHKO. Removing Focus Band gives 100%; Rock Head versus Sturdy does not change either result. Accuracy is not the cause of 90%.
- Ice Beam on that fixture gives 81–96 HP, 53.6–63.6%, 0% OHKO, 90% by two uses, and 99% by three. The first hit cannot be lethal; only the lethal later hit gets the relevant fresh Focus Band survival check. With a lethal first hit, repeated-use probabilities are 90%, 99%, 99.9%, etc.
- The single-move multi-strike Focus Band path correctly differs from repeated turns: its activation can protect the remaining strikes in that move, including after a nonlethal early strike. For fixed 10 damage twice into 15 HP, the modeled KO chance is 81%, matching two unprotected checks, rather than a flat 90%.
- Ordinary move accuracy is not mixed into KO odds. Triple Kick intentionally includes later accuracy checks after conditioning on its first strike landing, and labels that exception. Its modeled scope does not include every field/context effect in M05.
- Probability formatting does not round 99.99% to a “Guaranteed” label. Zero chance within five and unavailable repeat calculations have distinct code paths. False Swipe does not acquire a lethal repeated-use probability.
- Ability scenarios remain separate when distributions differ; identical scenarios are combined without averaging unknown abilities into an invented probability. No concrete incorrect combination was found in the supported, static-state paths.
- Counter/Mirror Coat structurally distinguish incoming physical/special damage and survival, including Gen 3's Hidden Power Counter classification. Multi-strike retaliation and unsupported incoming contexts have explicit limitations. This is a preview by candidate incoming move, not a simulator of the opponent's move choice or a guaranteed opportunity to retaliate.

### Data, state, and UI consistency

- Frontier data and trainer/pool checks are recorded in Method above. Selected trainer IVs, no-trainer assumed 31 IVs, and Brain-specific IVs are separated. Unsupported facilities are not silently calculated as Tower modes.
- Nature/EV floor order, Shedinja HP, and Level-50/manual Open-Level scaling are consistent with the formula. The manual 60–100 Open Level control is an approved product choice; the cartridge's automatic maximum-party-level rule is not currently automatic. Imported player levels/stats are retained, as the Rules text says.
- Party Pokémon use recorded save stats; boxed Pokémon use calculated stats from their actual identity/IV/EV/nature. No sample Pokémon or staged-display object replaces their damage inputs.
- `stagedMatchupStats` is display-only. The engine receives original `.stats` and separate `.stages`, applied once. HP is not stage-adjusted; stat bars remain raw by design.
- Weather/screens/status/current HP project into popup inputs on render; the selected move is a side/slot reference, not a stale Pokémon snapshot.
- Existing browser verification passed both attack directions, live HP/stage/weather/status/screen/critical/active-Pokémon/level changes in the same modal, ability splits/deduplication, and 320/375/430px layouts. It checks UI-to-engine agreement, not independent correctness of the engine.
- HP/status persist by Pokémon identity; stages/screens persist by side as deliberately approved. Changing trainers, teams, selections, tabs, or rules does not reset conditions. Reusing an opponent set reuses its manual conditions; this is the agreed persistence contract, not an unintended reset bug.
- Manual HP is clamped at the current maximum without overwriting a retained larger manual entry after a level reduction. Reset clears manual overrides and restores imported initial HP (which may be injured), full opponent HP, neutral stages/status/screens/weather/critical. It is not a “heal imported save Pokémon” operation.
- No stale-current-HP cause was found for the reported Graveler cases. Viewing results does not change HP, PP, imported records, or saved teams.

## Existing-test limitations and missing regressions

Passing tests are not proof of cartridge accuracy. In particular:

1. Most damage tests preserve literal legacy fixtures; browser expected ranges are calculated with the same engine. Both can agree with the same inherited mistake.
2. The weather tests cover ordinary sun/rain but do not independently catch Weather Ball's post-base multiplier or Forecast STAB/defensive typing.
3. Type-chart tests mostly check products, immunities, or even damage; they miss odd-value dual-type ordering and the resulting OHKO threshold flip.
4. Matchup tests verify stage-only Speed highlighting, not paralysis/rain/Macho Brace consistency with Sets.
5. KO tests independently cover several ordinary convolutions and Focus Band, but not recovery/consumption, PP, or richer turn transitions.
6. Fixed-damage tests do not cover Super Fang bypassing Focus Band at one HP.
7. Missing targeted coverage includes effective weather move labels, activated abilities, copied abilities, action-denial assumptions, manual-context limitations, and threshold-triggered item state.
8. Tests that deliberately assert unsupported secondary/multi-strike repeated-use cases establish a boundary; they do not establish that the underlying move cannot ever be modeled.

No existing tests were modified and no permanent diagnostic tests were added during this audit.

## Verification and areas not independently certified

- `npm test`: **214 passed**, 0 failed.
- `npm run build`: passed, with the existing large-chunk warning.
- Existing `test/battleDamagePopup.browser.mjs`: passed against the local server, including 320/375/430px widths and live state changes.
- No application behavior was changed. Only this report was written permanently; temporary references/scripts/logs remain outside the project.

Independent reference access succeeded. However, this audit did **not** run a cartridge/emulator differential harness or a second established calculator across every matchup. It did not exhaustively certify every species ability implementation, all weights, every rare move/volatile interaction, exact PRNG correlations/modulo bias, transformed Pokémon, or all Counter/Mirror Coat combinations. Ordinary statistical calculations use the conventional independent uniform roll model. The source-data comparisons do not prove every generated opponent personality/ability or live trainer-selection situation. Actual iPhone Safari was not independently exercised; automated mobile layout checks used Chrome. No fabricated claim of exhaustive independent verification is made.

The next step is review and prioritization of the findings. Corrections require approval and should be staged separately from this audit.
