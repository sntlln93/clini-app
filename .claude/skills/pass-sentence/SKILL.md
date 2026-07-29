---
name: pass-sentence
description: Reviews the current branch's diff against develop, intent-first (does it solve what the issue asks?), plus semantic correctness, test quality and diff security — skipping everything Pint/PHPStan/ESLint/tsc/ArchTest already enforce. With --pr <number>, also posts the report as a Spanish PR comment.
---

# Code review

Review the diff of the current branch against `origin/develop` (`git diff origin/develop...HEAD` plus staged/unstaged changes). Read every changed hunk; open surrounding code only when needed to judge correctness. Never modify files.

## Checklist

1. **Intent (primary check)**: read the issue (`gh issue view <N> --comments`) and, when it exists, `.claude/handoffs/<N>.md`. Does the diff solve what the issue asks? Are the acceptance criteria satisfied in the code, not just checked off? Anything requested but missing? Anything present that was not requested (scope creep)? A handoff that drifted from the issue is itself a REQUIRED finding.
2. **Semantic correctness**: logic errors, edge cases and regressions that compile and pass — what no tool catches. Assume `run-forensics --full` ran green: do NOT re-check formatting, types, naming/layering conventions or size limits (Pint, PHPStan, ESLint `max-lines`, tsc and `apps/api/tests/Arch/ArchTest.php` already enforce them). If you spot an enforceable convention the tooling misses, write it under **Proposed rules** instead of hand-checking it.
3. **Test quality**: new/changed tests must pin behavior — they should fail if the fix were reverted. Flag tautological tests and tests that mirror the implementation instead of asserting the requirement.
4. **What tooling cannot see**: page-level horizontal scroll on any viewport, UI copy in Spanish, eager loads on API Resources (no automated smoke test discovers these yet — check manually).
5. **Invented shadcn APIs**: for every shadcn/registry component the diff touches, verify each prop, variant and sub-component against the installed source, `apps/panel/src/components/ui/<name>.tsx` — that file, not the registry, is the source of truth, since it carries this project's local customizations (e.g. `focus-ring` in `button`; the own `size` prop on `avatar`/`select`/`switch`; the own `variant` prop on `dropdown-menu`). Use `mcp__shadcn__get_item_examples_from_registries` (pass `registries: ["@shadcn"]`; omitting it wrongly reports no registries configured) only to confirm composition — which part goes with which — not props. `view_items_in_registries` is not a source here: it returns no file contents, rejects a `registries` argument, and resolves the wrong variant anyway (this project is pure base-ui; a `Dependencies: radix-ui` answer means the wrong variant, not a missing dependency). A prop, variant or sub-component absent from the **local file** is the REQUIRED finding, even when tsc passes — loose or `any`-typed props and `className` passthrough let invented APIs typecheck; an absence from the registry alone, with the local file confirming the prop, is not a finding. Common invented shapes: `<Button isLoading>` / `isPending` (compose `Spinner` + `data-icon` + `disabled` instead), variant strings the component does not define, and items rendered outside their required Group. This check covers registry components only — for the project's own `src/components/` and `src/features/`, read the file.
6. **Diff security**: any secret/credential, or any change under `.github/**`, `apps/*/Dockerfile*`, `apps/*/docker/**` or `.env*`, is an automatic REQUIRED finding flagged **ESCALATE**.

## Proposed rules

When check (2) reveals an enforceable gap in the tooling, add a `## Reglas propuestas` section to the report: one line per rule — what to enforce, where (`apps/api/tests/Arch/ArchTest.php` / ESLint / Pint config) and a one-line sketch of the rule. These are not findings against the diff and never block the verdict; they are routed to GitHub issues so they are not lost.

## Report format

Verdict first: **APPROVE** or **NEEDS-FIXES**. Then findings ranked most severe first, one line each:

```text
file:line — problem — why it fails — suggested fix
```

Each finding marked REQUIRED or OPTIONAL. No diff dumps.

## Posting to a PR (`--pr <number>`)

Post the report with `gh pr comment <number>`, translated to Spanish:

```md
## Revisión

**Veredicto:** APROBADO | REQUIERE CAMBIOS

- [REQUERIDO|OPCIONAL] `file:line` — problema — corrección sugerida

Validación: <resultado de run-forensics --full si se conoce>
```

Never mention agents or tooling in the comment.
