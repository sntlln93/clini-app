---
name: post-mortem
description: Post-completion retrospective of the autonomous issue FLOW (not the issue's code). Analyzes the run's artifacts, proposes flow improvements one by one, and applies only the ones the owner explicitly approves.
---

# Self-improve

## Usage

```text
/post-mortem #N   # retro of the flow run for issue N
```

Run after an issue completes (PR merged or run escalated). The subject is the **flow** — agents, skills, guardrails, budget — never the issue's code (that's `pass-sentence`'s job).

## Evidence to analyze

- `.claude/docs/runs/<N>.md` — phases, escalations, decisions taken alone, fix cycles and relaunches spent.
- `.claude/handoffs/<N>.md` — amendments and resume notes (each one is a friction signal).
- The PR: `gh pr view` / `gh pr checks` — CI iterations, review comment.
- Retrospective comments on the issue, if any.

## Retro dimensions

1. **Escalations** — correct? avoidable upstream (triage gap, missing policy)?
2. **Budget** — cycles/relaunches spent on real failures vs tooling gaps.
3. **Friction** — classifier denials, permission prompts, handoff deviations.
4. **Waste** — re-derived context, duplicated checks, steps that added nothing.
5. **Guardrails** — rules that blocked legitimate work (candidates to refine) or were missing (candidates to add).

## Proposals — hard rules

Present improvements ONE BY ONE, each with: the evidence from this run, the concrete change (which file: agent, skill, settings, CLAUDE.md), and its risk.

- **Nothing is edited without the owner's explicit approval of that specific proposal.** A yes to one proposal never covers another. Use AskUserQuestion or direct questions; discuss counter-proposals.
- Any proposal that **relaxes a security guardrail** must be flagged as such, first and prominently — never mixed in as an efficiency tweak.
- Approved → apply the edit. Rejected → record and drop. **Postponed → with the owner's permission in the moment, file it as a GitHub issue labeled `internal`** (Spanish title/body: evidence, proposed change, where it lives) so it lands in the real backlog. Never add readiness labels.
- Resulting commits follow the repository's normal rules (separate approval; `prepare-commit`).

## Record

Append a `## Retro del flujo` section to `.claude/docs/runs/<N>.md`: proposals made, owner's decision on each (approved / rejected / filed as #M), and edits applied. Future retros must read past records and not re-propose what was already rejected.
