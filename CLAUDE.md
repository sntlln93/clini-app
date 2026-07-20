# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clini: modular medical-practice management platform, starting with a first-class appointment scheduling system for small practices and independent professionals (1–5 professionals). Long-term goal is to compete with Calu, incrementally — MVP is scoped to scheduling only (agenda, online booking, availability, cancellations, reschedules, manual entry, reminders). See `docs/product/vision.md` and `docs/product/roadmap.md`.

- Stack: Laravel 13 (PHP 8.5) + PostgreSQL as a pure REST API (`apps/api`, no Inertia — see `docs/adr/0001-api-rest-en-lugar-de-inertia.md`). React 19 + TypeScript SPA (`apps/panel`) with TanStack Router (file-based) + TanStack Query, Tailwind CSS 4 + shadcn/ui, Vite 8.
- Monorepo layout: `apps/api` and `apps/panel` as sibling deployable apps, each with its own Dockerfile for Dokploy. See `docs/architecture/overview.md`.
- Auth: Laravel Sanctum, SPA (cookie) mode — the panel is a `statefulApi()` frontend, not a token client. See Architecture → Auth below.
- Multi-tenancy: `Organization → Membership → User`, single shared Postgres database, tenant scoping via `organization_id`. A professional can belong to several organizations; patients are global entities (not per-organization) — clinical history stays modeled per-organization until the legal/permissions model is defined.
- Language split: code, branches, commits and code comments in **English**; UI copy and GitHub PRs/issues/comments always in **Spanish**.
- There is no real production traffic yet: migrations may be edited in place and re-run with `migrate:fresh --seed` in dev instead of adding new migration files; bug fixes may be folded into redesigns.

## Environment & commands

Backend runs through Laravel Sail (Docker) — there is no local PHP. The panel runs as its own service in the same Sail compose file, so a single `sail up` starts everything.

The repo root is an npm workspace (`apps/panel` is its only member today) — one `npm install` at the root installs both the e2e (Playwright) deps and the panel's, with a single `package-lock.json`. This applies to **local dev and CI only**: production Docker builds (`apps/panel/Dockerfile`) still treat each app as standalone — Dokploy builds it with the repo root as context but installs only `apps/panel`'s dependencies (`npm ci --workspace=apps/panel --include-workspace-root=false`), and the image never includes the e2e suite.

```bash
git config core.hooksPath .githooks               # once per clone (strips agent attribution from commit messages)
npm install                                       # once per clone — installs the whole workspace (needs Node 24 LTS; see package.json "workspaces")
cd apps/api
cp .env.example .env                              # once per clone
./vendor/bin/sail up -d                          # starts api + panel + pgsql
./vendor/bin/sail artisan migrate                 # first run
```

- API: <http://localhost:8080>
- Panel: <http://localhost:5174>

No demo users/seeders yet — the seeded-data convention (`migrate:fresh --seed`) applies once `database/seeders/DatabaseSeeder.php` has real data.

**TypeScript is pinned to `~6.0.2`** in both `package.json` (root) and `apps/panel/package.json` — deliberately, not an oversight. `typescript-eslint@8.64.0`'s peer dependency caps at `<6.1.0`; bumping to TS 7 breaks ESLint with a hard-to-read `ts-api-utils` crash, not a version-mismatch error. Bump both together only once `typescript-eslint` supports it.

**`apps/panel/src/routeTree.gen.ts` is generated, not committed.** The `build` and `typecheck` npm scripts run `vite build` *before* `tsc` specifically so the TanStack Router Vite plugin writes that file first — a fresh checkout (CI, or the first `docker build` with no locally-cached copy) fails with `Cannot find module './routeTree.gen'` if this order is reversed. Don't "simplify" these scripts back to `tsc && vite build`.

### Tests

```bash
# Backend — Pest, through Sail (Arch, Unit, Feature testsuites)
./vendor/bin/sail php ./vendor/bin/pest
./vendor/bin/sail php ./vendor/bin/pest --filter "..."
./vendor/bin/sail artisan test --testsuite=Arch    # fast, no DB — architecture rules from this file

# Frontend — Vitest, apps/panel
cd apps/panel && npm run test

# E2E — Playwright, host (not Sail); needs Sail up
npx playwright test
```

### Quality

Use the `run-forensics` skill — it detects the touched side(s) and runs the right tools.

Underlying tools if you need one directly: `sail composer analyse` (phpstan level via Larastan), `sail composer pint`, `sail php ./vendor/bin/rector process --dry-run`, and in `apps/panel`: `npm run format` / `npm run lint`, `npm run typecheck`. Pint enforces `declare(strict_types=1)`.

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

Standard Laravel structure (see [ADR 0002](docs/adr/0002-estructura-laravel-estandar.md)):

```text
app/
├── Http/
│   ├── Controllers/
│   ├── Requests/
│   └── Resources/
├── Models/
├── Actions/     # single-responsibility business logic
├── Services/    # third-party API/SDK adapters
├── Enums/
└── Providers/
```

- **Thin controllers**: HTTP routing, authorization, responses only. No SQL, validation, or business logic. Never `$request->validate()` — always inject a FormRequest.
- **Actions/Services**: single-responsibility classes exposing one `execute()`/`handle()` method. Action encapsulates core business logic; Service wraps third-party APIs/SDKs (adapter pattern) to keep external systems out of the domain.
- **Thin models**: relations, casts, basic scopes only. API Resources/DTOs do data shaping. Complex queries go in scopes/query classes, not controllers.

`tests/Arch/ArchTest.php` enforces the controller/FormRequest/Resource conventions and the strict-types rule automatically — a failing Arch test names exactly what regressed. Fix by refactoring, never by adding an `->ignoring()` exception (the existing ones are correctness exceptions, not debt).

### Auth

Sanctum SPA (cookie) auth, not tokens: `bootstrap/app.php` calls `$middleware->statefulApi()`, which only attaches session/CSRF handling to requests whose `Origin`/`Referer` matches `SANCTUM_STATEFUL_DOMAINS` (`.env`) — a request without that header falls through to stateless/token auth instead and `$request->session()` throws if a controller assumes it's always there. `config/cors.php` requires an explicit `FRONTEND_URL` origin with `supports_credentials: true`; CORS can't use a wildcard origin with credentialed requests. The panel's axios client sends `withCredentials` + `withXSRFToken`. Routes: `POST /api/login`, `POST /api/logout` and `GET /api/me` behind `auth:sanctum` (`app/Http/Controllers/AuthController.php`). Tests simulate the SPA's `Referer` header explicitly (`tests/Feature/SanctumSpaAuthTest.php`) since Pest's HTTP client doesn't send one by default.

### Frontend structure (`apps/panel`)

See [ADR 0003](docs/adr/0003-estructura-features-react.md).

- `src/routes/<module>/`: only TanStack Router entrypoints — `index.tsx` (list), `nuevo.tsx` (create), `$id.tsx` (show), `$id.editar.tsx` (edit) at the module root; non-CRUD feature modules use a single `index.tsx`. Everything else (local components, hooks, tests) goes in a co-located `-components/`, `-hooks/`, `-tests/` folder inside the module — the `-` prefix is TanStack Router's own mechanism for excluding a folder from route generation, replacing Inertia's implicit "everything else" convention.
- `src/components/ui/`: shadcn/ui primitives, domain-agnostic. `src/components/` root: shared atomic components without domain/layout awareness. `src/features/`: shared composed components with domain/layout awareness. Global infra: `src/layouts/`, `src/hooks/`, `src/lib/` (pure TS helpers/enums, the `api` axios client), `src/types/`.
- Components stay presentational; business logic, state mutations and API calls live in custom hooks (`useSomething.ts`). Max 250 lines per file, 150 per component — refactor before adding logic. Don't over-parametrize for reuse; prefer dedicated components.
- Styling: Tailwind utilities inside components; `src/index.css` is the only stylesheet.
- **No page-level horizontal scroll, on any viewport**: wide content scrolls inside its own `overflow-auto` wrapper or wraps (`flex-wrap`); mind `min-w-0` on flex items. Known smell: `grid gap-6 xl:grid-cols-*` without an explicit `grid-cols-1` base.

### E2E suite

`e2e/smoke.spec.ts` hits both servers directly (`api` on :8080, `panel` on :5174) — no auth or seeded demo data involved yet. In CI, `playwright.config.ts`'s `webServer` array boots both (`php artisan serve` + `vite dev`) itself; locally it expects the Sail stack already running. Conventions for real specs (DB reset strategy, auth storageState, spec isolation) aren't defined yet — write them into this section once they exist.

## ADRs

`docs/adr/` holds only decisions that would need re-litigating without a written reason — not tech choices. An ADR answers "why did we choose this and what did we rule out", not "what technology do we use". See `docs/adr/0001-api-rest-en-lugar-de-inertia.md` for the format.

## Session docs (local only)

`.claude/docs/` is gitignored (only `.claude/skills/` is tracked). If `.claude/docs/status.md` exists, **read it at session start** — it is the living record of project status, recent decisions and pending work.
