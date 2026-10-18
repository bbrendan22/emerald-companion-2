> Historical Stage4.8 presentation record. See [current Battle architecture](BATTLE_ARCHITECTURE.md) for current calculator scope, state ownership and tests.

# Matchup presentation (Stage 4.8B)

Player numerical stats come directly from the existing imported-record adapter;
Matchup never recalculates them. Opponent stats still use `toTowerOpponent`.
`frontierSetStats` is the existing stat loop extracted for reuse, not a second
stat implementation.

Bar ranges use all 882 migrated ordinary Frontier sets plus the six supported
Anabel sets, independently for each of the six stats at the chosen battle level.
Ordinary reference sets use the selected trainer's IV tier. With no trainer, or
Anabel selected, ordinary reference sets use the approved 31-IV fallback.
Anabel sets always retain their own fixed IVs. Abilities, field conditions and
selected team members do not alter this reference population. Ranges are cached
by level and ordinary IV tier; both sides use the same ranges. The linear scale
maps the endpoints to 5% and 100% and clamps outside values. A degenerate equal
range maps values at/below the common value to 5%, and higher values to 100%.

Displayed numerical Attack, Defense, Special Attack, Special Defense and Speed
use the existing Gen 3 `stageStat` helper with persistent side stages. Maximum HP
is unchanged. Speed highlighting compares these adjusted display values. Weather,
status and ability modifiers are not added to this display. Stat bars continue
using original stats and their existing reference scale.

Player PP uses saved current PP and saved PP Ups with the canonical base PP.
Opponent rows show `PP n` (base maximum, no invented observed current PP or PP Ups).
Effectiveness reuses the Gen 3 foundation, including Hidden Power and possible
ability scenarios. Ambiguous outcomes and special damage mechanics show `*`;
missing targets and non-damaging moves show `-`. Numeric effectiveness uses
`0x`, `.25x`, `.5x`, `1x`, `2x`, or `4x`. Struggle is marked special
because Generation 3 ignores its nominal Normal typing. Damage results are now added only inside the move popup; move-row effectiveness remains unchanged.

The popup shows canonical Gen 3 base data, compact variable-power ranges or
mechanic labels, and level-based OHKO accuracy rather than the nominal 30%.
Secondary effect percentages are limited to applicable secondary-effect codes;
primary effects such as trapping, theft, mandatory self stat drops, or Toxic
are not presented as secondary probabilities. These are reference values:
conditions such as weather and abilities do not modify popup values yet.

Possible opponent abilities rotate every three seconds and reserve the same
footprint for every option. The full uncertainty description
is available to assistive technology and as a title. A native modal dialog traps
interaction above the page, supports Escape/close/outside tap, and restores focus.
No page scroll locking or damage placeholder is added.

## Active team and Frontier hub

Each Matchup side renders its card, Stats and Moves independently when its active
identity resolves. An absent side has no placeholder and the other side stays in
its original half-width column. Neither side selected leaves the grid empty.
Speed comparison requires both sides; effectiveness shows `-` without a target.
Stage 4.8C Battle Conditions appear only with both active selections; hiding
those controls preserves their values until manual changes or Reset. An explicit cleared player selection survives navigation and
collection refresh.

The Teams tab's Frontier hub uses the existing role-filtered, identity-bearing
pool. Adding appends one individual to the active team (three maximum), selects
it and opens Matchup. It never writes saved team definitions. Removing compacts
remaining members in stable order and clears the active identity if removed.
Empty player/opponent slots open Teams/Sets respectively.

Header gestures select on a single click/tap and remove once on a double click
or two nearby touch releases within 350 ms. A 400 ms consume guard prevents a
compatibility click or rapid third tap from acting on a shifted slot. Delete and
Backspace provide keyboard removal. Trainer-name single taps are harmless;
double taps use the condition-preserving trainer reset, clear
the opponent roster/medal/search and open all Sets. Player team/active selection,
rules, field, HP and condition records are retained.


## Stage 4.8C conditions

The existing `hpByPokemon`, `conditionsByPokemon` and `field` state own all
controls. HP/status use `my-<stable identity>` and `enemy-<set ID>`. The opponent
set ID is the stable identity available in this manual assistant; changing a
trainer does not discard that set's entries. Stages live in `field.playerStages`
and `field.enemyStages`, and screens use the existing per-side screen maps.
Weather/critical hit stay in `field`; `conditionsExpanded` is shared session
state. Trainer selection/removal and Pokémon removal no longer clear any of
these values. No automatic switch/Baton Pass inference is performed.

`conditionedBattlePokemon` projects these values into the existing Gen 3 engine
shape without mutating an adapted Pokémon or imported save. The Sets Speed
comparison uses this projection. Matchup stat bars, move effectiveness and basic move popup keep their approved
behavior; numerical stats and Speed comparison now reflect stage modifiers;
Stage 4.9 now consumes the projection inside the move popup. Tests feed it to
the existing damage and Speed utilities.

Initial player HP uses recorded party HP when available, otherwise full HP.
Opponents start at their calculated maximum. Inputs clamp to 0–maximum and whole
HP; an empty input commits 0 on blur. A lower maximum (for example after a rule
change) clamps the projected value without erasing the saved manual entry.
Reset clears every identity's HP/status entries, both sides' stages/screens,
weather and critical hit, so active HP returns to its recorded/full initial value.
Reset preserves expansion, teams, active identities, trainer and rules. Conditions
are session state, with the same lifetime as the rest of the shared Battle state.

Controls mirror the read-only 1.0 BattleConditionSide: five weather options,
critical hit, HP, seven status choices, five -6…+6 stat stages, Reflect and Light
Screen. The legacy interface had no Accuracy/Evasion controls. Graphite controls
use 16px input text to avoid iPhone focus zoom, square borders and natural page
scrolling. Reset is accessible in both collapsed and expanded states.

### Stage 4.8C file list

Added:
- `src/battle/conditionState.js`
- `src/ui/components/BattleConditions.jsx`
- `test/conditionState.test.js`
- `test/battleConditions.browser.mjs`

Modified:
- `src/battle/battleState.js`
- `src/battle/towerRules.js`
- `src/battle/pokemonAdapter.js`
- `src/battle/setSpeedComparison.js`
- `src/ui/components/BattleMatchupShell.jsx`
- `src/ui/pages/BattlePage.jsx`
- `src/ui/styles/battle.css`
- `test/battleFoundation.test.js`
- `test/towerTrainers.test.js`
- `test/towerSets.test.js`
- `test/battleVisibility.browser.mjs`
- `docs/BATTLE_MATCHUP.md`


## Staged display stats

`stagedMatchupStats` returns a separate, flat presentation object. Stats sections
use that object only for numbers; bars still read `mon.stats`. Speed highlighting
receives the presentation objects explicitly. Original Pokémon `.stats` and the
conditioned engine projection remain untouched, so the damage engine receives
raw stats plus stages and applies the stage multiplier exactly once. Reset drops
the side stages and restores original displayed values.


Stage 4.9 is implemented in the existing popup; see `DAMAGE_CALCULATOR.md` for
engine coverage, ability grouping, KO assumptions, live-selection behavior and
the changed-file list.
