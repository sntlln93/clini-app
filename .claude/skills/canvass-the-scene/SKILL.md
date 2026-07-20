---
name: canvass-the-scene
description: Creates a concise, low-token implementation plan for a GitHub issue. With --handoff <model>, also generates a structured Implementation Handoff in .claude/handoffs/ that /serve-warrant executes with objective validation.
---

# Plan for issue

## Usage

```text
/canvass-the-scene #150
/canvass-the-scene #150 --handoff haiku
```

`--handoff <model>` is optional. When provided, generates an **Implementation Handoff** structured for objective validation and saves it to `.claude/handoffs/<issue_number>.md`.

---

## Implementation Guidelines

When the user executes `/canvass-the-scene <issue_number>`, follow these rules.

### 1. No Autonomous Exploration

It is strictly forbidden to:

- Launch autonomous exploration agents.
- Spawn sub-agents.
- Perform recursive repository analysis.
- Execute uncontrolled parallel tool calls.
- Search for alternative implementations outside the minimum required context.

Stay focused on the requested issue only.

---

### 2. Allowed Sources

Build the initial plan using only:

- The GitHub issue text and its comments (a retrospective comment on a failed attempt is required reading).
- `README.md` at the repository root.
- `.claude/docs/status.md` (if it exists).
- `CLAUDE.md`.

Only inspect additional files if absolutely necessary to answer the issue.

---

### 3. Tool Budget

The allowed sources listed above do **not** count toward the tool budget.

Additional exploration is limited to:

- 2 file reads

OR

- 1 grep + 1 file read

Do not exceed this budget unless the user explicitly asks for a deeper investigation.

---

### 4. Planning Principles

Produce a high-level implementation strategy.

Avoid:

- Writing production code.
- Designing unnecessary abstractions.
- Exploring unrelated modules.
- Overengineering.

Prefer concise actionable steps.

---

### 5. Response Format (Without `--handoff`)

Always produce the following sections.

```md
# Plan

## Summary

A brief description of the issue.

## Proposed Implementation

1. Step one (brief description)
2. Step two (brief description)
3. Step three (brief description)

## Expected Files

- file_a — brief reason (create/modify/delete)
- file_b — brief reason (create/modify/delete)

## Risks

- ...

## Validation

- How to test each step

## Open Questions

Only include blocking questions.
If there are none, write "None."
```

Stop after the plan unless `--handoff` was requested.

---

## 6. Handoff Mode (Structured Format)

If the command includes:

```text
--handoff <model>
```

first estimate the issue's **complexity (1–10)** and apply the model rule:

> **Haiku only for complexity 1–3; Sonnet/Fable for everything else.**

If the requested model is below what the complexity calls for, warn the user and wait for their choice before saving the handoff.

**Budget: the whole Implementation Handoff must stay under 1500 words.** If you exceed it, cut explanation and prose — never steps, acceptance criteria or validation commands.

Then append an **Implementation Handoff** section using this structured format:

````md
# Implementation Handoff

**Target Model**: <model>

**Issue**: #<issue_number>

**Branch**: <type>/<kebab-case-issue-title>-<issue_number>

**Complexity**: <N>/10 (per owner's rule: Haiku only for 1–3; Sonnet/Fable for the rest)

**Objective**: Implement [issue title/description]

## Scope

Only implement the steps below. Do not redesign the solution.

**Decisions already made by the owner (do not revisit):**

- [Every design decision the issue or its comments settle. If none, write "None."]

If critical information is missing, stop and ask.

**Lessons from previous attempts** (include this block only when the issue has
a retrospective of a failed/reverted attempt — list the exact mistakes not to
repeat):

1. ...

---

## Implementation Steps

### Step 1: [Brief Title]

**Status**: [ ] Incomplete

**Description**:  
[What this step does and why]

**Files Changed**:
- `path/to/file.php` — **Create** / **Modify** / **Delete** (brief reason)
- `path/to/other.ts` — **Modify** (reason)

**Acceptance Criteria**:
- [ ] Criterion 1 (specific, measurable)
- [ ] Criterion 2 (specific, measurable)
- [ ] Criterion 3 (specific, measurable)

**Validation**:
```bash
command to run
```
Expected output: ...

**Commit**: [either "Commit this step on its own (via `prepare-commit`)" or "Commit together with Step N" — every step must state one]

---

### Step 2: [Brief Title]

**Status**: [ ] Incomplete

[... same structure as Step 1]

---

### Step N: [Brief Title]

[... same structure]

---

## Files Expected to Change

- `path/to/file.php` — **Create** (reason)
- `path/to/file.ts` — **Modify** (reason)

---

## Constraints

- Keep the implementation minimal; no features beyond the issue scope.
- Preserve existing behavior unless required.
- Avoid unrelated refactors.
- Do not modify public APIs unless explicitly required.
- All validation commands must pass before marking a step complete.
- Git policy (handoff mode): stage files by name (never `git add .`/`-A`), commit per the per-step **Commit** convention and push without asking — but creating the PR is always the owner's call (or the `detective` agent's, inside the autonomous issue flow, per the standing exception in CLAUDE.md's Agent rules).
- PR (when suggested at the end): target `develop` (squash merge), body in Spanish, closing keyword in English (`Closes #<issue_number>` — "Cierra" closes nothing).

---

## Completion Criteria

- All steps completed and validated.
- No unrelated changes.
- All acceptance criteria marked `[x]`.
- `run-forensics --full` passes (backend, frontend, or both as applicable).

---

## Final Validation Commands

Invoke the `run-forensics` skill with `--full` (single source of truth for the quality gate — it detects the touched side(s) itself).

[e2e is CI-only: never include a local `npm run test:e2e` (it resets the dev DB). The `e2e` required check covers it on every PR.]

Expected: All pass, no warnings.
````

---

## 7. Persist the Handoff (When `--handoff` is used)

Save the **Implementation Handoff** as:

```text
.claude/handoffs/<issue_number>.md
```

Example:

```text
.claude/handoffs/150.md
```

Create the `.claude/handoffs` directory if it does not already exist. Handoffs are local working documents — the directory is gitignored and they are never committed.

Overwrite any existing file with the same name.

The saved file must contain **only** the complete **Implementation Handoff** document. Do not include the planning notes or response metadata.

After saving the file, finish your response with:

```text
✅ Handoff saved to .claude/handoffs/<issue_number>.md
```

If there are blocking questions that prevent creating a complete handoff, do **not** save the file. Instead, ask the questions and wait for the user's response.
