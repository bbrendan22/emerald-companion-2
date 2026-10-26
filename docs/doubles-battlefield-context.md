# Doubles battlefield context — Step 4C

The actual Battle page passes its saved Pokémon records through `BattleMatchup`
and `BattleMoveDetails` to `evaluateFrontierCandidates`. For Doubles, evaluation
adds a derived `battleContext.battlefield` object and passes that same context
through the existing ability-scenario and core-damage calls.

## Data

- `player` and `enemy` are arrays of two fixed active-slot positions. Empty
  positions are `null`; assigned fainted Pokémon remain present.
- Each populated slot contains its side/index, identity, Step 4B liveness,
  projected existing `pokemon` model, and slot conditions. Opponents also retain
  their selected Set ID, observations, and canonical construction candidate.
- `viewed` preserves the independent Step 1 indices. `attacking` and `defending`
  identify the calculation's actual side/slot, including reverse damage.
- `field` contains the shared weather/critical conditions; `sides` contains each
  side's screens and automatically derived living count.

Opponent construction reuses `frontierMatchupCandidates` with a slot-specific
matchup projection, so Step 4A selections and observations apply independently.
The viewed opponent's construction is reused rather than built twice. Pokémon
projection reuses the prior candidate evaluator's projection function, now
shared as `projectBattlePokemon`. Missing HP retains full HP; explicit zero
retains fainted liveness. No inputs or canonical sources are mutated.

Missing player records or unavailable opponent construction leave an assigned
slot explicit with `pokemon: null`, `availability: 'unavailable'`, and a reason.
Legacy direct callers can still omit records; their unprovided partners are
unavailable rather than fabricated. The actual Battle page supplies all records.

Popup memoization includes saved records, the per-slot opponent Set map, viewing
indices, and the existing roster/observation/condition/field dependencies. An
unviewed Set change therefore refreshes the field while the viewed move popup
remains open. This context is calculation-local, not persisted battle state.

## Step 4D boundaries

The core receives the field but does not yet consume its partner information.
Existing viewed-pair results, spread/screens arithmetic, and unseen-field
ability safeguards remain intact. Field-wide weather suppression, Damp,
Plus/Minus resolution, and targeting/redirection need separate integration.
Ability uncertainty and Trace/copy state remain in their existing models; field
abilities are not automatically activated or pinned to a speculative branch.

Per-hit behavior for a viewed fainted attacker/defender is unchanged. Empty and
fainted slots must not be conflated when implementing future ability lookups;
Emerald's different HP/absence checks and any retained battler-record history
still need mechanic-specific treatment. No event tracking was introduced.

Singles receives no new battlefield object. The 10,620-result Singles snapshot
continues to protect its existing damage calculations.

`test/battlefieldContext.browser.mjs` observes the actual application page,
popup, candidate evaluator, and core using test-only Vite instrumentation. It
checks four view pairings, independent Sets, an unviewed Set update while a modal
is open, liveness, and narrow mobile layout. Production has no test hooks.
