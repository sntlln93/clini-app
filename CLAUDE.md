# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clini: modular medical-practice management platform, starting with a first-class appointment scheduling system for small practices and independent professionals (1–5 professionals). Long-term goal is to compete with Calu, incrementally — MVP is scoped to scheduling only (agenda, online booking, availability, cancellations, reschedules, manual entry, reminders). See `docs/product/vision.md` and `docs/product/roadmap.md`.

- Stack: Laravel 13 (PHP 8.5) + PostgreSQL as a pure REST API (`apps/api`, no Inertia — see `docs/adr/0001-api-rest-en-lugar-de-inertia.md`). React 19 + TypeScript SPA (`apps/panel`) with TanStack Router (file-based) + TanStack Query, Tailwind CSS 4 + shadcn/ui, Vite 8.
- Monorepo layout: `apps/api` and `apps/panel` as sibling deployable apps, each with its own Dockerfile for Dokploy. See `docs/architecture/overview.md`.
- Multi-tenancy: `Organization → Membership → User`, single shared Postgres database, tenant scoping via `organization_id`. A professional can belong to several organizations; patients are global entities (not per-organization) — clinical history stays modeled per-organization until the legal/permissions model is defined.
- Language split: code, branches, commits and code comments in **English**; UI copy and GitHub PRs/issues/comments always in **Spanish**.
- There is no real production traffic yet: migrations may be edited in place and re-run with `migrate:fresh --seed` in dev instead of adding new migration files; bug fixes may be folded into redesigns.

## Environment & commands

Backend runs through Laravel Sail (Docker) — there is no local PHP. The panel runs as its own service in the same Sail compose file, so a single `sail up` starts everything; there is no local Node requirement either, though the panel can also be run with plain `npm` for faster UI-only iteration (Node 24 LTS, see `apps/panel/.nvmrc`).

```bash
git config core.hooksPath .githooks               # once per clone (strips agent attribution from commit messages)
cd apps/api
cp .env.example .env                              # once per clone
./vendor/bin/sail up -d                          # starts api + panel + pgsql
./vendor/bin/sail artisan migrate                 # first run
```

- API: <http://localhost:8080>
- Panel: <http://localhost:5174>

No demo users/seeders yet — the seeded-data convention (`migrate:fresh --seed`) applies once `database/seeders/DatabaseSeeder.php` has real data.

### Tests

```bash
# Backend — Pest, through Sail
./vendor/bin/sail php ./vendor/bin/pest
./vendor/bin/sail php ./vendor/bin/pest --filter "..."

# Frontend — Vitest, apps/panel
cd apps/panel && npm run test

# E2E — Playwright, host (not Sail); needs Sail up
npx playwright test
```

### Quality

Use the `run-forensics` skill — it detects the touched side(s) and runs the right tools.

Underlying tools if you need one directly: `sail composer analyse` (phpstan level via Larastan), `sail composer pint`, and in `apps/panel`: `npm run format` / `npm run lint`, `npm run typecheck`. Pint enforces `declare(strict_types=1)`.

## Agent rules

- Never create commits or push without explicit approval. Never push directly to `develop`.
  - **Standing exception**: inside the autonomous issue flow orchestrated by the `detective` agent (`.claude/agents/`), the `contractor` and `stenographer` subagents have standing approval to stage (by name), commit and push to the issue's **feature branch only**. The `detective` may open the PR against `develop`. Merging is always human; every other rule in this section still applies.
- If an autonomous issue run is stopped and later resumed, ask the owner how to continue — through the flow's subagents per the handoff, or directly — instead of deciding alone.
- Use the `prepare-commit` skill to structure commit messages before requesting approval.
- Never mention the agent in commits, comments or project messages.
- Never use `git add .` or `git add -A`. Always add to staging by explicitly naming the file.
- Never stage unrelated changes. Stage only the files required for the requested work.
- Read and modify any file inside this repository without asking; never read or modify files outside it without approval.
- Refactor first: check whether the structure needs cleanup before adding a feature, and do that refactor as an isolated step.
- On GitHub issues: ignore label `deferred`, prioritize label `bug`.
- Prefer shadcn/ui for frontend components.
- Work should be done sequentially with per-module commits.
- DTOs must always be named as nouns to reflect that they are passive data containers. Bad: DeleteSchoolData, UpdateUser. Good: DeletedSchoolData, SchoolDeletionData.

## Commit format

```text
<type>(<scope>): <description>
```

`type` required; `scope` optional but use the most specific available. Description: lowercase, imperative, brief, no trailing period. Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `style` (formatting, not CSS), `build`, `ci`, `chore`.

## Git & CI workflow

- PRs target `develop` and merge with **squash**; never reuse a merged branch.
- Releases `develop → main` use a **merge commit** (never squash).
- Merging to `main` auto-deploys via Dokploy, which builds `apps/api/Dockerfile` and `apps/panel/Dockerfile` as two separate applications. `apps/api/docker/entrypoint.sh` builds Laravel caches and runs `php artisan migrate --force` on every container start (all environments auto-migrate; only dev/test also seed, via `migrate:fresh --seed`, run manually — production never seeds).
- Five required checks on every PR: `quality_backend` (Pint+PhpStan), `quality_frontend` (Prettier+ESLint+tsc), `tests_backend` (Pest), `tests_frontend` (Vitest), `e2e` (Playwright). Renaming a CI job requires updating the branch rulesets or PRs get blocked.
- PHP/Node versions are pinned in `.github/actions/setup-php|setup-node`, `apps/api/compose.yaml` (Sail runtime), `apps/api/Dockerfile` and `apps/panel/Dockerfile` — bump all of them together.

## Architecture

### Backend layering

Organize by business domain, not by file type (see `docs/architecture/overview.md`):

```text
Domain/          # core business logic, framework-agnostic
Application/     # use cases / orchestration
Infrastructure/  # framework, DB, external services
Http/            # controllers, FormRequests, API Resources — thin
```

- **Thin controllers**: HTTP routing, authorization, responses only. No SQL, validation, or business logic. Never `$request->validate()` — always inject a FormRequest.
- **Actions/Services**: single-responsibility classes exposing one `execute()`/`handle()` method. Action encapsulates core business logic; Service wraps third-party APIs/SDKs (adapter pattern) to keep external systems out of the domain.
- **Thin models**: relations, casts, basic scopes only. API Resources/DTOs do data shaping. Complex queries go in scopes/query classes, not controllers.

### Frontend structure (`apps/panel`)

- `src/routes/<module>/`: only TanStack Router entrypoints — `index.tsx` (list), `nuevo.tsx` (create), `$id.tsx` (show), `$id.editar.tsx` (edit) at the module root; non-CRUD feature modules use a single `index.tsx`. Everything else (local components, hooks, tests) goes in a co-located `-components/`, `-hooks/`, `-tests/` folder inside the module — the `-` prefix is TanStack Router's own mechanism for excluding a folder from route generation, replacing Inertia's implicit "everything else" convention.
- `src/components/ui/`: shadcn/ui primitives, domain-agnostic. `src/components/` root: shared atomic components without domain/layout awareness. `src/features/`: shared composed components with domain/layout awareness. Global infra: `src/layouts/`, `src/hooks/`, `src/lib/` (pure TS helpers/enums, the `api` axios client), `src/types/`.
- Components stay presentational; business logic, state mutations and API calls live in custom hooks (`useSomething.ts`). Max 250 lines per file, 150 per component — refactor before adding logic. Don't over-parametrize for reuse; prefer dedicated components.
- Styling: Tailwind utilities inside components; `src/index.css` is the only stylesheet.
- **No page-level horizontal scroll, on any viewport**: wide content scrolls inside its own `overflow-auto` wrapper or wraps (`flex-wrap`); mind `min-w-0` on flex items. Known smell: `grid gap-6 xl:grid-cols-*` without an explicit `grid-cols-1` base.

### E2E suite

Playwright hits both servers (`api` on :8080, `panel` on :5174). Conventions (DB reset strategy, auth storageState, spec isolation) are not defined yet — write them into this section once the suite exists.

## ADRs

`docs/adr/` holds only decisions that would need re-litigating without a written reason — not tech choices. An ADR answers "why did we choose this and what did we rule out", not "what technology do we use". See `docs/adr/0001-api-rest-en-lugar-de-inertia.md` for the format.

## Session docs (local only)

`.claude/docs/` is gitignored (only `.claude/skills/` is tracked). If `.claude/docs/status.md` exists, **read it at session start** — it is the living record of project status, recent decisions and pending work.
