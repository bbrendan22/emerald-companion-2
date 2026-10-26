# Lightning Rod targeting — Step 4E

## Emerald authority

Verified against [HandleAction_UseMove and GetMoveTarget](https://github.com/pret/pokeemerald/blob/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/src/battle_util.c#L139-L249)
in pret/pokeemerald revision `731ad5bfd6e6f265508d0efcca0ba42f9dcf5881`.

- Eligibility uses the original move-table Electric type, before dynamic damage
  typing. Thunder Wave qualifies; zero-power USER-target Charge does not.
  Electric Hidden Power is not eligible.
- The action-time scan considers opposing battlers, excluding the originally
  selected target. If that target already has Lightning Rod, it stays selected.
- The general scan ranks other opposing holders by existing turn order. In this
  app's two-by-two selected-opponent matchup, only one other opposing slot exists;
  no Speed heuristic or turn-order state is necessary. Attacking-side holders do
  not redirect these selected-opponent moves.
- The scan checks neither HP nor absence flags. A known fainted holder is not
  skipped. Explicitly empty app slots are absent and do not supply a holder.
  Missing or unresolved populated records remain uncertain.
- Lightning Rod supplies no Electric immunity or Special Attack boost here.
  Ordinary typing still applies, including Ground immunity.

## Implementation

`lightningRodTarget.js` resolves targets ahead of arithmetic, using the existing
Step 4C context and Step 4D pinned ability branches. It returns selected,
redirected, or unresolved targeting without changing assignments or views.
Only eligible moves branch on hidden Lightning Rod alternatives, and only on
the defending side. A selected holder takes precedence over another holder.

For a known live destination, the existing core receives that slot's already
projected Pokémon: canonical Set, stats, item, typing, ability, HP, status,
stages, and screens. The calculation context points to the actual defender while
retaining the original defender's pinned ability as hidden field evidence. This
preserves correlated field modifiers after redirection.

Scenario provenance retains the original selection and actual target. Damage
percentages and KO calculations use the actual target's maximum/current HP.
Different target identities cannot collapse merely because rolls agree. The
existing ability rows display normal and redirected possibilities separately;
aggregation withholds combined damage/KO bounds across different targets. Minimal
target text precedes numbers, including for status-move explanations. No controls
or popup layout were added.

## Explicit limits

A redirect to a known fainted slot reports its identity but withholds damage;
this step does not simulate execution against an absent/fainted record. Missing
populated records, invalid destination HP, or unresolved copied Trace do not acquire a
guessed target. General viewed-fainted per-hit behavior remains unchanged.

Follow Me has precedence in the source but its active timer is not tracked in
this calculator; previews assume it is inactive. Allied-target choices, called
move execution, Protect, and general turn simulation are not implemented. An
unsupported target position is reported rather than choosing between multiple
possible opposing holders without turn information. No Step 4F work was added.

## Tests

`lightningRodTarget.test.js` covers the canonical eligibility list, selected
holder precedence, both directions, all viewed pairs, fainted/empty records,
unknown abilities, non-Ground redirected damage, actual target HP/KO inputs,
Set and observation provenance, correlated Plus/Minus evidence, status moves,
Singles, and popup rendering. `lightningRodTarget.browser.mjs` exercises an
imported synthetic save through the actual Battle page and popup in WebKit,
including uncertainty rows, unviewed Set refresh, observed ability changes,
Electric Hidden Power, reverse damage to Manectric, and narrow layouts.

## Empty-slot bug fix

The original helper incorrectly sent an explicit `null` (the Step 4C confirmed
empty-slot representation) through the same ability query as a populated slot
with missing Pokémon data. Aggron Set 3 Thunder against Swellow therefore acquired
an invented potential holder in player Slot 2. Adding Swampert resolved that
query to known Torrent and removed the warning. The opponent's empty slot is on
the attacking side for this incoming move and is irrelevant to this lookup.

The helper now returns the selected target when the eligible other slot is
explicitly null. Undefined/missing slot data, populated unavailable records, and
unresolved Trace remain guarded. Assigned zero-HP holders retain the source's
HP-independent lookup and the existing fainted-destination limitation. No
historical battler is inferred from a deliberately cleared roster assignment;
no history system or global safeguard change was introduced.

Regression coverage: `lightningRodEmptySlot.test.js` and
`lightningRodEmptySlot.browser.mjs`, including the exact Level 50 Swellow/Aggron
Set 3 setup and each second-slot occupancy permutation.
