# Damage calculator finalization — Step 5

## Source confirmation

[Cmd_psywavedamageeffect](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L7474-L7483)
rejection-samples `Random() % 16` until the value is at most 10. With accepted
integer `r = 0..10`, damage is the integer quotient:

`floor(attackerLevel * (50 + 10*r) / 100)`

The [Psywave script](https://github.com/pret/pokeemerald/blob/master/data/battle_scripts_1.s#L1144-L1153)
checks type/ability prevention first, computes this amount, then invokes
`adjustsetdamage`. Neither [Cmd_adjustsetdamage](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L5528-L5565)
nor [Cmd_datahpupdate](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c#L1806-L1831)
introduces a minimum-one clamp.

| Attacking level | All eleven rolls | Range |
| --- | --- | --- |
| 1 | 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1 | 0–1 HP |
| 50 | 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75 | 25–75 HP |
| 100 | 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150 | 50–150 HP |

The distribution retains all eleven equally weighted accepted roll values,
including duplicate damage amounts: level 1 has zero damage with frequency 5/11
and one damage with frequency 6/11. Levels 2–100 retain their previous damage
rolls. These ranges assume a connected hit that passes applicable immunities.

## Changes

Only production file changed: `src/battle/deterministicDamage.js`.

- Remove Psywave's artificial `Math.max(1, ...)` clamp.
- Permit zero in the existing level-damage result validator.
- Keep type/ability checks, exact frequencies, grouping and formatting unchanged.

Tests:

- `test/psywaveCartridge.test.js` — new focused boundary, level sweep, immunity,
  ability-grouping and fixed-damage regression tests.
- `test/psywavePresent.test.js` — update the previous minimum-one expectations.
- `test/psywavePresentPopup.browser.mjs` — verify compact ranges at levels
  1/50/60/100, low-level immunities, ability alternatives and no new controls.
- `test/fixtures/psywavePresentPopup.jsx` — fixture-only level/matchup variants.

Documentation: this report, `docs/DAMAGE_FINALIZATION_BASELINE.md` and
`docs/GEN_III_MOVE_COMPATIBILITY.md`.

## Validation and limits

- 26 focused tests pass.
- All 814 unit tests pass, including the full 354-move baseline and previous
  specialized-move regression suites.
- Psywave/Present and deterministic fixed-damage popup WebKit regressions pass
  at 320, 375 and 430 pixels.
- Whitespace checks pass.

No Battle UI, selector or unrelated formula changes. Existing Trace and other
unsupported battle-state safeguards remain in place. These are connected-hit
previews, without accuracy/turn execution or a battle-state simulator. Mobile
checks use WebKit emulation rather than a physical iPhone.

Stop after Step 5 for approval before Step 6.
