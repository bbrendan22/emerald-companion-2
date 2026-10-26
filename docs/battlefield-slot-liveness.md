# Battlefield slot liveness — Step 4B

`battlefieldSlotLiveness(state, side, slot)` derives `empty`, `active`, or
`fainted` from the existing assignment and slot HP override. Sides use the
existing `player` / `enemy` names. Doubles reads positions 0–1 on each side;
reserve positions do not contribute. No liveness flags are stored.

- No assignment means empty, even if stale conditions exist.
- An assigned Pokémon with missing/null HP retains the full-HP default.
- Explicit zero HP means fainted. Positive HP means active.
- Blank HP input commits null on blur; it never commits zero implicitly.
- Viewing a fainted occupant remains possible, including to inspect or edit HP.
- Occupant replacement/removal uses the existing per-slot condition cleanup.

`livingBattlefieldCount` supplies Doubles counts through `sideConditions` and
`matchupBattleContext`. Spread damage and screens therefore use the defending
side's actual living count immediately. The existing count row now displays
read-only values (0–2). Legacy stored `activeCount` values are ignored in Doubles,
and legacy `matchupActiveCount` actions cannot override the result. The old
stored side shape is retained for compatibility; Singles rule context and
styling are unchanged. No damage formulas were changed.

## Step 4C dependencies

All four occupants, their abilities/items, and their slot conditions still need
to be passed to the calculator. This step does not add field-ability lookups,
redirection, retained cartridge battler-record history, or a move-execution
simulator. Living counts alone must not be used to remove existing unseen-field
ability safeguards.

Core per-hit handling of a viewed zero-HP attacker/defender is unchanged;
slot liveness is now available for subsequent calculation eligibility/targeting
integration. A zero-defender count is preserved rather than invented as one or
two; existing core count guards remain unchanged.
