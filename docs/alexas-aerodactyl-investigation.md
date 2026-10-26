# ALEXAS / Aerodactyl unavailable-damage investigation

October 25, 2026. Investigation stopped at the user's Phase 3 design-review boundary. **No production files changed. No uncertainty safeguard or formula was bypassed. The unresolved matchup is not fixed by this investigation.**

## Finding

Reproduced through the actual BattleMatchup and BattleMoveDetails components at 320/375/430px, in both Singles and Doubles, using Expert (M):ALEXAS, level-50 Aerodactyl and level-47 Swampert.

There are two independent existing blockers:

1. With no item observation, four possible sets have two different items. The UI passes `item: null`, the explicit unknown-item value. The held-item operand validation returns null even though these particular defender items would not change incoming Ice Beam damage. The core returns null.
2. Even after a genuine Kings Rock observation, remaining sets have different maximum HP. Ice Beam can compute its raw HP rolls because their Special Defense is identical, but the percentage formatter requires one numeric maximum HP and rejects the display string `155–176`.

Both cases become `availability: unavailable`, `reason: missing-damage-data` in ability scenario formatting. BasicDamagePreview turns that into “Damage unavailable for this matchup.” No exception is thrown. Neither failure is an `unknown-weather-suppression-field`, `unknown-plus-minus-field`, `unresolved-trace` or missing-active-count error.

This is an existing uncertainty-model limitation and UI/calculation-boundary mismatch, not an Emerald formula error. Strict unknown-item/ranged-stat validations are intentional, but they are overly restrictive for this particular forward attack and the generic message obscures the cause.

## Actual trainer and opponent data

Trainer key: `Expert (M):ALEXAS`. Canonical trainer IV value: **31, known from the trainer**, not an assumed unknown-opponent IV.

| Set | Nature | Item | Moves |
| --- | --- | --- | --- |
| Aerodactyl 1 | Adamant | Kings Rock | AncientPower, DragonBreath, Aerial Ace, Roar |
| Aerodactyl 2 | Adamant | Choice Band | Hyper Beam, Earthquake, Aerial Ace, AncientPower |
| Aerodactyl 3 | Hardy | Kings Rock | Double Edge, Rock Slide, Fire Blast, Dragon Claw |
| Aerodactyl 4 | Hardy | Kings Rock | Double Edge, Earthquake, Fire Blast, Bite |

The existing level/nature/EV/known-IV stat pipeline produces:

| Stat | Possible values / display |
| --- | --- |
| HP | 155 or 176 → `155–176` |
| Attack | 157 or 160 → `157–160` |
| Defense | **85** |
| Special Attack | 72 or 112 → `72–112` |
| Special Defense | **95** |
| Speed | 150 or 171 → `150–171` |

Legitimate abilities: **Rock Head / Pressure**. Neither changes connected Ice Beam, Surf or Earthquake damage in this matchup. No branch has Trace, Forecast, Cloud Nine, Air Lock, Damp, Plus or Minus. The player ability is Torrent. Both represented ability alternatives are evaluated and equivalent unavailable/numerical results group correctly.

The user's save and complete battle-condition state were not supplied. Reproduction uses explicit positive scalar fixture stats for Swampert: level47, HP180, Attack110, Defense100, SpA100, SpD100, full HP, Torrent, no item, neutral stages, clear weather, no screens/critical/Helping Hand. These are **diagnostic fixture values, not a claim about the user's saved Swampert**. The two blockers reproduce independently of the exact positive saved Attack/SpA values.

## Complete path and failure points

1. [towerSets.js](../src/battle/towerSets.js): eligibleMatchupSets returns the four trainer-authorized sets. With no move/item observations, possibleMatchupSets retains all four. identifiedMatchup has no unique item; selecting an ability does not filter these sets.
2. [opponentStats.js](../src/battle/opponentStats.js): opponentStatRanges derives canonical stats with the trainer's known IV31. opponentStatDisplay preserves agreeing stats as integers and converts differing stats to display strings. opponentMoveInputs correctly retains IV31/friendship255 here; with missing trainer knowledge, IVs remain null and stat ranges are unavailable.
3. [BattleMatchup.jsx](../src/ui/components/BattleMatchup.jsx): the calculation opponent receives that display stats object, `item: identification.item || null`, and full-HP `currentHp` from the same display HP value. Per-slot conditions, ability options and format/count context are passed through normally.
4. [BattleMoveDetails.jsx](../src/ui/components/BattleMoveDetails.jsx): calls calculateAbilityScenarios with the staged pair. No alternate Frontier-set/stat calculation layer exists here.
5. [abilityScenarios.js](../src/battle/abilityScenarios.js): pins Torrent → Rock Head and Torrent → Pressure independently. Both are legitimate; neither is silently dropped or neutralized.
6. [coreDamage.js](../src/battle/coreDamage.js): Ice Beam uses player Special Attack and defender Special Defense95. The ordinary calculation calls neutralBaseDamage, which calls heldItemDefense with explicit null. [heldItemModifiers.js](../src/battle/heldItemModifiers.js) rejects that unknown item; base calculation returns null, then applyCoreDamageModifiers returns null. In reverse attacks, required attacker-stat strings can independently fail integer validation first.
7. With a known Kings Rock item, base/roll calculation succeeds. [coreDamagePresentation.js](../src/battle/coreDamagePresentation.js) rejects the non-integer target maximum HP. Ability scenario formatting therefore still has no percentage/HP presentation parts and assigns missing-damage-data despite a valid core result.
8. [BasicDamagePreview.jsx](../src/ui/components/BasicDamagePreview.jsx) shows the generic unavailable message for either path. Only unresolved Trace currently gets a more specific missing-input message.

Isolating the inputs confirms independence: making only HP numeric leaves the unknown-item failure; making only the item known permits core Ice Beam rolls but not percentage formatting. A truly uncertain required Defense/SpD/Attack/SpA still fails rather than choosing an endpoint. Irrelevant stat ranges alone do not prevent the underlying scalar formula.

Earthquake is also unavailable with the unresolved UI model: the unknown-item check happens before ordinary type-effectiveness calculation. With known inputs, the actual Rock/Flying type correctly yields zero damage. The current formatter also requires scalar maximum HP even for that zero-damage standard result.

## Recent-change comparison

- Singles exits the new unseen-field wrapper without adding any Doubles safeguard. Its reported failure still reproduces.
- Ice Beam is selected-target, has no weather damage modifier in this matchup, and does not use spread arithmetic. Aerodactyl has no Forecast or relevant field ability. Both format contexts contain the correct format; Doubles propagates two active defenders by default.
- The pre-Doubles [ability/item audit](ABILITY_ITEM_BERRY_AUDIT.md), section 6, explicitly documents unknown active items as null and conventional calculations failing safely rather than substituting None.
- Existing coreDamage tests explicitly reject a required ranged stat. Both the historical committed basic engine and current presentation require a numeric target maximum HP. The historical `prepareBasicDamage` from commit `c78bb1b` was loaded with its arithmetic unchanged and returned null for the same ranged-HP model, even with a known item. This is comparison evidence, not a newly added numeric approximation.
- All 292 production source files retain the approved Doubles baseline digests. No production correction occurred in this investigation.

No evidence supports the unseen-field safeguards causing this Ice Beam failure. The report that this trainer previously worked could reflect different observations, a different opponent/set, or an older application version; those earlier phone inputs/version are unavailable, so that history cannot be established conclusively. Genuine observations do change whether the existing scalar input contract is satisfied.

Other affected matchups: any unresolved opponent item can block conventional damage; any ranged required combat stat can block the core; any ranged defender maximum HP can block percentage formatting. This is not specific to ALEXAS, Aerodactyl, Swampert, Ice Beam, Safari, or Doubles. Reverse calculations additionally depend on the opponent's uncertain offensive stats and item. Trainer choice changes the available set candidates and known-IV data, not the fundamental restriction.

## Observed results before/after resolving inputs

**No code fix is implied by this table. “Resolved” means genuine observations supplied through existing controls. Values use the labeled Swampert fixture, not the user's unknown save stats.**

| Data state | Core Ice Beam | Popup |
| --- | --- | --- |
| Four sets, no item observation | null | missing-damage-data / unavailable |
| Kings Rock known, three sets, HP155–176 | 71–84 HP | missing-damage-data / unavailable during percentage formatting |
| Choice Band genuinely known → set2 | 71–84 HP | **40.3% – 47.7%**, then 71–84 HP |
| Kings Rock + Double Edge genuinely known → sets3/4, agreeing stats/HP155 | 71–84 HP | **45.8% – 54.2%**, then 71–84 HP |

Known set2 additionally gives Surf **107–126 HP in Singles**, **56–66 HP in Doubles with two active defenders**, and Earthquake **0–0 HP** in both. Its reverse Earthquake gives **90–107 HP**, AncientPower **40–48 HP**. Sets3/4's reverse Fire Blast gives **25–30 HP**. These have independent integer arithmetic assertions in the reproduction tests.

With resolved inputs Ice Beam stays numerical in sun, rain, sand and hail. Singles rain Surf stays numerical. Doubles rain Surf correctly retains the distinct unknown-weather-suppression-field safeguard. The unresolved item/HP failures happen before that distinction can be displayed.

Only record an item/move that was actually observed. Arbitrarily selecting Choice Band or a convenient move to force a number would misrepresent the battle.

## Why production correction was stopped

The user's instruction says to stop if a significant design decision is required. Neither the active engine, its ability-scenario result contract, nor the historical basic engine supports correlated opponent stat/item/maximum-HP candidates. The existing HP damage min–max represents random rolls for one known model; it is not already a Frontier-set uncertainty contract.

Replacing null with None, parsing `155–176`, choosing HP155/176, or mixing independent stat extrema would silently erase uncertainty or invent a model. Adding range-aware percentages and a correlated set/item dimension is a real behavior/design change. A generic-message-only patch would explain the failure but would not restore the requested calculations.

A focused proposed next design is to evaluate each remaining canonical set using genuinely known trainer IVs, carry its item/stats/HP together through the existing ability scenarios and unchanged formula, and present the bounds across complete legitimate candidates without inventing probabilities. Unknown IVs and unsupported ability/field branches must still stay explicit. For this fixture alone, all four candidate Ice Beam HP ranges agree while percentage bounds differ; a candidate-aware envelope would be 40.3%–54.2%, but **that behavior is not implemented or silently assumed here**. Review this uncertainty contract before changing production.

## Validation and files

Added **17 diagnostic/regression tests** and one actual-component WebKit reproduction suite. Full unit suite: **1,001 passed, 0 failed, 0 skipped**. Production build: **PASS**. WebKit reproduction, existing core damage popup and existing unseen-field popup suites all pass at **320, 375 and 430px**. These tests validate the documented limitation and the existing supported resolved-input behavior; they do not mean unresolved damage support has been added.

Files added (tests/documentation only):

- [alexasAerodactyl.test.js](../test/alexasAerodactyl.test.js): actual candidate/IV/stat data, three moves, both formats/directions, ability options, independently isolated failures, genuine observations, weather and missing-IV boundaries.
- [alexasAerodactylPopup.browser.mjs](../test/alexasAerodactylPopup.browser.mjs): actual production matchup/popups/conditions at three phone widths, without modifying the production UI.
- [fixture model](../test/fixtures/alexasAerodactyl.js) and [React fixture](../test/fixtures/alexasAerodactyl.jsx): explicit illustrative player data, actual opponent data, diagnostic output only.
- This report.

Evidence: [unit output](../artifacts/alexas-aerodactyl/logs/unit-tests.log), [build output](../artifacts/alexas-aerodactyl/logs/production-build.log), [reproduction WebKit](../artifacts/alexas-aerodactyl/logs/reproduction-webkit.log), [core popup WebKit](../artifacts/alexas-aerodactyl/logs/core-popup-webkit.log), [field safeguard WebKit](../artifacts/alexas-aerodactyl/logs/field-safeguard-webkit.log), [96-case diagnostic matrix](../artifacts/alexas-aerodactyl/diagnostic-matrix.json), and [320px unresolved popup](../artifacts/alexas-aerodactyl/unresolved-Singles-320.png). Other widths and formats have screenshots in the same directory.

Remaining limitation: the exact user's damage numbers cannot be established without their saved stats, item and current conditions. The structural failure and internal reason are reproduced independently of those positive player stats. No OHKO probabilities, new mechanics, new controls, opponent persistence changes, Frontier set changes or comprehensive final calculator audit were started.
