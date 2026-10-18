> Historical calculator record. The old preview/KO system was retired; its remaining source dependencies were removed in [Pass 2](BATTLE_CLEANUP_PASS_2.md). See [current Battle architecture](BATTLE_ARCHITECTURE.md) for the active implementation and recovery location.

# Final Battle Calculator Reliability Pass

Date: 2026-10-17. The prior H01/H03/H04/H05/M01/M02/L02 corrections were inspected in code and verified by the existing independent regressions; none was reverted. Legacy 1.0 remains read-only. No commits or pushes.

## Preserved scope

Battle Conditions is locked and unchanged: the same Weather, Critical Hit, HP, Status, five stages, two screens, and Reset controls remain in the two-column mobile layout. No fields were added to persistent Battle state. No CSS, card/artwork/header/stat/move-row layout, tabs, teams, searches, rules, or other pages changed. The only popup presentation changes are the existing KO line's concise wording and context title; there are no new sections, close buttons, controls, or bottom disclaimers.

## Implementation

`koProbability.js` adds a bounded, ephemeral probability enumeration over at most five uses. It is not a general battle-state simulator: it does not select opponent actions, add volatile/entry-effect state, infer weather duration, or modify saved/live data. It reuses the existing Gen 3 engine and actual rolls. Supported surviving states carry HP, held-item consumption, relevant status and Psychic's Special Defense stage. Both battlers' known residual HP is tracked so an attacker that faints cannot complete later uses, and known HP-dependent abilities reach the engine correctly.

### Recovery and residual timing

- Gen 3 field weather damage occurs first. Sand/hail use floor(max HP/16), minimum one; Sand Veil and Rock/Ground/Steel immunity, Ice's hail immunity, Forecast, Cloud Nine and Air Lock are respected.
- Per-battler effects then apply Rain Dish, item recovery, and regular poison/burn. Leftovers and Rain Dish restore floor(max HP/16), minimum one, capped at maximum HP.
- Sitrus restores **30 HP**, not a percentage. Oran restores 10; Berry Juice restores 20. At half HP or below, the current item activates during end-of-turn processing and is consumed in that probability branch. It does not activate between strikes or revive a fainted Pokémon.
- Regular poison and Gen 3 burn deal floor(max HP/8), minimum one. Status damage can finish a Focus Band survivor; Band does not block residual damage.
- Known status berries cure and are consumed at move-end timing. A later status proc cannot reuse the same berry.
- Existing Toxic history is unknown and is not assigned a fabricated counter. If a known current status berry removes Toxic before its damage is relevant, that deterministic cure can be used; otherwise repeating is unavailable.
- Selected weather is held fixed as an explicit conditional assumption. No weather-duration input or hidden countdown was added. If both battlers might faint from residuals and the relevant order cannot be established, the repeat estimate is unavailable rather than a guessed guarantee.

The KO-by-turn timeline includes terminal end-of-turn knockouts. An actual direct OHKO remains `Guaranteed OHKO` or its probability. A lethal result requiring residual damage instead says `Guaranteed KO by turn 1` (or the applicable chance/count). These are still one compact summary, not additional lines listing multiple outcomes. No battle-win probability is claimed.

### Move coverage

- Burn, ordinary poison/paralysis, and Psychic-style Special Defense drops branch with the actual secondary chance. Serene Grace, Shield Dust, Clear Body/White Smoke, status immunities and stage bounds are considered where relevant.
- The next hit goes through the engine with the changed state; a stat drop or status is not ignored just to produce a result. Manual Conditions never change to reflect a hypothetical proc.
- Damage-neutral secondary effects can be accepted under the no-opponent-actions/connecting-attacks contract.
- Ordinary double-hit and 2–5-strike moves now receive repeated-use estimates from complete per-use strike distributions. Strikes are rerolled independently, early fainting stops further strikes, and Focus Band protection persists within that one move but resets for a new use. One multi-strike move is one PP-paying use.
- Coverage is allowlisted, not a blanket fallback. Twineedle's additional poison handling, Triple Kick repeats, random-power/healing branches, drain/recoil, self-stat changes, charge/recharge, trapping/history-dependent effects and unfamiliar effects remain unavailable when not verified.
- Reactive abilities, unverified item transitions, relevant Synchronize/Shed Skin, thaw state, and Truant timing are conservatively excluded from repeat estimates. Known unmodeled **within-strike** transitions (reactive abilities, status-curing/White Herb/Shell Bell item interactions, secondary-bearing multi-strike moves) also make the single-use preview unavailable; an invalid initial guaranteed-KO result is not retained as a fallback. Missing contact metadata is not guessed to extend coverage.

### PP, ability uncertainty and guarantees

- Known `currentPp` caps executable uses, up to five. Pressure costs two PP per move use where that ability is known in the scenario. A final single PP still executes: e.g. 3 PP under Pressure permits two uses. No PP is deducted automatically.
- Unknown remaining PP produces hypothetical multi-use results marked `· PP unknown`; it is not treated as a full PP pool. PP restoration, including Leppa, is not simulated.
- The earliest positive cumulative probability **by** N uses is selected. It is not the probability of fainting only on the Nth hit. L01's earliest-possible policy is preserved even for `<0.1%` outcomes.
- A “Guaranteed” label requires that no surviving or failed branch remains. A floating-point value rounding to 100 is not enough. Tiny nonzero outcomes remain possible instead of becoming `No KO` or `0% chance`.
- Ability scenarios are combined only if initial damage **and supported KO timelines, limits and availability** match. Rain Dish versus Swift Swim, or Pressure versus another ability with known PP, can therefore require separate results even when their initial damage is identical.
- Trace's copied ability and offensive Flash Fire activation are not known and receive a concise unavailable message. Incoming activated Fire damage is also guarded in retaliation previews. Intimidate remains manual; no automatic entry effects or new controls were introduced.
- A selected status that conflicts with a possible status-preventing ability is unavailable rather than silently changing the user's condition or simulating an impossible guaranteed sequence.
- Ordinary accuracy is excluded. Critical Hit is the user's fixed selected scenario for modeled hits; no natural critical-rate calculation was added. The existing summary's context title records these assumptions and the no-opponent-actions/no-untracked-effects contract.

## Independent before/after examples

Controlled level-50 Strength fixture: Normal STAB, Attack/Defense 100, target 130/130 HP, rolls `58,59,60,60,61,62,62,63,64,64,65,66,66,67,68,69`. The expectations below come from independent enumeration of the 256 roll pairs, applying source-derived timing/amounts.

| Case | Before | After |
| --- | --- | --- |
| Target Leftovers | 28.1% 2HKO | **0.4% 2HKO** (exact 0.390625%) |
| Target Sitrus Berry | 28.1% 2HKO | **7.0% 2HKO** (exact 7.03125%) |
| No recovery item | 28.1% 2HKO | **28.1%**, unchanged (exact 28.125%) |
| Psychic, neutral target 100 HP, SpA/SpD 100, 10% drop | Repeat unavailable | **0.8% 2HKO** (exact 0.78125%) |
| Flamethrower, same neutral 100 HP fixture | Repeat unavailable | **8.3% KO by turn 2**, including burn residuals (exact 8.28125%) |
| Ice Beam 81–96 into Graveler 1 at 151 HP, sufficient PP | 90% 2HKO | **90% 2HKO**, unchanged |
| Same Ice Beam, one known PP | Hypothetical 2HKO presented without restriction | **No KO with remaining PP** |
| Focus Band survivor at one HP with existing burn/poison | 90% direct OHKO only | **Guaranteed KO by turn 1**, including residual damage |

Additional source-derived regressions cover: 30-HP Sitrus target taking two 15-HP strikes (KO before berry activation); Focus Band plus Rain Dish without inventing a second held item; Lum consumption across repeated burn procs; actor residual fainting and Torrent thresholds; independent four-strike/10-strike thresholds; PP/Pressure final-point behavior; and unresolved activation/status conflicts.

Primary references inspected directly:

- [`DoFieldEndTurnEffects`, `DoBattlerEndTurnEffects`, `ItemBattleEffects`, `AbilityBattleEffects`](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c): weather-before-battler effects, Gen 3 recovery, status, item timing and activation handling.
- [`Cmd_weatherdamage`, `Cmd_ppreduce`, damage/survival commands](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c): weather immunity, minimums, Pressure deduction and Focus Band.
- [Multi-hit/normal move execution and residual scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s): per-strike execution and end effects.

These are unmodified Emerald references, not later-generation formulas. Independent arithmetic expectations are literal or enumerated separately from the engine; browser engine comparisons additionally verify integration, not independent cartridge parity.

## Files changed in this pass

- `src/battle/koProbability.js` — new bounded repeat-use probability helper.
- `src/battle/damagePreview.js` — integrate timelines, PP/availability, ability-safe grouping and compact summaries.
- `src/ui/components/BattleDamageResults.jsx` — context title on the existing KO summary only.
- `test/koReliability.test.js` — independent timing/probability/PP/unsupported regressions.
- `test/battleReliability.browser.mjs` — exact live fixtures, PP and residual labels, locked UI/data checks and mobile widths.
- `test/damagePreview.test.js` — stronger supported-multi-strike/Psychic expectations, clarified use wording and explicit known PP in executable player fixtures. No assertions were removed to bypass a failure.
- `test/battleDamagePopup.browser.mjs` — update the exact accepted unavailable/use wording; retain its original integration/layout assertions.
- `docs/DAMAGE_CALCULATOR.md` — current bounded model and limitations.
- `docs/BATTLE_CALCULATOR_RESOLUTIONS.md` — staged finding status.
- `docs/BATTLE_CALCULATOR_RELIABILITY.md` — this report.

## Intentionally unresolved

This is not a full simulator. Toxic counters, weather expiration, opponent move choice/damage, natural crit/accuracy/execution rates, action denial, Substitute, Endure, Charge, entry-effect timing, Trace copying, activated Flash Fire, contact reactions, unverified healing/item transitions, and complex repeat-move effects remain conditional or unavailable. There are no new selectors, volatile-state fields, automatic Intimidate changes, or hidden activation assumptions. L01's selection policy and L03's dormant copied tables are intentionally unchanged.

H02 and M04 are improved within the verified bounded model, not declared universally solved. H06/M05 remain intentionally partial. M03's conditional contract is explicit without restoring visual disclaimers; M06 now respects known PP/Pressure while explicitly distinguishing unknown PP. Actual iPhone Safari and exhaustive emulator differential parity remain unverified.

## Validation

- Full automated suite: **245 tests passed**, zero failed, including 21 new reliability regressions and all prior correction tests.
- Production build: **passed**, with the existing large-chunk warning.
- Complete browser suite: **16/16 scripts passed**, including all prior Battle/accuracy checks and the new reliability browser regression. After final review added a conservative within-strike guard, the full suite was rerun successfully.
- Mobile checks: **320px, 375px and 430px**; the 375px reliability popup screenshot was also visually inspected. No horizontal overflow or additional popup controls/sections were introduced.
- Locked UI/data: the new browser regression verifies the same **22 Conditions controls**, unchanged original stat-bar widths, exact live Surf/Ice Beam ranges, live residual labels and Reset, known PP/Pressure limits, and byte-identical stored save data.
- Independent checks: all three earlier arithmetic correction fixtures still match their expected results, and the separate 432-combination ordinary formula check still passes. Recovery/timing, secondary-effect and multi-strike thresholds use independent expected arithmetic in the new tests, not only UI-versus-engine comparisons.

Actual iPhone Safari and exhaustive ROM/emulator parity remain unverified. All intentionally deferred contexts above remain unavailable/conditional; no additional features, commits, or pushes were started.
