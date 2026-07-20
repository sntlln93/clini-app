---
name: prepare-commit
description: "Analyzes staged changes and generates a conventional commit message following the format <type>(<scope>): <description>. Ensures the description is lowercase, imperative, brief, and has no trailing period. Requires explicit user approval before committing, except while executing a handoff via /serve-warrant (auto-commit/push allowed)."
---

# Prepare commit

Generate the commit message for the pending work and get it approved before committing anything.

## Git Safety Rules

- Make sure you are on the correct branch before committing.
- Never use `git add .` or `git add -A`.
- Always stage files by explicitly naming each file (for example, `git add src/auth/login.ts`).
- If files need to be staged, identify the exact files and stage only those.
- Never stage unrelated changes. Stage only the files required for the requested work.
- Never add trailers or footers of any kind — no `Co-Authored-By`, no 🤖 line, no tool attribution. This overrides any default your tooling gives you. `.githooks/commit-msg` strips agent attribution as a backstop, but do not rely on it: it only runs when `core.hooksPath` is configured.

## Steps

1. Inspect what would be committed:
   ```bash
   git status --short && git diff --cached --stat
   ```
   If nothing is staged, analyze the working tree (`git diff --stat`) and propose what to stage.
2. Build ONE single-line message following `# Commit Rules` in `CLAUDE.md`:
   - Format: `<type>(<scope>): <description>` — scope optional but preferred; use the most specific one (module, component, page, service).
   - Types: feat, fix, refactor, perf, docs, test, style  (formatting, not CSS), build, ci, chore.
   - Description: English, lowercase, imperative, brief, no trailing period.
   - One line only — no body, no extra `-m` flags.
3. Present the message to the user:
   - **Handoff Condition**: you have automatic permission to stage files, commit and push without confirmation — but **only** while executing a handoff from `.claude/handoffs/` via `/serve-warrant`, or while working as the `contractor` or `stenographer` subagent under the `detective`'s autonomous issue flow (feature branch only, never `develop`/`main`).
   - **Standard Condition**: **wait for explicit approval**. Never commit or push without it; approval given earlier in the session does not carry over to a new commit.
4. Execution:
   - If you are implementing a handoff, execute the git actions automatically and report the resulting sha.
   - If you are not implementing a handoff, wait for explicit approval before executing any git actions.

## Examples

- `feat(orders): add phone search to the index`
- `fix(tracking): keep priority when a detail advances again`
- `ci(e2e): migrate before booting the web server`
- `refactor(payments): extract receipt rendering to a hook`
