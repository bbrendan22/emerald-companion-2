# Verified Battle checkpoint — 2026-10-25

Battle Tower Singles and Doubles implementation is complete through Doubles
Steps 1–4F. Both formats use selected canonical Frontier Sets. Doubles has two
independent active slots per side, slot-specific observations and conditions,
four-Pokémon damage context, and the approved native selectors and sprite view
switching. Format changes start a fresh battle. Gen III spread damage, screens,
field abilities, targeting, damage distributions and KO probabilities retain
their uncertainty safeguards. Extended physical Frontier-run testing remains
pending; automated coverage is representative rather than exhaustive.

## Verified baseline

| Check | Result |
|---|---|
| Complete Node suite, all 173 test files | 1,317 passed; 0 failed, skipped or cancelled |
| Singles damage snapshot | 10,620 results matched; no regeneration |
| Complete Frontier candidate audit | 383,092 evaluations; 525,704 branch comparisons; 0 mismatches |
| Selected canonical Set audit contexts | 54,932 across 302 trainer entries |
| Production build | Passed; existing large-chunk warning |

The full suite ran exactly once during final verification, including the
repaired audit. The snapshot and build then ran separately. Project-file hashes
were unchanged by verification. Peak sampled process-tree RSS was 426.8 MiB for
the suite, 149.5 MiB for the snapshot and 442.5 MiB for the build.

The audit independently constructs canonical stats, battle inputs and field
context, and checks percentages and exact KO counts. Core damage and field/target
primitives remain shared with production; it is not a second cartridge simulator.
Known unsupported or uncertain states remain unavailable rather than guessed.

## Memory-safe validation on an 8 GB Mac

Use one validation process at a time. Confirm previous tests/builds have exited
before starting another. Every Node test must use `--test-concurrency=1` and a
384 MiB V8 heap limit, inherited by child Node processes.

Run the commands below **through a process-tree RSS supervisor** that samples
the parent and all descendants and stops validation above 1.5 GiB. The V8 heap
limit alone does not cap total RSS. Keep output bounded and save concise logs
under `validation/`. Never overlap a full suite, audit, snapshot or build.

```sh
NODE_OPTIONS=--max-old-space-size=384 node --test --test-concurrency=1 --test-reporter=spec test/*.test.js
NODE_OPTIONS=--max-old-space-size=384 node --test --test-concurrency=1 --test-reporter=spec --test-name-pattern='10,620 complete Singles' test/doublesIntegration.test.js
NODE_OPTIONS=--max-old-space-size=384 npm run build
```

Wait for each command to finish completely before the next. If the RSS limit is
reached, stop and investigate; do not increase the heap limit or start duplicates.
Avoid bare `npm test` on this Mac because its default file concurrency is higher.

The existing local supervisor is
`validation/final-suite-safe-2026-10-25/run_guarded.py`; it samples process-tree
RSS and retains bounded console output and exact totals. Validation artifacts
and this supervisor are deliberately ignored. Retain them locally, or provide
an equivalent supervisor on a fresh checkout before running these commands.

## Private local fixtures

Reproducing the full result with zero skipped real-save tests requires the
reviewed local fixtures under `test/fixtures/real/`:

- The matching raw Emerald `.sav`, named by `expected.private.json`, or supplied
  using the `EMERALD_REAL_SAVE` environment variable.
- `expected.private.json`.
- `gamecube-origin.expected.private.json`.
- `hall-of-fame.expected.private.json`.

These files must remain private and ignored. Their save hashes and independently
reviewed expectations must agree; do not regenerate expectations from production
output. A checkout without the private fixture skips the real-save tests while
retaining synthetic coverage. See `test/fixtures/real/README.md` for provenance.

Only implementation, tests, synthetic fixtures, pinned snapshots, reference
documentation and verification tools belong to this checkpoint. Local logs,
build output, dependencies, backups and private fixtures are excluded. Unused
back sprites remain local and untracked; their directory has no permanent ignore
rule. This checkpoint does not publish or deploy the application.
