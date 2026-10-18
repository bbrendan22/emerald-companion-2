# Earthquake / ordinary damage eligibility correction

This report records the eligibility-fix stage. The subsequent [current final audit](FINAL_DAMAGE_CALCULATOR_AUDIT.md) individually verifies all39 moves and resolves AUD-01; its current results supersede this report’s deferred-AUD-01 status and historical test counts.

## Exact root cause and trace

Earthquake's shared reference data is correct: move89, GROUND, power100, accuracy100, effectEARTHQUAKE. It was not rejected by a special-move exclusion or by an invalid player/opponent stat. The initial Step2 conservative effect allowlist was never completed for ordinary damaging effect families.

1. `reference.js::battleMove(89)` resolves the correct metadata.
2. Earthquake is neither a fixed-damage, variable-power nor Step6C special move; those resolvers leave it unchanged.
3. `basicDamage.js::prepareBasicDamage` rejected `effect:'EARTHQUAKE'` before category/stat/modifier preparation because `basicEffects` omitted that effect.
4. `singleDamage` therefore returned null, `basicDamageScenarios` returned[], and `BasicDamagePreview.jsx` intentionally returned null for an empty result set.
5. The entire Damage Calculation section disappeared. No popup rendering or live-update dependency was broken.

The old unsupported-move test explicitly expected Earthquake to be absent, so it preserved the original overly restrictive policy instead of detecting this regression. That expectation is replaced with positive numerical regression coverage.

## Correction

Expanded the ordinary connected-hit effect allowlist, without changing damage arithmetic, reference data, items/abilities, Conditions, popup styling/colors or KO scope. No matchup-specific outputs or species exceptions were added. Fixed-power moves whose other effects occur after the hit use the existing ordinary formula.

Reviewed Emerald's [battle scripts](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s):

- Earthquake normally uses script multiplier1 and the ordinary damage/type/random route; its underground bonus is conditional on an unrepresented semi-invulnerable state.
- Absorb-family healing, recoil, recharge, trapping residuals, rampage/rage and self stat changes do not require a different formula for the present connected hit. No healing/recoil/residual/state progression is calculated or applied.
- Thunder's weather accuracy behavior and Sky Uppercut's target access do not alter the ordinary connected-hit damage formula in the current state model.
- Gust/Twister/Stomp-style conditional bonuses and Whirlpool's underwater bonus are not modeled; their standard hit is now available under the current ordinary-field assumptions, consistent with Earthquake and existing Surf. No hidden underground/airborne/underwater/minimized state is inferred.

Forty-six ordinary effects plus the existing sixteen explicit special IDs now admit162 reference move names (formerly123). Of the39 restored names, many share the same effect family; this is an eligibility correction, not39 new mechanics implementations.

### Legitimate exclusions retained

Struggle shares RECOIL with Take Down/Submission but skips ordinary STAB/type handling in Emerald (`Cmd_typecalc`); it remains excluded by its stable move ID165, including if its displayed name changes. There is no positive-ID hardcode for Earthquake.

SolarBeam weather damage, Explosion/Self Destruct defense halving, False Swipe's HP clamp, Pursuit/Revenge conditional handling, Dream Eater/Snore/Fake Out/Focus Punch action gating, charging moves, variable unsupported powers, counter damage, multistrikes and OHKO moves remain excluded. Uproar remains excluded: the current conservative Soundproof context guard does not cover it, so enabling it would permit unreliable supported-ability results. Existing Step6A–6C explicit moves remain supported. No new ability or field controls.

## Independent numerical regression cases

- Synthetic imported **Swampert Lv47, Attack122**, against actual **Azurill1 Lv50, HP157/Defense60**:
  `level factor20; floor(floor(20*100*122/60)/50)+2 =83; STAB floor(83*1.5)=124; Ground vs Gen3 Normal neutral`.
  All16 rolls:105,106,107,109,110,111,112,114,115,116,117,119,120,121,122,124.
  Display: **66.9–79.0% · 105–124 HP**. Azurill's Thick Fat/Huge Power alternatives give identical incoming Ground damage and correctly combine.
- Neutral generic fixture, Lv50 Attack100/Defense100, Ground STAB: quotient44,+2=46;STAB69=>**58–69 HP**.
- Flying and Levitate: **0.0% · 0 HP**, including alternative ability results and known player Levitate when the opponent uses Earthquake.
- Neutral Frontier Raticate1: HP151/Defense80; Swampert fixture gives base63, STAB94=>**52.3–62.3% · 79–94 HP**.
- Choice Band then+1 Attack then Reflect: Attack100=>150=>225;subtotal99;screen49;+2=51;STAB76=>**64–76 HP**. No stages applied twice.
- Generic no-STAB common attacks: Surf/Ice Beam/Thunderbolt/Flamethrower95=>36–43 HP; Rock Slide75=>29–35; Shadow Ball80=>31–37 against a neutral non-Normal target. These six effects were already eligible and are unchanged.
- Other restored families have literal numerical tests for drain, recoil, recharge, weather-accuracy, conditional target-access and self-stat-drop moves; no post-hit effect is applied to Conditions.

## Files changed

- `src/battle/basicDamage.js`: ordinary-effect eligibility and Struggle exception only.
- `test/basicDamage.test.js`: remove obsolete Earthquake/Mega Drain exclusion expectations; retain an explicit Struggle exclusion.
- `test/ordinaryDamageEligibility.test.js`: numerical/classification/immunity/ability/condition/ordinary-family/exclusion tests.
- `test/earthquake.browser.mjs`: current player/opponent previews, exact imported fixture, neutral/Flying/Levitate, active/move/stage/reset updates, all six common attacks, preserved percentage colors, save bytes, dismissal and320/375/430px.
- This document and a follow-up notice in `FINAL_DAMAGE_CALCULATOR_AUDIT.md`.

No formula, popup/Conditions source, colors/styles, other Battle tabs/pages, save data or Legacy1.0 files were changed. The prior AUD-01 offensive-minimum finding remains deferred and unfixed.

## Restored ordinary-hit names

Gust, Bind, Stomp, Jump Kick, Wrap, Take Down, Thrash, Double Edge, Hyper Beam, Submission, Absorb, Mega Drain, Petal Dance, Fire Spin, Thunder, Earthquake, Rage, Clamp, Hi Jump Kick, Leech Life, Flame Wheel, Outrage, Giga Drain, Sacred Fire, Twister, Whirlpool, Superpower, Secret Power, Needle Arm, Blast Burn, Hydro Cannon, Astonish, Overheat, Extrasensory, Sky Uppercut, Sand Tomb, Frenzy Plant, Volt Tackle, Psycho Boost.

## Verification results

- Full automated suite: **285/285 passed**.
- Full browser suite: **24/24 passed**.
- Production build: passed, with the existing bundle-size warning. CSS output hash remained `CfW0-SM8`, confirming the popup/color/Conditions styles were unchanged.
- Mobile touch emulation320/375/430px: no horizontal or popup overflow in the Earthquake regression. The320px screenshot was visually reviewed. Existing popup colors, both attack directions, selection behavior, Conditions updates/reset, outside dismissal and imported save bytes passed.
- No commits/pushes. Stop after this correction.
