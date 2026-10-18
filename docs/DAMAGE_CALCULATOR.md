> Historical calculator record. The old preview/KO system was retired; its remaining source dependencies were removed in [Pass 2](BATTLE_CLEANUP_PASS_2.md). See [current Battle architecture](BATTLE_ARCHITECTURE.md) for the active implementation and recovery location.

# Battle damage calculator

## Inputs and live state

`BattleMatchupShell` stores the selected side and occupied move slot. Each render resolves the current Pokémon, target, and move, then projects Battle Conditions through `conditionedBattlePokemon`. Original `.stats` and separate `.stages` reach the engine; display-adjusted stats never replace engine inputs. Opening a calculation does not consume PP, deduct HP, or write imported/save-team data.

The popup updates in place for weather, HP, status, stage, screen, critical, active-selection, and opponent-level changes. Losing the move owner or leaving Matchup closes it. A missing target keeps move information available with a selection message. The popup closes by tapping outside or Escape; it has no close-X button.

HP/status remain attached to stable Pokémon identities. Stages/screens remain on their respective battle side. Those values persist through navigation, team/trainer changes, and temporary hiding. Reset clears manual conditions and restores imported initial player HP and full opponent HP; it does not modify or heal the underlying save.

## Calculation and effective typing

The Gen 3 foundation uses type-based physical/special categories, integer arithmetic, STAB, 16 ordinary random percentages (85–100), weather, selected critical scenario, burn, stages, screens, held items, and supported abilities. It is an informational calculator, not an automatic battle simulator or exhaustive ROM implementation.

Battle-only type/weather projection is shared by the engine and Matchup presentation:

- Forecast Castform is Fire in sun, Water in rain, Ice in hail, and Normal otherwise. Forecast must be active; Cloud Nine/Air Lock suppress weather-dependent typing. Species-reference and imported types are never overwritten.
- Forecast affects outgoing STAB, incoming effectiveness, and the card's type icons. If uncertain abilities produce alternative forms, the card retains those possibilities, with an explanatory title rather than treating them as one guaranteed form.
- Weather Ball changes type with effective weather. Its conventional effective-power metadata is 100, while calculation retains base power 50 and applies the ×2 multiplier after base damage (+2 and selected critical multiplier), before STAB/type/random modifiers. This matches Emerald's command ordering. Suppressed weather leaves it Normal without the multiplier.
- Type modifiers apply in cartridge type-table order, flooring each step. They are not multiplied together or applied in species display order. Immunity still produces zero damage.
- Weather Ball's move-row icon, effectiveness value, and popup icon derive from current conditions and relevant ability suppression. Uncertain outcomes retain split results rather than choosing an ability. Where no single type is certain, the base icon remains a fallback and the effectiveness/result labels retain the uncertainty.

Fixed damage, Hidden Power, HP/friendship/weight-dependent power, Psywave, multi-strike moves, Triple Kick, Magnitude, Present, and retaliation previews reuse their dedicated paths. Super Fang bypasses Focus Band in accordance with its cartridge script; applicable ordinary and other fixed-damage paths retain Focus Band survival handling.

## Displayed stats and effective Speed

Stat numbers show stage-adjusted values; HP is unaffected. Bars always represent original calculated stats. Paralysis, weather abilities, and items do not alter these approved numerical/bar displays.

The green Speed highlight is calculated separately using `battleSpeedValues`: stages, paralysis, Swift Swim, Chlorophyll, Macho Brace, and weather suppression are considered. Each possible ability pair is evaluated; a highlight appears only if all scenarios agree on the faster side, with no tied scenario. This handles correlated weather suppression without mixing incompatible Speed outcomes. The highlight is a Speed comparison, not a guarantee of acting first through priority, Quick Claw, or action prevention.

## Damage and KO summaries

Normal damage results use the compact format:

`81–96 HP · 53.6–63.6% of max HP`

The HP range is white; the percentage portion is muted. No attacker/defender name line or current/maximum HP totals appear in this section. Necessary ability-specific results and unsupported-mechanic messages remain. Bottom disclaimer paragraphs and the separate Focus Band explanation line are not shown.

For supported moves, KO estimates enumerate up to **five successful uses** and display only the **earliest possible KO**:

- A positive one-use chance produces an OHKO summary.
- Otherwise the first positive 2HKO, 3HKO, 4HKO, or 5HKO result is shown.
- Known remaining PP can shorten the five-use horizon. Pressure costs two PP per use where known; one positive PP still permits the final use. No PP is deducted from the imported record. Unknown remaining PP is marked `· PP unknown` for hypothetical repeated-use summaries.
- Supported zero chance within the available horizon, insufficient remaining PP, and unavailable repeated-use calculations are distinct.
- Probabilities are cumulative chances of KO **by** the stated use count, not solely on the final use. Earlier KO branches remain absorbed and are not counted twice.

The bounded dynamic program in `koProbability.js` enumerates weighted outcomes, reusing the existing engine for each surviving HP/status/Special Defense/item state. It carries both battlers' known residual HP changes without choosing opponent actions. It does not infer odds from endpoints or assume identical rolls. Ability pairs are pinned and are combined only when their damage distributions **and complete supported KO estimates/PP horizons** match.

For supported sequences, end-of-turn timing is Gen 3: damaging weather, then each battler's Rain Dish, item recovery, and poison/burn. Leftovers restores floor(max HP/16), with a minimum of one HP. Sitrus restores **30 HP**, Oran 10, and Berry Juice 20 at the half-HP threshold and is consumed only in the hypothetical sequence. These HP items activate in end-of-turn processing, not between strikes. Status-curing berries use their move-end timing and are consumed when triggered.

Regular poison and Gen 3 burn deal floor(max HP/8), minimum one. Sand/hail deal floor(max HP/16), minimum one; Rock/Ground/Steel and Sand Veil protect from sand, Ice protects from hail, and effective weather suppression/Forecast types are respected. Rain Dish and current held Leftovers can combine. Fainted Pokémon do not recover. Unknown existing Toxic counters are not guessed.

Direct knockout summaries retain OHKO/2HKO/etc. If an earliest result includes a terminal residual knockout, it instead says `KO by turn N`: one successful use per modeled turn, including that turn's end effects. This prevents an attack that leaves HP remaining from being mislabeled a direct OHKO. Existing status/HP remains manual and unchanged. A known attacker residual faint prevents later uses; ambiguous simultaneous residual faint order is unavailable. Guarantees require that no surviving or failed probability path remains, rather than merely rounding a near-100% float.

**Current HP** determines the lethal threshold; **maximum HP** determines damage percentages. Ordinary move accuracy is excluded: odds are conditional on successful connecting uses. The shared Critical Hit control selects the modeled critical/noncritical scenario for all modeled strikes/uses; it does not average natural critical-hit rates. Probability formatting avoids turning near-100% into “Guaranteed.”

Focus Band is included where supported. For Graveler 1 at 151 HP, the reviewed Swampert fixtures produce:

- Surf 244–288 HP: 90% OHKO because Focus Band can preserve one HP.
- Ice Beam 81–96 HP: 90% by two successful uses and 99% by three; the UI chooses the 2HKO summary.

Focus Band activation within a multi-strike move differs from fresh checks across separate uses. Supported double-hit and 2–5-strike attacks now propagate their complete per-use distributions, early fainting, and the persistent within-use Focus Band flag; a fresh flag is used on the next move use. The count of strikes is not the count of PP-paying move uses. Triple Kick still explicitly conditions its single-use preview on the first strike landing and includes its later accuracy checks, but its repeat sequence is unavailable. General accuracy is not silently added to ordinary KO summaries.

## Remaining model boundaries

This remains a conditional KO calculator, not a turn simulator. It does not choose opponent actions or infer untracked effects, item consumption before the represented starting point, or weather duration. Selected weather stays active during the modeled sequence. Conditional context and concise unavailable reasons are available on the existing summary's title; there are no new popup sections, buttons, or bottom disclaimer paragraphs.

Supported secondary effects include Flamethrower-style burn, ordinary poison/paralysis, and Psychic-style Special Defense drops, with move chance, Serene Grace, Shield Dust, relevant type/ability immunities, stat-drop prevention, stage limits, and known status-berry consumption. Damage-neutral secondary effects are accepted only where they cannot change the modeled outcome under the no-opponent-actions contract. Real damage is reevaluated after a status or Special Defense transition, rather than ignoring it.

Repeat estimates remain unavailable for unverified item/ability transitions (including pinch berries, White Herb, Leppa, confusion berries, Shell Bell, reactive/contact abilities and relevant Synchronize/Shed Skin), unknown Toxic counters, thaw transitions, Truant turn state, random-power/healing branches, poison-bearing Twineedle, Triple Kick repeats, self-stat-change/recoil/drain/charge/recharge/other history-dependent effects. Support is explicitly allowlisted; an unfamiliar effect does not silently receive an ordinary repeat calculation. Known unmodeled within-strike ability/item/secondary transitions also make the single-use preview unavailable, rather than retaining an unsafe initial guarantee. A branch-count bound fails safely instead of pruning outcomes or inventing a guarantee.

Trace's copied ability and offensive Fire damage with unknown Flash Fire activation receive concise unavailable messages. A manually selected status conflicting with a possible status-preventing ability is also unavailable rather than silently curing or rewriting Conditions. Intimidate and other entry effects remain manual; no hidden activation/copy state or controls were added. Substitute, Endure, Charge, and other untracked temporary contexts remain outside the model. Natural critical rates, move accuracy, and opponent actions are not part of these conditional percentages.

Unsupported damage contexts include OHKO moves, Future Sight/Doom Desire, Beat Up, Rollout/Ice Ball, Fury Cutter, Spit Up, Bide, Struggle, switching-dependent Pursuit, and prior-hit Revenge. Dream Eater/Snore check their required sleep condition. Explosion/Selfdestruct with possible Damp return a limitation message. Fake Out/Focus Punch retain their execution prerequisites.

Automatic Intimidate, activated Flash Fire, Trace copying, Substitute, Endure, Charge, Minimize, Foresight, sports, transformation, semi-invulnerability, and other unrepresented context are not added by these corrections. Counter/Mirror Coat preview eligible incoming attacks and survival rather than predicting move choice or simulating a turn. See the audit and resolution record for open findings.

## Verification and tracking

Independent correction fixtures use Emerald source command order: Weather Ball rain 59–70 HP; Ice Beam versus the controlled Charizard fixture 56–67 HP with 6.25% OHKO at 67 current HP; Super Fang at one HP bypassing Focus Band. Additional tests cover Forecast forms/suppression, defensive/offensive typing, Speed ambiguity, screens/critical/weather interactions, immunities, and reverse type-display order.

Unit and browser tests also cover unchanged stat numbers/bars, both calculation directions, live popup weather/type changes, ability uncertainty, Focus Band, persistent conditions, saved data preservation, and 320/375/430px layouts. Browser-to-engine comparisons verify integration; independent arithmetic fixtures provide separate expected values. Actual iPhone Safari and exhaustive emulator parity remain outside automated verification.

- Historical investigation: [BATTLE_CALCULATOR_AUDIT.md](BATTLE_CALCULATOR_AUDIT.md)
- Correction status and remaining findings: [BATTLE_CALCULATOR_RESOLUTIONS.md](BATTLE_CALCULATOR_RESOLUTIONS.md)
- Reliability-pass mechanics, fixtures and verification: [BATTLE_CALCULATOR_RELIABILITY.md](BATTLE_CALCULATOR_RELIABILITY.md)

### Earthquake repeat-use correction and popup colors

Earthquake's `EARTHQUAKE` effect is explicitly eligible for the existing bounded repeat-use model. It had been omitted from the safe-effects allowlist and therefore incorrectly reported “Repeat KO unavailable.” The Lv. 47 Swampert fixture (Attack 140, Earthquake 89–105) against Anabel Silver's full-health Snorlax (251 HP, Quick Claw, Immunity/Thick Fat) now yields Guaranteed 3HKO with sufficient PP and neutral conditions. Quick Claw changes move order; opponent actions remain outside this conditional model. Existing recovery, residual, PP, ability and unsupported-state restrictions still apply. Leftovers/Sitrus variants are calculated rather than treated as the original Quick Claw matchup.

Popup damage percentages are white, becoming green only when the unrounded minimum HP damage reaches maximum defender HP. This is independent of current HP and survival mechanics. Only the calculated Guaranteed OHKO summary is green; Focus Band's 90% OHKO and all multi-use summaries remain white. No popup layout or conditions controls changed.
