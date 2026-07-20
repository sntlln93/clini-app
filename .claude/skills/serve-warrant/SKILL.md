---
name: serve-warrant
description: Executes the Implementation Handoff stored in .claude/handoffs/<issue_number>.md step by step, with objective validation per step, autonomous commits/pushes under the handoff git policy, and a strict stop-and-ask rule for any deviation.
---

# Implement a handoff

## Usage

```text
/serve-warrant #150
```

Executes the implementation plan stored in `.claude/handoffs/<issue_number>.md`.

Parses the structured handoff, implements each step with objective validation, and updates the handoff as progress is made. The handoff is the source of truth—execution must follow it faithfully.

---

# Implementation Guidelines

When the user executes `/serve-warrant <issue_number>`, follow these rules.

---

## 0. Execution Philosophy

The handoff is the source of truth.

Do **not** redesign the solution.

Do **not** re-plan the issue.

Execute the implementation exactly as described.

If the handoff is incomplete, inconsistent, or missing critical information, stop and ask the user instead of making assumptions.

Each step is **objectively validated** using its acceptance criteria and validation commands. Never guess whether a step is "done" — run the commands.

---

## 1. Load the Handoff & Verify Readiness

Your first actions must always be:

### 1.1 Read the Handoff

Load:

```text
.claude/handoffs/<issue_number>.md
```

If the file does not exist:

- Stop immediately.
- Inform the user that the handoff must be generated first with `/canvass-the-scene #<issue_number> --handoff <model>`.

Do not attempt to infer the implementation from the GitHub issue.

---

### 1.2 Parse the Handoff Structure

Verify the handoff contains:
- [ ] Issue number and objective
- [ ] At least one Implementation Step with:
  - [ ] Description
  - [ ] Files Changed (list)
  - [ ] Acceptance Criteria (checklist)
  - [ ] Validation command(s)
- [ ] Constraints section
- [ ] Completion Criteria section
- [ ] Final Validation Commands section

If any section is missing or malformed, stop and ask the user to re-generate the handoff.

---

### 1.3 Git Branch Setup

If the current branch is not already the implementation branch:

- Create a branch from `origin/develop`.
- Use the **Branch** field of the handoff.
- If the handoff has no **Branch** field, create a semantic branch name based on the issue title:

```text
feat/<kebab-case-issue-title>-<issue_number>
```

or

```text
fix/<kebab-case-issue-title>-<issue_number>
```

Switch to that branch before making changes.

---

## 2. Scope Restrictions

The implementation must remain strictly within the agreed scope.

### Repository Exploration

Maximum exploration is limited to:

- Reading the handoff.
- Reading files explicitly referenced by the handoff.
- Searching only to locate those files or referenced symbols.

Do not:

- Explore unrelated modules.
- Search for alternative implementations.
- Analyze unrelated architecture.
- Re-plan the issue.

---

### Allowed Files

Modify **only** the files listed under **Files Changed** in each step.

You may create a new file only if:

- It is explicitly mentioned in the handoff, or
- It is clearly required to complete the implementation (e.g., a migration timestamp).

Otherwise, stop and ask the user.

---

### Constraints

Strictly follow every rule listed under the **Constraints** section of the handoff.

---

## 3. Implementation (Step by Step)

For each step in the handoff, follow this process:

### 3.1 Before Starting

Read the step:
- **Title**, **Description**, **Files Changed**, **Acceptance Criteria**, **Validation command**

State what you're about to do (one sentence).

Example: "Step 1: Creating migration file for `payment_method` column."

---

### 3.2 Implement

Complete the implementation for that step only. Do not jump ahead to other steps.

Leave the affected code in a working state whenever reasonably possible.

Do not create:
- `// TODO` placeholders
- `// Remaining implementation...` comments
- Partial implementations

Every step must be complete before moving to the next.

---

### 3.3 Auto-Validate

After implementing the step, **automatically run the validation command** specified in the handoff.

Example:
```bash
apps/api/vendor/bin/sail composer analyse
```

Check the output:
- **If validation passes**: Mark all acceptance criteria as `[x]` in the handoff
- **If validation fails**: Show the error output and stop.
  - Do NOT assume the criteria are met.
  - Do NOT mark the step as complete.
  - Explain what failed and why.

---

### 3.4 Check Acceptance Criteria

After validation passes, manually verify that each criterion in the step is met:

```
**Acceptance Criteria**:
- [x] Migration file exists in `database/migrations/`
- [x] Column is `string` type with nullable constraint
- [x] Migration is reversible (down method works)
```

If any criterion is unclear or fails, stop and ask the user.

---

## 4. Unexpected Discoveries

If you discover that:

- The handoff is incorrect or incomplete
- A prescribed mechanism does not work in this repo (e.g., it violates an arch rule), even if the step's goal seems reachable another way
- Additional architectural work is required
- The implementation requires modifying files outside the agreed scope
- The acceptance criteria are ambiguous
- A validation command fails

**STOP immediately.** Never substitute your own design, even for a mechanism-level detail.

Explain:

- What you discovered
- Why it blocks the implementation
- Which step and handoff section is affected
- What you tried and why it didn't work

Then **propose a concrete amendment to the handoff** (the exact replacement text for the affected step/section) so the user can approve or edit it. Only continue once the user has approved and the handoff file reflects the amendment.

---

## 5. Progress Tracking (Living Handoff)

After each completed step:

- Update `.claude/handoffs/<issue_number>.md`
- Change `**Status**: [ ] Incomplete` → `**Status**: [x] Complete`
- Record the step's commit sha next to the status once committed
- Ensure all acceptance criteria are marked `[x]`

Example update:

```md
### Step 1: Create Migration

**Status**: [x] Complete (commit `abc1234`)

**Validation**: ✅ Passed
```

The handoff should always reflect the current implementation status. It lives on disk only — `.claude/handoffs/` is gitignored, so never try to stage or commit the handoff itself.

---

## 6. Git Commits

After completing each logical step (follow the per-step **Commit** convention in the handoff):

- Stage only the relevant files for that step, by name (never `git add .`/`-A`).
- Generate a commit message using the repository's `prepare-commit` skill.
- **Handoff git policy**: you have standing permission to stage, commit and push without asking — this is the "Handoff Condition" in `prepare-commit`. Commit, push, and report what you did.

Do not combine unrelated work into a single commit.

---

## 7. Response Format (After Each Step)

After completing and validating a step, respond using this structure:

````md
## Step X: [Step Title] ✅

**Files Modified**:
- file_a
- file_b

**Validation**:

✅ Passed

```
[actual command output, truncated if long]
```

**Acceptance Criteria**:
- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3

**Committed**: `<sha>` `<type>(<scope>): <description>` — pushed.

**Handoff Progress**:
```
- [x] Step 1: Create Migration
- [/] Step 2: Update Model
- [ ] Step 3: Add Tests
```

**Next**: Step 2 will [brief description of what's next]
````

---

## 8. Final Validation (When All Steps Complete)

After all implementation steps are complete:

1. Run all **Final Validation Commands** from the handoff (normally `run-forensics --full`, plus e2e on the host when the handoff calls for it).

2. Verify output: All pass, no warnings

3. If any validation fails:
   - Do NOT mark the implementation as complete
   - Explain what failed
   - Stop and wait for instructions

4. If all pass:
   - Mark the final checklist in the handoff as complete
   - Push any remaining commits
   - Summarize what was accomplished
   - Suggest creating a PR — but do **not** create it without the user's approval. Inside the autonomous issue flow, report back to the `detective` instead — opening the PR is the detective's job. Reminders: target `develop` (squash), body in Spanish, closing keyword in English (`Closes #<issue_number>`).
