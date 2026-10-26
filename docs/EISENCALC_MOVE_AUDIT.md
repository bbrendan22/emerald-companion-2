# EisenCalc Emerald / Gen III move compatibility audit

## A. Executive summary

Research only. Audited **355 Emerald Companion database entries: 354 real moves and ID 0 “Unavailable”**. Every real move maps to a resolved EisenCalc `MOVES_ADV` entry or Hidden Power family. Dropdown presence is not evidence of correct damage mechanics. No application code, existing documentation, tests, dependencies, or controls were changed.

The CSV is the complete per-entry inventory and is authoritative for classification membership. This report describes connected damage, not complete turn simulation. **SPECIAL means an actual special calculation path is invoked, not that all cases are cartridge-correct.** Psywave is expressly partial/inaccurate. STANDARD means the ordinary connected-hit formula is used; it does not certify execution restrictions, secondary effects, every item/ability interaction, or volatile battle states. GENERIC FALLBACK identifies a missing damage rule even where an unboosted ordinary case remains useful.

Key findings:

- Magnitude defaults to **150 BP** and reads editable power. It does not provide seven probabilistic outcomes.
- Psywave returns **only floor(1.5 × attacker level)**, not Emerald's 11-roll distribution.
- Present defaults to **1 BP** ordinary damage. Manual 40/80/120 powers recover individual damaging branches, but no native selection/healing model exists.
- Counter, Mirror Coat, Bide, and Beat Up return `[0]`; the UI attaches **“nice move”** to zero-BP moves. This is a presentation message, not a special damage calculation.
- OHKO moves use 1-BP conventional numeric damage plus an OHKO message and Sturdy gate. Future Sight and Doom Desire use ordinary typed calculations. These are generic fallbacks, not accurate special support.
- Fixed two-hit and Triple Kick distributions use independent per-hit rolls. Variable multi-hit moves require a selected count (default 3), without the weighted 2–5-hit distribution.
- Companion is more complete for conditional outcomes, unknown ability branches, HP-dependent validation, Endeavor, False Swipe, Damp, Uproar/Soundproof, and explicit prevention/immunity/unavailable results.

## B. Classification counts

| EisenCalc primary class | Entries |
| --- | ---: |
| STANDARD | 152 |
| SPECIAL | 37 |
| MANUAL | 6 |
| GENERIC FALLBACK | 17 |
| NO CALC | 5 |
| STATUS | 138 |
| UNKNOWN | 0 |
| **Total** | **355** |

NO CALC includes the sentinel, so real-move NO CALC is 4. STATUS includes 138 real moves. Therefore 142 real moves have no ordinary immediate-damage calculation, excluding the separate placeholder/fallback cases. UNKNOWN is zero for **source behavior at this pinned version**, not a claim that every cartridge interaction is proven. CSV confidence “verified” refers to the observed source path, resolved move data, and controlled runtime behavior; cartridge equivalence has the qualifications below.

Companion's baseline result inventory is 175 conventional, 16 aggregate, 7 conditional, 6 deterministic, 1 level-damage, and 150 unavailable/no-move entries. The last group comprises 138 status moves, the sentinel, and 11 intentionally unsupported damaging moves. These result kinds are independent of EisenCalc classifications.

## C. Actual Gen III pipeline

1. `index.html` loads shared move data, `shared_calc.js`, `ap_calc.js`, modern helpers, Gen IV helpers, and `damage_gen3.js`. The page default is a later generation; choose **Emerald/gameId 3**, never infer Gen III from initial page state.
2. `setGenProperties()` selects `MOVES_ADV`, `TYPE_CHART_GSC`, `CALCULATE_ALL_MOVES_ADV`, and Emerald sets. Move tables are inherited/cloned from earlier generations and subsequently cloned for later ones. Audit the resolved ADV object, not the last occurrence of a move in the source file.
3. The move-change handler fills editable power/type/category and a hit selector. `getMoveDetails()` reads those values. Typed Hidden Power entries and IV-aware set loading are distinct paths. Power is editable within 0–999. A facility-set move missing from the table falls back to BP 0, rather than becoming supported automatically.
4. `CALCULATE_ALL_MOVES_ADV()` prepares weather suppression/Forecast and invokes `getDamageResultADV()` for each move/side. The latter first checks the shared Shedinja fatality heuristic, then zero power, Weather Ball type, Struggle, chart immunity, defensive abilities, singleton damage, dynamic power, stats/stages/items, and formula modifiers.
5. **Category comes from the resolved type chart**, not the stored modern-style `category` property. Clear Weather Ball and Rock Weather Ball are physical; Fire/Water/Ice are special. Ice Ball and Pursuit remain special in Gen III. Doom Desire incorrectly follows physical Steel ordinary damage because its delayed-attack exception is absent.
6. The ordinary path includes Explosion Defense halving; critical stage bypass; burn; screens (crit and Brick Break bypass); weather/SolarBeam; Flash Fire; +2; critical and special script multipliers; STAB; ordered type multipliers; and 16 random values 85–100. Weather Ball, Facade, SmellingSalt and the `(Doubled)` suffix multiply after +2. Changing BP is not universally equivalent.
7. `getSingletonDamage()` is defined in the modern file but is **actively called by ADV**. It supplies fixed values, Super Fang and maximum-only Psywave. `getTripleKickDamage()` similarly lives in the Gen IV file but is actively used by ADV. File names alone cannot establish generation applicability.
8. `DamageInfo()` / `getAssembledDamageInfo()` convolve independent maps for selected hits; Triple Kick uses separate power arrays. `squashDamageInfo()` rescales frequency counts above 8192 combinations for downstream use. For the audited at-most-five-hit ordinary cases the divisor is a power of two: relative probabilities are retained, but raw integer combination counts are no longer preserved as such. This is not the Gen III random hit-count mixture.
9. `setDamageText()` builds HP range then percentage in EisenCalc, and separately sets `koChanceText`. BP 0 gets `nice move`; `isMLG` can get an OHKO claim despite placeholder numeric damage; `noKOChance` merely suppresses KO text. Neither that flag nor text is a damage-support test. Companion keeps percentage above HP.

**Zero is overloaded in EisenCalc:** no-damage moves, type immunity and blocked abilities can all return `[0]`. Companion has explicit result outcomes. The shared `killsShedinja()` helper can return `[1]` before the zero-BP check for status/passive fatality scenarios; that is not real immediate damage and incorporates some later-generation assumptions.

## D. Complete SPECIAL list

There are **37 primary SPECIAL entries**, including one incomplete mechanic (Psywave). Shared global type/weather/ability/item rules are not additional move-specific SPECIAL classifications. Hidden Power is one database entry despite its 16 typed EisenCalc entries. Revenge's doubled variant is one audited move, not an extra Companion row.

| Move | Invoked rule | Required input / caveat |
| --- | --- | --- |
| DoubleSlap | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Comet Punch | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Double Kick | isTwoHit: two independent 16-roll distributions convolved | None beyond ordinary inputs; crit conditions all hits |
| Fury Attack | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Twineedle | isTwoHit: two independent 16-roll distributions convolved | None beyond ordinary inputs; crit conditions all hits |
| Pin Missile | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| SonicBoom | Singleton: attacker level / attacker level / 40 / 20 / max(floor(target currentHP/2),1), respectively | Set level; Super Fang requires actual target current HP |
| Low Kick | Defender weight thresholds 10/25/50/100/200 kg -> 20/40/60/80/100/120 | Select correct defender species/weight |
| Seismic Toss | Singleton: attacker level / attacker level / 40 / 20 / max(floor(target currentHP/2),1), respectively | Set level; Super Fang requires actual target current HP |
| SolarBeam | Pre-+2 adverse-weather half in Rain/Sand/Hail | Set weather and abilities |
| Dragon Rage | Singleton: attacker level / attacker level / 40 / 20 / max(floor(target currentHP/2),1), respectively | Set level; Super Fang requires actual target current HP |
| Night Shade | Singleton: attacker level / attacker level / 40 / 20 / max(floor(target currentHP/2),1), respectively | Set level; Super Fang requires actual target current HP |
| Self Destruct | Halve raw Defense before stages | Set stages/status/items; Damp cannot be repaired by power input |
| Spike Cannon | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Barrage | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Psywave | getSingletonDamage returns floor(level*150/100), maximum only | Level input; manual BP cannot recover actual level-damage distribution |
| Explosion | Halve raw Defense before stages | Set stages/status/items; Damp cannot be repaired by power input |
| Fury Swipes | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Bonemerang | isTwoHit: two independent 16-roll distributions convolved | None beyond ordinary inputs; crit conditions all hits |
| Super Fang | Singleton: attacker level / attacker level / 40 / 20 / max(floor(target currentHP/2),1), respectively | Set level; Super Fang requires actual target current HP |
| Struggle | Physical Normal stat category, typeless chart, no STAB | None beyond ordinary battle inputs |
| Triple Kick | Independent powers10/20/30 through getTripleKickDamage; convolution of selected hits | Select connected hit count (default3; selector supports2/3); crit applies to every hit |
| Flail | floor(48*currentHP/maxHP) buckets: 200/150/100/80/40/20 | Set actual attacker HP |
| Reversal | floor(48*currentHP/maxHP) buckets: 200/150/100/80/40/20 | Set actual attacker HP |
| Bone Rush | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Hidden Power | Set loader resolves IV type/power; 16 typed dropdown entries; typed entry default 70 | Use IV-aware set loading; otherwise choose matching typed entry and actual 30–70 power |
| Facade | Post-+2 x2 for burn/poison/toxic/paralysis; burn still applies without Guts | Set actual attacker status |
| SmellingSalt | Post-+2 x2 against paralysis | Set actual defender status |
| Revenge | Alternate Revenge (Doubled), bp60, name suffix doubles post-+2 | Choose Revenge (Doubled) for qualifying earlier damage; ordinary entry alone is unboosted |
| Brick Break | Bypasses both screens before damage | Set defender screens |
| Eruption | max(1,floor(150*currentHP/maxHP)) | Set actual attacker HP |
| Arm Thrust | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Weather Ball | Weather type resolution; power50 formula then post-+2 x2 in nonclear weather | Set weather and abilities |
| Water Spout | max(1,floor(150*currentHP/maxHP)) | Set actual attacker HP |
| Bullet Seed | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Icicle Spear | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |
| Rock Blast | maxMultiHits5: independent convolution for selected count; default3 | Choose 2/3/4/5 connected hits; no automatic hit-count probability mixture |

These are connected-hit calculations. Secondary poisoning by Twineedle, charging, recoil, self-fainting, successive accuracy, mixed critical outcomes and between-hit state changes are not certified by this list. Crit on conditions all modeled hits critical; crit off conditions all noncritical.

## E. Complete manual-adjustment inventory

“Manual” here means a move-specific choice/input beyond ordinary level/stat/item/weather/screen selection. Six primary MANUAL moves use editable power to represent valid conditional powers:

| Move | Default / missing resolver | Manual choice |
| --- | --- | --- |
| Rollout | Ordinary calculation at default30; no streak/Curl resolver | Set power30/60/120/240/480; Defense Curl doubles each to60/120/240/480/960 |
| Fury Cutter | Ordinary calculation at default10; no consecutive-use resolver | Set power10/20/40/80/160 |
| Return | Ordinary calculation at default102, no friendship resolver | Set exact friendship-derived power manually |
| Frustration | Ordinary calculation at default102, no friendship resolver | Set exact friendship-derived power manually |
| Magnitude | Switch echoes editable power; default150, not a seven-level distribution | Set power10/30/50/70/90/110/150 separately |
| Ice Ball | Ordinary calculation at default30; no streak/Curl resolver | Set power30/60/120/240/480; Defense Curl doubles each to60/120/240/480/960 |

Additional SPECIAL moves with move-specific manual requirements:

- **DoubleSlap, Comet Punch, Fury Attack, Pin Missile, Spike Cannon, Barrage, Fury Swipes, Bone Rush, Arm Thrust, Bullet Seed, Icicle Spear, Rock Blast:** select 2/3/4/5 hits; default 3. No automatic 37.5/37.5/12.5/12.5 percent mixture.
- **Triple Kick:** selected connected-hit count, default three; partial selected sequences are available in EisenCalc. No accuracy weights.
- **Revenge:** choose `Revenge (Doubled)` for the qualifying earlier-damage branch; editing ordinary Revenge to BP120 is not equivalent.
- **Hidden Power:** use actual IV resolution through set loading, or choose the correct typed entry and manually set its actual power; typed defaults commonly use 70.
- **Flail, Reversal, Eruption, Water Spout:** enter actual attacker current/max HP. **Super Fang:** enter actual target current HP. These are automatic formulas from manual state, not manual power approximations.
- **Facade:** actual attacker status; **SmellingSalt:** actual target paralysis; **Weather Ball / SolarBeam:** selected weather and active suppressor ability. Ordinary stats/stages/crit/items still apply where appropriate.

Fallback workarounds are deliberately separate: Present's 40/80/120 inputs recover individual damaging branches; Pursuit BP80 and the target-volatile bonus moves' doubled BP are **not verified faithful substitutes** for their script multipliers. No power-only fix implements Endeavor, False Swipe, OHKO rules, delayed attacks, Spit Up, Counter, Mirror Coat, Bide or Beat Up. Psywave's distribution cannot be recovered with power overrides.

## F. Complete no-meaningful-calculation inventory

**NO CALC (5 entries):** Unavailable, Counter, Bide, Mirror Coat, Beat Up.

For the four real damaging moves, resolved ADV BP is zero, the engine normally returns `[0]`, and `setDamageText()` assigns `nice move` to the KO-text field. No reflected damage, accumulated Bide damage, or party-member Beat Up calculation is performed. The sentinel maps to `(No Move)`.

**STATUS (138 entries; not direct damage):** Swords Dance, Whirlwind, Sand Attack, Tail Whip, Leer, Growl, Roar, Sing, Supersonic, Disable, Mist, Leech Seed, Growth, Poison Powder, Stun Spore, Sleep Powder, String Shot, Thunder Wave, Toxic, Hypnosis, Meditate, Agility, Teleport, Mimic, Screech, Double Team, Recover, Harden, Minimize, Smokescreen, Confuse Ray, Withdraw, Defense Curl, Barrier, Light Screen, Haze, Reflect, Focus Energy, Metronome, Mirror Move, Amnesia, Kinesis, Soft Boiled, Glare, Poison Gas, Lovely Kiss, Transform, Spore, Flash, Splash, Acid Armor, Rest, Sharpen, Conversion, Substitute, Sketch, Spider Web, Mind Reader, Nightmare, Curse, Conversion 2, Cotton Spore, Spite, Protect, Scary Face, Sweet Kiss, Belly Drum, Spikes, Foresight, Destiny Bond, Perish Song, Detect, Lock On, Sandstorm, Endure, Charm, Swagger, Milk Drink, Mean Look, Attract, Sleep Talk, Heal Bell, Safeguard, Pain Split, Baton Pass, Encore, Sweet Scent, Morning Sun, Synthesis, Moonlight, Rain Dance, Sunny Day, Psych Up, Stockpile, Swallow, Hail, Torment, Flatter, Will O Wisp, Memento, Follow Me, Nature Power, Charge, Taunt, Helping Hand, Trick, Role Play, Wish, Assist, Ingrain, Magic Coat, Recycle, Yawn, Skill Swap, Imprison, Refresh, Grudge, Snatch, Camouflage, Tail Glow, FeatherDance, Teeter Dance, Mud Sport, Slack Off, Aromatherapy, Fake Tears, Odor Sleuth, Metal Sound, GrassWhistle, Tickle, Cosmic Power, Iron Defense, Block, Howl, Bulk Up, Water Sport, Calm Mind, Dragon Dance.

All these status entries use the zero-BP formatting behavior under the neutral fixture. The shared Shedinja heuristic can instead report 1 for applicable Toxic, Poison Gas, Poison Powder, Will-O-Wisp, Sandstorm, Hail, Confuse Ray, Flatter, Supersonic, Swagger, Sweet Kiss, Teeter Dance, Leech Seed, Ghost-user Curse and Skill Swap cases. Trick is also referenced for dangerous held items, mostly later-generation items. This is an at-a-glance fatality shortcut, not supported status damage simulation; ordinary legitimate Gen III status moves still have no immediate damage range to calculate.

The **17 GENERIC FALLBACK** entries below do display numeric damage; do not incorrectly add them to NO CALC or call the display accurate special support. Their ordinary-case results can be meaningful while essential conditional/special outcomes are missing.

## G. Generic fallback cases

| Move | Actual engine behavior | Manual limitation |
| --- | --- | --- |
| Guillotine | bp1 conventional rolls; isMLG Sturdy gate and OHKO text, not target-HP damage | No faithful power-only override; changing power cannot implement OHKO rules |
| Gust | Normal connected damage only; missing target Fly/Dig/Dive/Minimize bonus as applicable | Doubling power is not a verified replacement for script damage multiplier |
| Stomp | Normal connected damage only; missing target Fly/Dig/Dive/Minimize bonus as applicable | Doubling power is not a verified replacement for script damage multiplier |
| Horn Drill | bp1 conventional rolls; isMLG Sturdy gate and OHKO text, not target-HP damage | No faithful power-only override; changing power cannot implement OHKO rules |
| Surf | Normal connected damage only; missing target Fly/Dig/Dive/Minimize bonus as applicable | Doubling power is not a verified replacement for script damage multiplier |
| Earthquake | Normal connected damage only; missing target Fly/Dig/Dive/Minimize bonus as applicable | Doubling power is not a verified replacement for script damage multiplier |
| Fissure | bp1 conventional rolls; isMLG Sturdy gate and OHKO text, not target-HP damage | No faithful power-only override; changing power cannot implement OHKO rules |
| False Swipe | Ordinary40 power, no currentHP-minus1 cap | No faithful power-only override for per-roll cap |
| Present | Defaultbp1 ordinary damage; no Present branch/healing outcome | Power40/80/120 can calculate individual damaging branches; probabilities/healing require external interpretation |
| Pursuit | Ordinary40 power, no switching-target post-+2 multiplier | Power80 approximates switching bonus but has wrong +2/truncation ordering |
| Twister | Normal connected damage only; missing target Fly/Dig/Dive/Minimize bonus as applicable | Doubling power is not a verified replacement for script damage multiplier |
| Future Sight | Ordinary type/stat formula; Wonder Guard exemption alone does not implement delayed attack | No faithful power-only override |
| Whirlpool | Normal connected damage only; missing target Fly/Dig/Dive/Minimize bonus as applicable | Doubling power is not a verified replacement for script damage multiplier |
| Spit Up | Defaultbp1 ordinary formula, no stockpile count or script arithmetic | No faithful power-only override |
| Endeavor | Defaultbp1 ordinary formula, no HP-difference or failure rule | No faithful power-only override |
| Sheer Cold | bp1 conventional rolls; isMLG Sturdy gate and OHKO text, not target-HP damage | No faithful power-only override; changing power cannot implement OHKO rules |
| Doom Desire | Ordinary type/stat formula; Wonder Guard exemption alone does not implement delayed attack | No faithful power-only override |

For Gust/Twister, Earthquake, Surf/Whirlpool and Stomp the absent state is Fly, Dig, Dive or Minimize respectively. Companion also omits those conditional target-state bonuses. Magnitude is primary MANUAL for its random-strength powers but also lacks its Dig bonus. Other ordinary execution restrictions (Dream Eater, Snore, Fake Out, Focus Punch, recharge/charging, etc.) are outside connected-damage preview support; they are not inferred to be full turn simulation simply because their rows say STANDARD.

## H. Comparison with Emerald Companion

### Compact unusual-move decision table

| Family | EisenCalc Emerald behavior | Companion current behavior | Assessment |
| --- | --- | --- | --- |
| Magnitude |150 default; manual power | Seven separate powers and known probabilities | Companion more complete |
| Psywave | Maximum singleton only | All 11 level rolls with frequencies | Companion more complete; verify level1 minimum |
| Present | BP1 fallback; manual branch powers | Three 16-roll branches + exact chances + healing note | Companion more complete |
| Counter / Mirror Coat / Bide / Beat Up | BP0, zero, nice move | Explicitly unavailable | Neither calculates actual special damage |
| OHKO four | BP1 damage + Sturdy gate + OHKO text | Explicitly unsupported | Eisen text is not valid OHKO damage |
| Future Sight / Doom Desire | Ordinary typed formula | Explicitly unsupported | Do not imitate fallback |
| Pursuit | Ordinary40; manual80 is different arithmetic | Normal and switching multiplier outcomes | Companion more complete |
| Revenge | Ordinary60 or doubled named alias | Separate conditional branches | Equivalent selected branch possible; Companion presents both |
| Rollout / Ice Ball / Fury Cutter | Manual stage powers | All stages; Curl alternatives where applicable | Companion more complete |
| Variable multi-hit | Selected-count independent convolution | Exact weighted 2–5 distribution | Companion more complete |
| Fixed two-hit / Triple Kick | Independent connected-hit convolution | Independent aggregate distributions | Same modeled connected-hit scope; Eisen can select fewer Triple Kick hits |
| Four fixed moves / Super Fang | Singleton helpers | Explicit deterministic outcomes | Comparable numeric formulas; result-state distinctions differ |
| Endeavor / False Swipe | Conventional placeholder / uncapped | HP difference/failure / individual cap | Companion more complete |
| HP powers / Low Kick / Hidden Power | HP/weight helpers; IV or typed input paths | Automatic actual HP/weight/IV resolver | Broadly equivalent mechanics with matched inputs; metadata/input caveats |
| Weather Ball / SolarBeam | Resolved type, post+2 doubling / adverse-weather half | Same stage ordering, scenario-aware weather | Comparable known state; Companion better unknown branches |
| Explosion / Self Destruct | Defense halving; no Damp gate | Defense halving and either-side Damp | Companion more complete |
| Struggle | Typeless physical/no STAB | Same damage scope | Already sufficiently supported |

### Equivalent ordinary damage and intentional omissions

The **152 STANDARD entries** (complete list below) use the conventional Gen III path in both calculators. This is a path-equivalence inventory, not a proof of universal equality: Uproar/Soundproof and global ability/item exceptions are explicit caveats. The controlled neutral-fixture sweep found **169 exact conventional 16-array matches** across Companion's 175 conventional-result entries, including dynamic/special cases. Four additional Ghost-type attacks had zero damage in both but different array lengths; Frustration used different resolved power (Companion friendship255 versus Eisen default102), and Low Kick used different defender weight (canonical Snorlax460 kg versus synthetic Eisen100 kg). Those latter two are input mismatches, not arithmetic bugs. Do not interpret this one fixture as exhaustive cartridge validation.

Pound, Karate Chop, Mega Punch, Pay Day, Fire Punch, Ice Punch, ThunderPunch, Scratch, ViceGrip, Razor Wind, Cut, Wing Attack, Fly, Bind, Slam, Vine Whip, Mega Kick, Jump Kick, Rolling Kick, Headbutt, Horn Attack, Tackle, Body Slam, Wrap, Take Down, Thrash, Double Edge, Poison Sting, Bite, Acid, Ember, Flamethrower, Water Gun, Hydro Pump, Ice Beam, Blizzard, Psybeam, Bubble Beam, Aurora Beam, Hyper Beam, Peck, Drill Peck, Submission, Strength, Absorb, Mega Drain, Razor Leaf, Petal Dance, Fire Spin, Thunder Shock, Thunderbolt, Thunder, Rock Throw, Dig, Confusion, Psychic, Quick Attack, Rage, Egg Bomb, Lick, Smog, Sludge, Bone Club, Fire Blast, Waterfall, Clamp, Swift, Skull Bash, Constrict, Hi Jump Kick, Dream Eater, Leech Life, Sky Attack, Bubble, Dizzy Punch, Crabhammer, Rock Slide, Hyper Fang, Tri Attack, Slash, Thief, Flame Wheel, Snore, Aeroblast, Powder Snow, Mach Punch, Faint Attack, Sludge Bomb, Mud Slap, Octazooka, Zap Cannon, Icy Wind, Outrage, Giga Drain, Spark, Steel Wing, Sacred Fire, DynamicPunch, Megahorn, DragonBreath, Rapid Spin, Iron Tail, Metal Claw, Vital Throw, Cross Chop, Crunch, ExtremeSpeed, AncientPower, Shadow Ball, Rock Smash, Fake Out, Uproar, Heat Wave, Focus Punch, Superpower, Knock Off, Secret Power, Dive, Luster Purge, Mist Ball, Blaze Kick, Needle Arm, Hyper Voice, Poison Fang, Crush Claw, Blast Burn, Hydro Cannon, Meteor Mash, Astonish, Air Cutter, Overheat, Rock Tomb, Silver Wind, Signal Beam, Shadow Punch, Extrasensory, Sky Uppercut, Sand Tomb, Muddy Water, Aerial Ace, Dragon Claw, Frenzy Plant, Bounce, Mud Shot, Poison Tail, Covet, Volt Tackle, Magical Leaf, Leaf Blade, Shock Wave, Water Pulse, Psycho Boost.

Companion intentionally leaves these **11 damaging moves unavailable:** Guillotine, Horn Drill, Counter, Fissure, Bide, Mirror Coat, Future Sight, Beat Up, Spit Up, Sheer Cold, Doom Desire. EisenCalc has no demonstrably complete implementation of these just because some show a number. Both omit various target volatile states and full-turn execution outcomes.

### Abilities, items and uncertainty

EisenCalc uses one selected ability per Pokémon. Companion branches known plausible abilities and groups full outcomes/distributions, including blocked, immune, unavailable, deterministic and aggregate distinctions. A manually selected ability in EisenCalc is not equivalent to automatic uncertain-ability handling.

- Both have Wonder Guard, absorption/Levitate checks, selected offensive abilities, type items and weather suppression; applicability must be traced before treating a singleton or typeless result as ordinary damage. Eisen explicitly exempts Struggle, Beat Up, Future Sight and Doom Desire from Wonder Guard, but other absent mechanics still invalidate the latter three as complete calculations.
- Eisen ADV has **no Damp prevention**. Explosion still gives damage with Damp on either selected Pokémon. Companion explicitly prevents it.
- Resolved ADV sound flags cover damaging **Snore and Hyper Voice**, but omit **Uproar**. Thus its Soundproof gate misses Uproar; Companion uses an Emerald identity list and blocks it. Status sound moves already exit via BP0 and do not prove Soundproof execution support.
- Eisen's Flash Fire gate has no frozen-defender exception; Companion implements that exception. Eisen applies Soul Dew to Latios/Latias without the Companion Frontier-facility gate. These are global caveats across applicable move rows.
- Eisen prepares Cloud Nine/Air Lock and Forecast, including Castform form/type changes. Companion suppresses weather per ability scenario while retaining the selected condition; suppressor/Forecast combinations needing unsupported type transitions remain explicit. Eisen offers broader field inputs such as Charge/Helping Hand and Doubles format; these are broader UI/state coverage, **not automatically more accurate Emerald mechanics**. Doubles screens do not track a one-remaining-defender exception in Eisen's ADV formula. No Doubles implementation is recommended here.
- Eisen's UI also computes KO/recovery/recoil text. Those are outside this audit's damage scope and Companion's current connected-hit model; their presence does not establish correctness of an unsupported move.

### Controlled runtime observations

Fixture: level50 Snorlax versus Snorlax, Normal type, all offensive/defensive stats100, HPmax200/current100, neutral stages, Hardy, Immunity, no item/weather/screens/crit; Eisen weight100 kg deliberately synthetic. Specific overrides are indicated. Values are HP damage, not percentages. Direct ADV engine plus `DamageInfo` ran in Node VM with DOM callbacks suppressed; these are **not live browser click tests**.

| Probe | EisenCalc result | Interpretation / Companion comparison |
| --- | --- | --- |
| Magnitude default150 / override10 |57–68 / 5–6 | Editable power, no random-strength distribution |
| Psywave level50 / level1 |75 only / 1 only | Companion level50 includes25–75; low-level minimum issue below |
| Present default1 / override40 |3–4 / 23–28 | Placeholder versus an actual branch |
| Endeavor attacker50,target180HP |3–4 | Correct HP difference is130; Companion computes it |
| False Swipe target1HP |23–28 | Companion caps every roll to0 |
| Explosion, Damp on target or attacker |283–333 in either case | Companion reports prevented |
| Pursuit40 / editable80 |16–19 / 31–37 | Correct switching post+2 double gives32–38, as Companion models |
| Revenge (Doubled) |95–112 | Alias preserves post+2 multiplier unlike editable120 |
| Future Sight against Dark |0 | Delayed-attack typeless exception absent |
| Doom Desire, Attack150/SpA50 |68–81 | Description says Atk; ordinary physical Steel path |
| Guillotine / target Sturdy |3–4 / 0 | Placeholder damage plus ability gate, not OHKO formula |
| Double Kick |50–60, frequency total256 | Independent two-hit rolls |
| Triple Kick |52–62, frequency total4096 | Three independent10/20/30 powers |
| Bullet Seed default3 hits |15–18, frequency total4096 | Selected3, not random count mixture |
| Flamethrower against frozen Flash Fire |0 | Frozen exception absent |
| Uproar / Snore / Hyper Voice against Soundproof |30–36 / 0 / 0 | Uproar sound flag absent in ADV |
| Toxic against1HP Wonder Guard Shedinja |1 | Fatality heuristic; not direct Toxic damage |

### Psywave minimum at level 1: intentional divergence pending verification

Pinned Emerald `Cmd_psywavedamageeffect()` rejects r>10 from a 0–15 sample, then assigns `level * (50 + 10r) / 100` with integer division. At level1 this expression can be **zero**. Its battle script calls `typecalc`, clears effectiveness flags, invokes the Psywave command and then `adjustsetdamage`. The inspected `Cmd_adjustsetdamage()` does not add a general minimum-one clamp. Companion deliberately uses `max(1, ...)` per Step6J-1 requirements and existing documentation/tests. **Flag as a possible intentional cartridge divergence; verify the full zero-damage controller/script behavior or a ROM trace before changing it.** Eisen's maximum-only singleton does not resolve that question. At normal level50/60/100 the zero issue is irrelevant, but Eisen still omits ten other equally likely r selections.

## I. Evidence, source version and reproducibility

Audit date: 2026-10-24 America/Chicago (UTC acquisition crosses into October25). EisenCalc pinned commit **`8a26613e3df576c2db337f1c3de3580149ca7841`**, timestamp **2026-10-21T22:01:48-06:00**, subject “Merge pull request #111 from ammunta/master”. The six deployed calculation scripts below were downloaded and compared byte-for-byte with this repository revision; they matched. This does not pin future deployments or all assets/set data.

| Source | Relevant functions / evidence |
| --- | --- |
| [index.html](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/index.html) | Script loading, game selector |
| [_scripts/shared_calc.js#L1777](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/shared_calc.js#L1777) | setGenProperties: Emerald dispatch |
| [_scripts/shared_calc.js#L748](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/shared_calc.js#L748) | Default selected hit count |
| [_scripts/shared_calc.js#L777](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/shared_calc.js#L777) | Move selection and editable metadata |
| [_scripts/shared_calc.js#L1251](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/shared_calc.js#L1251) | getMoveDetails: selected power/type/crit/hits |
| [_scripts/game_data/move_data.js#L1391](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/game_data/move_data.js#L1391) | Resolved MOVES_ADV inheritance and overrides |
| [_scripts/damage_gen3.js#L35](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/damage_gen3.js#L35) | getDamageResultADV: complete active Gen III calculation |
| [_scripts/damage_modern.js#L1497](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/damage_modern.js#L1497) | killsShedinja fatality shortcut |
| [_scripts/damage_modern.js#L1522](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/damage_modern.js#L1522) | getSingletonDamage including maximum-only Psywave |
| [_scripts/damage_modern.js#L1577](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/damage_modern.js#L1577) | checkAirLock and checkForecast |
| [_scripts/damage_modern.js#L1847](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/damage_modern.js#L1847) | getHiddenPower IV formula |
| [_scripts/damage_gen4.js#L553](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/damage_gen4.js#L553) | getTripleKickDamage actively called by ADV |
| [_scripts/shared_calc.js#L1580](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/shared_calc.js#L1580) | Independent damage-map construction and convolution |
| [_scripts/shared_calc.js#L1664](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/shared_calc.js#L1664) | getAssembledDamageInfo / DamageInfo |
| [_scripts/ap_calc.js#L176](https://github.com/to-metrion/to-metrion.github.io/blob/8a26613e3df576c2db337f1c3de3580149ca7841/_scripts/ap_calc.js#L176) | setDamageText: zero-power nice move, isMLG, noKOChance |

Cartridge authority is [pret/pokeemerald revision `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`](https://github.com/pret/pokeemerald/tree/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881), fetched for this audit:

- [src/pokemon.c — CalculateBaseDamage](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/pokemon.c): Gen III stats, items, screens and integer formula.
- [src/battle_script_commands.c — Cmd_psywavedamageeffect, line7932](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L7932): exact rejected-sample level formula.
- [Cmd_presentdamagecalculation, line8613](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L8613): thresholds102/178/204 out of256.
- [Cmd_magnitudedamagecalculation, line8670](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L8670): seven strengths and 5/10/20/30/20/10/5 nominal percent thresholds.
- [Cmd_stockpiletobasedamage, line6868](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L6868): base damage multiplied by stockpile count, not a generic BP1 calculation.
- [Cmd_adjustsetdamage, line5861](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L5861): False Swipe cap and no generic Psywave minimum clamp.
- [Cmd_tryexplosion vicinity, line6546](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_script_commands.c#L6546): active-battler Damp prevention.
- [data/battle_scripts_1.s, Psywave script line1206](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/data/battle_scripts_1.s#L1206) and [Spit Up script line2094](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/data/battle_scripts_1.s#L2094): script order distinguishes these from conventional random/critical damage.

Source-level conclusions are verified for the inspected snapshots. General cartridge assertions beyond those traced paths, complete transient-state simulation, ROM execution, and live browser interaction were **not** exhaustively verified. Some probability descriptions use conventional uniform PRNG-selection interpretation; this is not an audit of hardware PRNG modulo bias.

### Local Companion evidence

Reviewed `docs/GEN_III_MOVE_COMPATIBILITY.md` (including follow-up Steps6A–6J-1), `src/data/reference.json`, `src/battle/reference.js`, `coreDamage.js`, `dynamicMoves.js`, `deterministicDamage.js`, `conditionalDamage.js`, `twoHitDamage.js`, `abilityScenarios.js`, `abilityPrevention.js`, weather/item helpers, and `BattleMoveDetails.jsx`/presentation helpers. The previous compatibility CSV represents an earlier audit and was not treated as current support truth. CSV move IDs0–354 and original names/power/type come from current Companion resources; Gen III category is type-based, with status entries labeled Status and the sentinel N/A.

Resolved ADV has **371 keys**, including `(No Move)`, typed Hidden Power forms and an extra Revenge variant. It is not a 371-real-move Emerald inventory. Name aliases include Self Destruct → Self-Destruct, ViceGrip → Vise Grip, Hi Jump Kick → High Jump Kick, Faint Attack → Feint Attack, SmellingSalt → Smelling Salts, and the Hidden Power family. Punctuation/space normalization maps the remaining names. None of the354 real entries was unmapped.

### Deployed script hashes (SHA-256)

| Path relative to EisenCalc site | SHA-256 |
| --- | --- |
| `_scripts/damage_gen3.js` | `b3ab2b12527cb64fc581ebe5e80fba7eb7773c5ab685bcd1660dccaa3f992e8a` |
| `_scripts/game_data/move_data.js` | `d02530946d00e765774a3acd59753e6341314711a52085e5ac15a5eefc27e4f5` |
| `_scripts/shared_calc.js` | `26bafad1607302d2aa5c03b25ff368b9c67e240d9f4048611b87471a74260a3e` |
| `_scripts/damage_modern.js` | `8afd3153ac1b1cfb7d9c6c3da7fffc0092774f5eb4bdc6d66ae429bb7ebe2694` |
| `_scripts/damage_gen4.js` | `4078eae554d77f15959f20193993b4bf19acf81bf0cfcdbacd52516737c3948c` |
| `_scripts/ap_calc.js` | `545df88a7a5bddbf6f1c4a06f43b64a092098d64e14cf89604ba8511dc94917b` |

### Reproduction procedure

1. Clone the source into a scratch directory; check out the pinned SHA above. Do not run against a mutable default branch.
2. Load scripts in Node `vm` in this order: stat_data, type_data, nature_data, item_data, move_data (under `_scripts/game_data`); shared_calc, damage_modern, damage_gen4, damage_gen3, ap_calc (under `_scripts`). Stub DOM-ready/event registration so browser callbacks do not run; provide a recursive jQuery `extend` because it constructs inherited move tables. No production source needs editing.
3. Set `gen=3`, `gameId=3`, `moves=MOVES_ADV`, `typeChart=TYPE_CHART_GSC`, `STATS=STATS_GSC`; provide empty setdex/pokedex for synthetic fixture descriptions. Serialize `MOVES_ADV`, not a later table. All371 keys were exercised without engine exceptions under the neutral fixture.
4. Construct the fixture described in H. Required Eisen fields are `rawStats`/`stats` keys at/df/sa/sd/sp100, `boosts` and `evs` zero, HPEVs0, level50, type1Normal/type2empty, curHP100/maxHP200, nameSnorlax, setNameFixture, natureHardy, ability/curAbilityImmunity, itemempty, statusHealthy, weight100, isAbilityActivatedfalse, plus `hasType(t)`.
5. Copy the selected `moves[name]` object, add `name`, `isCrit:false`, and hits2 for isTwoHit, hits3 for Triple Kick or maxMultiHits, otherwise1. Apply probe overrides from H. Use field `{weather:'', format:'singles'}`. Run:

```js
const result = getDamageResultADV(attacker, defender, move, field);
const info = DamageInfo(result, move.hits);
console.log(result.damage, info.min, info.max, [...info.damageMap]);
```

6. For suppression/Forecast checks use the `CALCULATE_ALL_MOVES_ADV` wrapper or call its preparation helpers first; directly invoking only `getDamageResultADV` does not prepare weather suppression. For UI messages trace `setDamageText` rather than inferring them from damage arrays. For real UI defaults use the selection handler, not an arbitrary `hits:1` fixture.
7. Extract Companion entries through `battleMove(id)` for0–354 and call `calculateCoreDamage` with equivalent explicit inputs. Preserve result kinds and full distributions; do not compare only min/max. The audit's Companion fixture used dex143, level50, Normal, Immunity, None item, statusnone, friendship255, currentHp100, statsHP200/other100, all IV31. The weight/friendship differences noted in H explain mismatched dynamic powers.
8. Validate CSV row count355, unique IDs0–354, complete mapping, and class sum355. This audit ran these checks and the source-level runtime probes. Source versions and hashes make findings re-checkable after upstream changes.

No unit suite, production build or WebKit suite was rerun: this request changes only two research artifacts. **775 passing tests is the user-provided pre-audit baseline, not a newly claimed run.** No live end-to-end UI or ROM accuracy test was performed. Runtime scripts, cloned upstream sources and downloaded evidence stayed in scratch storage; no EisenCalc source was copied into application code.

## J. Recommended priorities for the final compatibility review

| Priority / disposition | Recommendation | Reason |
| --- | --- | --- |
| Needs further verification | Psywave level1 minimum and zero-damage script/controller behavior | Current minimum1 is intentional by requested specification; inspected arithmetic can yield0. Resolve before claiming cartridge identity. |
| Worth implementing in a separately approved step | Target Fly/Dig/Dive/Minimize bonus states, if scope/state model permits | Both previews omit meaningful conditional bonuses; BP scaling can have incorrect integer order. No new controls are proposed by this audit. |
| Already sufficiently supported for current scope | Magnitude, Present damaging branches, Psywave ordinary levels, Pursuit/Revenge, consecutive powers, fixed damage, HP powers, False Swipe, multi-hit distributions | Companion already covers more than EisenCalc's defaults; preserve separate outcomes and exact frequencies. |
| Already sufficiently supported with documented limits | Weather Ball/SolarBeam, screens, Struggle, Explosion Defense, ability uncertainty and Damp | Do not regress to EisenCalc placeholder/zero-result behavior. Keep mixed-crit, additional-battler and transient-state limitations explicit. |
| Reasonable to leave unsupported | Counter, Mirror Coat, Bide, Beat Up, Spit Up | Require prior damage/party/stockpile or script-specific context; EisenCalc offers no complete reference implementation. |
| Reasonable to leave unsupported until separately scoped | OHKO moves, Future Sight, Doom Desire | Require materially different result/temporal rules. An ordinary number and an OHKO label are not support. |
| Needs further verification before claiming broad equivalence | Forecast transitions, full ability/item edge cases, execution-only restrictions | Selected ordinary damage does not validate full turn behavior. Use Emerald source/ROM as final authority, not calculator popularity. |

No recommendation was implemented. This audit ends here.
