> Historical Step 5 record. [Step 6A](BASIC_DAMAGE_STEP_6A.md) now adds exactly five fixed-damage moves.

# Damage calculator restart — Step 5

The new single-use calculator now applies supported items and ability pairs. It does not import the retired calculator or create persistent state. Raw stats remain separate from stage-only displayed stats. Conditions are still explicit, now including attacker current HP for starter/Swarm thresholds and defender status for Marvel Scale/Flash Fire. The existing Conditions controls, persistence, cards, rows, headers, stats/bars and popup CSS are unchanged.

## Files

- New `src/battle/damageModifiers.js`: small, pure single-use item/ability preparation helper.
- Updated `src/battle/basicDamage.js`: apply prepared stat/power/type/weather/crit/immunity values; enumerate possible abilities; group identical roll arrays. `calculateBasicDamage` returns a single range only when all branches agree; `basicDamageScenarios` supplies every distinct range to the popup.
- Updated `BasicDamagePreview.jsx`: same section/heading/white percentage-first formatting; add ability prefixes only when more than one distinct result exists.
- Updated `BattleMoveDetails.jsx`: pass attacker current HP and defender status from the existing condition projections. No controls/state added.
- New `test/basicDamageModifiers.test.js` and `.browser.mjs`: independent numeric, original-data, live state and mobile checks.
- Updated earlier `basicDamage.test.js`, `basicDamageTypes.test.js`, `basicDamageConditions.test.js`: retain pure formula/stage/type checks using neutral abilities/items where those were intentionally ignored before; now assert Water Absorb/suppression rather than the retired exclusions.
- Updated `basicDamageConditions.browser.mjs`: low-HP Swampert now correctly triggers Torrent. Other Step 4 assertions remain.
- This record and the Step 4 historical-status link.

## Item support

- Choice Band: physical Attack×1.5, truncated before stages.
- Gen 3 type boosters: relevant attacking stat×1.1 before stages, not base power or final damage. Silk Scarf, Black Belt, Sharp Beak, Poison Barb, Soft Sand, Hard Stone, SilverPowder, Spell Tag, Metal Coat, Charcoal, Mystic Water, Miracle Seed, Magnet, TwistedSpoon, NeverMeltIce, Dragon Fang and BlackGlasses.
- Sea Incense: Water attacking stat×1.05 in Emerald.
- Light Ball: only Pikachu's Special Attack×2. It does not boost physical damage in Gen 3.
- Thick Club: only Cubone/Marowak Attack×2.
- DeepSeaTooth: only Clamperl Special Attack×2. DeepSeaScale: only Clamperl Special Defense×2.
- Metal Powder: only original/untransformed Ditto Defense×2, not Special Defense. No Transform state is inferred.
- Soul Dew: explicitly no boost for Latias or Latios in this app's Battle Frontier context.

Species eligibility uses the existing national Dex ID, not a nickname. Item matching normalizes spelling/spacing of existing names; no new database or item-selection controls were added.

## Ability support and order

Huge/Pure Power doubles raw Attack first. Type item modifiers and then eligible species/Choice Band items apply. Thick Fat halves Fire/Ice incoming Special Attack before stage modifiers; Hustle and status-activated Guts multiply Attack×1.5; status-activated Marvel Scale multiplies Defense×1.5. Applicable stages are applied once after these stat modifiers. Guts suppresses the ordinary physical burn penalty. Hustle's accuracy penalty is not modeled.

Torrent, Blaze, Overgrow and Swarm multiply matching base power×1.5 (floor) when the explicitly selected current HP is at most floor(max HP/3). No HP is consumed or changed.

Water Absorb, Volt Absorb, Flash Fire's defensive Fire immunity and Levitate yield sixteen zero rolls for the relevant move type. Emerald Flash Fire does not block Fire while the defender is frozen; no thaw/status transition is simulated. No absorption healing is applied.

Battle Armor/Shell Armor cancel the manually selected critical scenario before stage and screen rules, retaining adverse stages and relevant screens. The selected checkbox is not changed.

Cloud Nine/Air Lock suppress selected weather from either side for the entire pinned ability pair. Forecast uses that same effective weather for Castform's outgoing STAB and incoming chart typing: Fire in sun, Water in rain, Ice in hail, Normal otherwise. The selected weather is not cleared. Existing type/card helper utilities are reused unchanged.

After these preparations, the approved integer base, burn/screens/weather, +2, selected crit, STAB, cartridge-ordered chart entries and16 random rolls retain their order.

Primary independent checks: [Emerald CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/master/src/pokemon.c), [held-effect parameters in items.h](https://github.com/pret/pokeemerald/blob/master/src/data/items.h), [absorption/Flash Fire in battle_util.c](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c), and [critical protection/type damage](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c).

## Uncertain abilities

Each attacker/defender ability pair is evaluated separately. Identical complete16-roll arrays share one result line, without ability labels when every pair agrees. Differing ranges have compact ability prefixes, in either attack direction; both-side uncertainty can identify both abilities with an arrow. No probabilities, averaging or random choice occurs. If any necessary branch is unsupported/unknown, the section is omitted rather than silently discarding that branch.

## Known unsupported or deliberately excluded cases

- Trace: copied ability unknown; no result on either side.
- Offensive Fire moves from Flash Fire: activation unknown; omit the section. Its known defensive immunity remains supported. There is no activation control or persistent flag.
- Wonder Guard and the supported sound attack Hyper Voice against Soundproof remain outside this step's implemented ability set; omit those previews. Soundproof has no effect on ordinary nonsound attacks.
- Enigma Berry: custom held effect/parameter unknown; omit the preview.
- Stat/pinch berries and other consumables are not activated, consumed or inferred; only currently supplied raw stats/manual stages are used. Shell Bell/Leftovers and absorb abilities do not heal, apply recovery or change HP. Earlier consumed boosts must be represented by the user's stages; no consumption history is invented.
- Intimidate is never applied automatically; manual Attack stages remain authoritative. Status immunity/cures are not automatically applied; the selected status is used as given.
- Plus/Minus field-pair bonuses are not modeled: previews with a Plus attacker and Minus defender (or vice versa) are omitted. Transform state/history, entry/volatile effects and other unimplemented abilities are not added to this Singles preview. No accuracy/evasion or critical-landing probabilities apply.
- Focus Band and Gen 3 Sturdy do not change ordinary raw damage. There are no survival or KO probabilities.
- Special/variable/fixed damage moves, Weather Ball and Hidden Power remain excluded by the unchanged move allowlist.

No extra popup warnings/labels/sections/buttons were added beyond ability prefixes required for differing results.

## Independent numerical fixtures

Unless specified: Lv50, Attack/SpA101, defender Defense/SpD100, neutral matchup/no STAB. Expected test numbers are literal calculations, not outputs generated by the implementation.

- Strength80 ordinary subtotal35,+2=37 →31–37. Choice Band Attack151 →base55 →46–55. Huge/Pure Power Attack202 →base73 →62–73. Hustle Attack151 →46–55.
- Surf95 ordinary base44 →37–44. Mystic Water SpA111 →base48 →40–48. Sea Incense SpA106 →base46 →39–46.
- Light Ball on Pikachu / DeepSeaTooth on Clamperl: SpA202, Surf base86 →73–86. Clamperl DeepSeaScale doubles defending SpD, yielding19–23. Ditto Metal Powder halves the physical-stat ratio to base19 →16–19.
- Huge Power + Choice Band +1 stage:101→202→303→454 (not453), Strength base161 →136–161. Huge Power + Silk Scarf with raw105:105→210→231 (not230).
- Guts with burn: Attack151 and no burn penalty →46–55. Choice Band + Guts:101→151→226, base81 →68–81. Normal burn without Guts remains16–19. Marvel Scale Defense150 gives21–25.
- Thick Fat with SpA103: half51 before stages, Flamethrower base23 →19–23. At+1 SpA,51→76, not77 from applying stages first. Charcoal then Thick Fat:103→113→56, base25 →21–25.
- Starter threshold maxHP101: boost at33, none at34. Power95 becomes142, not143. Base-power booster scenarios are checked for all four abilities.
- Battle/Shell Armor with selected critical, -2 Attack/+2 Defense/Reflect: normal adverse-stage/screen rules give5–6. Without protection, selected critical ignores those restrictions and gives62–74.
- Forecast raw SpA101: sun Flamethrower or rain Surf →82–97 with correct STAB; hail Ice Beam →56–66. Either side's weather suppression returns neutral37–44 and Normal Forecast typing.
- Original-data browser fixtures: Swampert Ice Beam vs Azumarill#1 gives Thick Fat6–8 vs Huge Power13–16; Surf agrees at20–24 and is combined. Azumarill#2 attacking with Mega Kick gives32–38 vs63–75. Pikachu#1 Light Ball ThunderPunch vs imported Castform gives67–79. Lapras#1 yields Water Absorb0 vs Shell Armor17–21 even with selected critical; HP is untouched.

Stop after Step 5 for review. No Step 6 moves, Step 7 KO logic, simulation, new controls or persistent state are implemented.

## Verification results

All 245 automated tests and all 19 browser scripts passed. The final safe Plus/Minus omission was rechecked by the full automated suite, targeted modifier browser test and production build. The build passed with the existing large-chunk warning. Checks cover actual imported/Frontier item and ability data, split/combined results in both directions, live Torrent thresholds/Reset, Shell Armor preserving the critical checkbox, absorb abilities leaving HP unchanged, Forecast/weather suppression, no retired imports, and unchanged save/control behavior. Ability-labeled white lines fit at 320/375/430px; the 320px screenshot was visually reviewed. No commits or pushes were made.
