---
name: collect-evidence
description: Archives one session's raw transcripts (root + every subagent) into .claude/ and derives its cost/context report. Use after an autonomous issue run, before a /post-mortem retrospective, or whenever a session is worth keeping as evidence.
---

# Collect session evidence

Claude Code writes transcripts into the **config dir**, which is disposable and
gets pruned. This skill copies one session's raw evidence into the repo and
derives the report from it, so a run stays auditable after the config dir is gone.

```bash
python3 .claude/skills/collect-evidence/scripts/collect-evidence.py <session-id>
```

Get the current session id from the transcript path in `/status`, or list recent
sessions with:

```bash
ls -lt ~/.claude-personal/projects/-Volumes-eSSD-src-clini-app/*.jsonl | head
```

## What it writes

| Path | Contents |
| --- | --- |
| `.claude/transcripts/<id>.jsonl` | Root transcript, verbatim copy |
| `.claude/docs/sessions/<id>/raw/root.jsonl` | Same file, next to its subagents |
| `.claude/docs/sessions/<id>/raw/subagents/agent-*.jsonl` | One per subagent, verbatim |
| `.claude/docs/sessions/<id>/raw/subagents/agent-*.meta.json` | `agentType`, `spawnDepth`, `toolUseId`, `parentAgentId` |
| `.claude/docs/sessions/<id>/report.json` | Derived report (nested schema) |
| `.claude/session-report/<id>.json` | Same data, flat schema + `notes` |

Copies are verbatim — the report is always re-derivable from `raw/`. Re-running
on the same id overwrites in place, so it is safe to collect a session twice.

## Reading the report

- **`costUsd`** is computed from the per-message `usage` in the transcript, at
  input/output/cache rates per model (cache read 0.1x input, write 1.25x for 5m
  and 2x for 1h). Verified to reproduce previously recorded costs exactly.
- **`context.first` / `context.last`** is the request size at the first and last
  turn. This is the cost driver: the whole context is re-billed every turn, so a
  run's second half costs far more per turn than its first.
- **`composition`** is the share of context chars by origin. `prosePct` is
  **only** narration written by the agent.

> **Do not** use the old `ownContentPct` field as a verbosity proxy. It lumped
> prose together with tool_use arguments and read ~10x high (detective: 73% vs 3%
> real prose). That misreading got copied into `detective.md` as a prompt rule and
> spent a whole section optimizing 3–6% of the cost. See
> `.claude/docs/who-killed-the-tokens.md`, finding 1. `composition` replaces it.

`toolResultTokensApprox` is a chars/4 estimate — indicative, not billing-grade.

## Notes

- The config dir is autodetected across `~/.claude*` and **always printed**.
  `CLAUDE_CONFIG_DIR` is defined as a shell alias, so it does not exist in a
  plain shell; `~/.claude` is stale on this machine and the live one is
  `~/.claude-personal`. Pass `--config-dir DIR` to force one.
- A session with no subagents produces an empty `agents` list — the raw root
  transcript is still archived.
- Exits 1 with the paths it probed if the session id is not found.
