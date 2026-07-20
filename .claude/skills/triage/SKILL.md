---
name: triage
description: Prepares GitHub issues for the autonomous issue flow. /triage #N runs an interactive definition-of-ready review with the owner and records the outcome on the issue (ready-for-agent label); /triage without arguments scans open issues and labels the incomplete ones needs-triage.
---

# Triage

## Usage

```text
/triage #N   # interactive triage of one issue
/triage      # cheap scan: label incomplete issues needs-triage
```

## Definition of ready

An issue is ready for the autonomous flow when:

1. **What** — the expected behavior is described unambiguously.
2. **Acceptance criteria** — 2–5 verifiable items.
3. **Decisions made** — the design/product choices the issue assumes, explicit ("do not revisit").
4. **Out of scope** — what is NOT included.
5. **Bugs only** — reproduction steps and current vs expected behavior.
6. **No external blockers** — nothing pending a client or product decision.

## Interactive mode (`/triage #N`)

1. Read `gh issue view <N> --comments`.
2. Evaluate against the definition of ready.
3. **Propose, don't interrogate**: draft the missing sections you can infer from the issue (acceptance criteria, scope) and present them to the owner to confirm, edit or reject — grouped, one issue at a time. Ask open questions only for what cannot be inferred.
4. **Split check (complex issues)**: if the issue bundles multiple deliverables or exceeds what one run handles well, assess splitting it into 2+ smaller issues — propose it ONLY when feasible AND the derived issues are order-independent: each implementable in any order and mergeable on its own, with no dependency chain between them. If any sequencing exists, do not propose a split. Present the division to the owner with each derived issue drafted (title, definition-of-ready sections) and the independence rationale; **only the owner approves the split**. On approval:
   - Create each derived issue (`gh issue create`): Spanish title/body in the definition-of-ready format, the matching **type** label (`bug`/`feat`/`enhancement`/…), and a "Derivado de #N" reference. Never `ready-for-agent` at creation — then ask the standard question per derived issue ("¿Marco #M como `ready-for-agent`?"); the split approval is NOT that permission.
   - Parent: post a Spanish comment listing the derived issues and close it as superseded.
5. Outcome (for the issue being triaged, or each derived issue after a split):
   - **Ready** → post ONE structured comment in Spanish (`## Criterios de aceptación`, `## Decisiones tomadas`, `## Fuera de alcance`, plus `## Reproducción` for bugs). Then ask the owner directly: "¿Marco #N como `ready-for-agent`?" — add the label (and remove `needs-triage`) only on an explicit yes to that exact question. The owner having confirmed the drafted sections is NOT that permission.
   - **Blocked** → add the `blocked` label and post a short Spanish comment naming exactly which decision is missing and whose it is. Never `ready-for-agent`.
6. Create the labels on first use (`gh label create`). Never mention agents in issue comments.

## Scan mode (`/triage`, no arguments)

- `gh issue list --state open`, skipping issues labeled `deferred`, `blocked`, `ready-for-agent` or `needs-triage`.
- Judge each against the definition of ready by reading only — no questions, no comments, no `ready-for-agent`.
- Incomplete → add `needs-triage`. Looks complete → report it as a candidate for `/triage #N`.
- Prioritize `bug` (CLAUDE.md rule); cap at ~10 issues per run; finish with one line per issue: `#N — needs-triage (missing: …)` or `#N — candidate, run /triage #N to confirm`.

## Hard rule

`ready-for-agent` is the detective's mandatory intake gate. It is applied ONLY with the owner's absolute and exclusive permission: an explicit yes to the direct question "¿Marco #N como `ready-for-agent`?" at the end of interactive triage. Never by the scan, never inferred from content confirmations, never on any agent's say-so. No explicit permission → no label, regardless of how complete the issue looks.
