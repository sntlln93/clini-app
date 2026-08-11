---
name: run-forensics
description: Runs linting, formatting, and static analysis tools. Automatically detects if changes are backend or frontend to run the appropriate tools (phpstan, pint, eslint, prettier, tsc). Use this after code changes or before proposing a PR.
---

# Validate code

Run the support script from the repo root:

```bash
bash .claude/skills/run-forensics/scripts/run-forensics.sh          # after code changes
bash .claude/skills/run-forensics/scripts/run-forensics.sh --full   # before proposing a PR
```

The script detects the touched side(s) — comparing the merge-base with
`develop` plus staged, unstaged and untracked files — and runs only the
matching tools. Backend runs through Sail (`apps/api`); frontend runs inside
the already-running `panel` container (`apps/panel/compose.yaml`, brought up
together with `apps/api`'s via the root `compose.yaml`'s `include`), which
isn't part of the Sail PHP container; e2e type-checking runs in a throwaway
Node container (no host Node dependency):

| Side detected | Default | With `--full` |
| --- | --- | --- |
| Backend (`apps/api/**/*.php`, `composer.*`, `database/`, `routes/`, `phpstan/phpunit/pint` configs) | pint (fixes), phpstan | + pest (includes Arch) |
| Frontend (`apps/panel/src/**`, `apps/panel/package.json`, build configs) | prettier (writes), eslint (fixes), tsc | + vitest |
| E2E (`e2e/`, `playwright.config.ts`, root `package.json`) | tsc -p e2e | (playwright is **CI-only** — a local run has no webServer boot wired up here) |

## Rules

- Fix every failure it reports and re-run until it prints `All checks passed.`
- Exit code 1 means at least one tool failed; the summary line lists which.
- Requires the full stack up (`docker compose up -d`, from the repo root);
  the script checks `laravel.test` and `panel` independently and aborts
  early if either is down. `sail up` alone only starts the API side.
- pint/prettier/eslint write fixes in place — review what they changed before
  staging.
- On a failure, the script prints a log filtered per tool (phpstan, tsc,
  eslint, vitest, pest each get their own filter; pint/prettier pass through
  raw), trimmed to `VALIDATE_LOG_LINES` (default 40) from the **start** of the
  filtered text — root-cause errors sit at the top. If a filter matches
  nothing, it falls back to the tail of the raw log instead of an empty block.
- `--full` runs the test suites too and can exceed the default 120s Bash
  timeout — run it with an extended timeout (600000 ms) or expect it to move
  to the background.
