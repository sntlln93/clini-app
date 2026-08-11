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

Backend runs through Laravel Sail (Docker) — there is no local PHP. Docker Compose is split one file per app (`apps/api/compose.yaml`, `apps/panel/compose.yaml`), plus a root `compose.yaml` that `include`s both — `docker compose up` from the repo root starts everything (api + panel + pgsql + mailpit) as one project. See `docs/architecture/development.md` for the full layout.

**Always invoke Sail from the repo root, as `apps/api/vendor/bin/sail …` — never `cd apps/api && ./vendor/bin/sail …`.** Both work (Sail runs the command *inside* the container, where the working dir is always `/var/www/html`, so `./vendor/bin/pest` resolves there regardless of your host cwd; `name: clini-app` is pinned in `apps/api/compose.yaml` so either entrypoint lands on the same Compose project). The root-relative form is the required one because it is what `.claude/settings.json` allowlists — the `cd` form matches no rule and makes every command prompt for permission, which breaks the autonomous issue flow. Humans working interactively may `cd` wherever they like; this rule is about the form written into commands.

**`npm`/`npx` must never be invoked as a bare host process, for any reason — no exceptions.** This is stricter than (but mirrors) the Sail-only rule above, and replaces an earlier carve-out that used to allow bare-host `npm install`/`npm run dev` for interactive development; that carve-out is exactly what caused a missing-native-binary bug (`apps/panel`'s `node_modules` is bind-mounted into the `panel` container, so a host `npm install` — running with whatever Node happens to be active locally — could silently install the wrong platform's optional native bindings, or skip them, and clobber what the container needs). `apps/panel/compose.yaml` now overlays `node_modules` with a dedicated named Docker volume specifically so the container's copy can never be touched from host, but the "never run npm on host" rule stands regardless, so this class of bug can't resurface some other way.
  - Day-to-day work (test, typecheck, lint, format, dev): through the `panel` container. One-off commands: `docker compose exec --workdir /workspace/apps/panel panel npm run <script>` (the form allowlisted in `.claude/settings.json`); the container mounts only `apps/panel` (at `/workspace/apps/panel`) plus the two root manifests (`package.json`, `package-lock.json`, individually mounted at `/workspace`) — not the whole monorepo root — because the workspace lockfile is indexed by workspace path and needs both manifests present to resolve `apps/panel`. The container installs with the filtered form (`npm install --workspace=apps/panel --include-workspace-root=false`), the same one CI's panel jobs and production share (see below). The nested `apps/panel/node_modules` stays shared host↔container as a plain bind-mounted directory (only the hoisted `/workspace/node_modules` is protected by the `panel_node_modules` named volume). Continuous dev serving is already handled by the container's own `command`.
  - Any one-time host-side install that only needs to exist for editor/IDE type resolution (not to run anything) — see the `npm install` setup step below — goes through a disposable container instead, so the `npm` binary itself still never executes on host: `docker run --rm -v "$PWD:/workspace" -w /workspace --user "$(id -u):$(id -g)" node:24-bookworm-slim npm install`. Same pattern as `e2e_node()` in `.claude/skills/run-forensics/scripts/run-forensics.sh`.
  - **Reading installed package source for diagnosis** (e.g. checking a library's actual runtime behavior): `docker compose exec panel <cmd>` against `/workspace/node_modules` is not reliable — it can report `No such file or directory` even with a correct absolute path. Attach a throwaway container straight to the named volume instead: `docker run --rm -v clini-app_panel_node_modules:/data alpine sh -c "<command>"` (e.g. `grep -rn 'retry:' /data/@tanstack/query-core/build/...`).

The repo root is an npm workspace (`apps/panel` is its only member today) — a single `package-lock.json` covers both the e2e (Playwright) deps and the panel's. Neither actually depends on a host-side install to *run* anymore: `apps/panel`'s container manages its own isolated copy (named volume, see above) and e2e runs its own containerized `npm install` too (see Tests below) — the host-side install exists solely so editors resolve types locally. This applies to **local dev and CI only**: production Docker builds (`apps/panel/Dockerfile`) still treat each app as standalone — Dokploy builds it with the repo root as context but installs only `apps/panel`'s dependencies (`npm ci --workspace=apps/panel --include-workspace-root=false`), and the image never includes the e2e suite. CI shares this same filtered form through `.github/actions/setup-node`'s `scope` input: `scope: panel` (used by `quality_frontend` and `tests_frontend`) runs `npm ci --workspace=apps/panel --include-workspace-root=false`, while `scope: workspace-root` (the default, used explicitly by `e2e`) runs the full unfiltered `npm ci` that `e2e` needs for its root-level Playwright deps and `test:e2e` script.

```bash
git config core.hooksPath .githooks               # once per clone (strips agent attribution from commit messages)
docker run --rm -v "$PWD:/workspace" -w /workspace --user "$(id -u):$(id -g)" node:24-bookworm-slim npm install   # once per clone — for editor/type-checking use only; see rule above
cp apps/api/.env.example apps/api/.env            # once per clone
# Codex only: mark this repo "trusted" locally (once per machine) so it loads
# the versioned .codex/config.toml — see the Session docs section below.
docker compose up -d                              # starts api + panel + pgsql + mailpit, from the repo root
apps/api/vendor/bin/sail artisan migrate          # first run
```

- API: <http://localhost:8080>
- Panel: <http://localhost:5174>
- Mailpit (dev mail UI): <http://localhost:8025> — dev mail transport; SMTP on port `1025`. Production uses `MAIL_MAILER=resend` with a `RESEND_API_KEY` environment variable (no real value in the repo).

`database/seeders/DatabaseSeeder.php` seeds a full literal, deterministic fixture set (two organizations, users/memberships covering every role and status, professionals, patients, scheduling data) — safe to re-run (`php artisan db:seed`) and safe on the production image (no factories/faker). See `docs/architecture/development.md` § Datos de prueba (seeders) for the credentials table and how to seed a deployed environment (manual only, production never seeds automatically).

**TypeScript is pinned to `~6.0.2`** in both `package.json` (root) and `apps/panel/package.json` — deliberately, not an oversight. `typescript-eslint@8.64.0`'s peer dependency caps at `<6.1.0`; bumping to TS 7 breaks ESLint with a hard-to-read `ts-api-utils` crash, not a version-mismatch error. Bump both together only once `typescript-eslint` supports it.

**`apps/panel/src/routeTree.gen.ts` is generated, not committed.** The `build` and `typecheck` npm scripts run `vite build` *before* `tsc` specifically so the TanStack Router Vite plugin writes that file first — a fresh checkout (CI, or the first `docker build` with no locally-cached copy) fails with `Cannot find module './routeTree.gen'` if this order is reversed. Don't "simplify" these scripts back to `tsc && vite build`.

### Tests

```bash
# Backend — Pest, through Sail (Arch, Unit, Feature testsuites). Always from the repo root.
apps/api/vendor/bin/sail php ./vendor/bin/pest
apps/api/vendor/bin/sail php ./vendor/bin/pest --filter "..."
apps/api/vendor/bin/sail artisan test --testsuite=Arch    # fast, no DB — architecture rules from this file

# Frontend — Vitest, through the panel container. Always from the repo root.
docker compose exec --workdir /workspace/apps/panel panel npm run test

# E2E — Playwright, fully containerized (own `sail-8.5/app`-based service + an
# isolated ephemeral Postgres, `pgsql-e2e`); doesn't need anything else up first.
docker compose --profile e2e up --abort-on-container-exit e2e
```

**Testing a Postgres race condition** (two requests racing a unique constraint): a raw insert made from inside a model event (e.g. `creating`) still runs inside the test's own `RefreshDatabase` transaction/savepoint, so the savepoint rollback that follows the unique-constraint error undoes it too — the race never reproduces. It takes a genuinely separate `PDO` connection (its own Postgres session) to commit independently of that rollback; see `apps/api/tests/Feature/Patients/PatientStoreTest.php` (`raceCleanupTasks()` + the `afterAll()` cleanup) for the working pattern, including why cleanup has to happen in `afterAll()` rather than inline.

### Quality

Use the `run-forensics` skill — it detects the touched side(s) and runs the right tools.

Underlying tools if you need one directly, all from the repo root: `apps/api/vendor/bin/sail composer analyse` (phpstan level via Larastan), `apps/api/vendor/bin/sail composer pint`, `apps/api/vendor/bin/sail php ./vendor/bin/rector process --dry-run`, and through the panel container: `docker compose exec --workdir /workspace/apps/panel panel npm run format` / `npm run lint` / `npm run typecheck`. Pint enforces `declare(strict_types=1)`.

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
- DTOs are `final readonly`, implement `App\Contracts\Data`, live in `App\Data\<Module>`, and must always be named as nouns to reflect that they are passive data containers. Bad: DeleteSchoolData, UpdateUser. Good: DeletedSchoolData, SchoolDeletionData.

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
- `.github/actions/setup-node` takes a `scope` input (`workspace-root`, the default, or `panel`) so panel-only jobs (`quality_frontend`, `tests_frontend`) install just `apps/panel`, while `e2e` keeps the full root install it needs for Playwright — see the npm-workspace paragraph above.

## Architecture

### Backend layering

Standard Laravel structure (see [ADR 0002](docs/adr/0002-estructura-laravel-estandar.md)):

```text
app/
├── Contracts/          # Action, Data and DomainError interfaces
├── Http/
│   ├── Controllers/<Module>/   # Controller.php is the only file allowed directly under Controllers/
│   ├── Requests/<Module>/
│   └── Resources/<Module>/
├── Models/              # stays flat, no per-module subdirectories
├── Actions/<Module>/     # single-responsibility business logic
├── Services/<Module>/    # third-party API/SDK adapters
├── Data/<Module>/        # DTOs
├── Exceptions/<Module>/  # domain exceptions; DomainException.php is the only file allowed directly under Exceptions/
├── Enums/                # stays flat, no per-module subdirectories
└── Providers/
```

- **Thin controllers**: HTTP routing, authorization, responses only. No SQL, validation, or business logic. Never `$request->validate()` — always inject a FormRequest.
- **Actions/Services**: single-responsibility classes exposing one `handle()` method. Action encapsulates core business logic and implements `App\Contracts\Action`; since PHP can't narrow the native param type, the narrowing is declared via `@implements Action<XData>` on the class and `@param XData $dto` on the method (verified by PHPStan/Larastan), while the return type is narrowed natively. Service wraps third-party APIs/SDKs (adapter pattern) and implements its own domain interface in `App\Contracts` (e.g. `TwilioService implements SmsGateway`), never a common marker interface.
- **DTOs**: live in `App\Data\<Module>`, `final readonly`, implement `App\Contracts\Data` (`toArray(): array` only, no constructor/factory in the contract).
- **Domain errors**: never throw a generic exception (`Exception`, `RuntimeException`, `\DomainException`) or call `abort()` for an expected business flow — throw a concrete exception under `App\Exceptions\<Module>`, `final`, suffixed `Exception`, implementing `App\Contracts\DomainError` (`errorCode(): ErrorCode`, `httpStatus(): int`, `logContext(): array`, `publicContext(): array`). Business rules return **409**; `422` stays reserved for FormRequest input validation. `catch`/`render` operate on the `DomainError` interface, never on the abstract base `App\Exceptions\DomainException`, so an un-`use`d catch can't silently catch SPL's own `\DomainException` instead. A single `render` callback in `bootstrap/app.php` is the only place that translates a `DomainError` into an HTTP response — no controller or Action builds one. See [ADR 0009](docs/adr/0009-contrato-de-errores-de-dominio.md) and `docs/architecture/error-contract.md`. The only calls to `abort()` still allowed are the handful of defensive assertions over states the framework already makes unreachable (documented at each call site) — not business rules.
- **Per-module subdirectories**: `Actions/`, `Services/`, `Data/`, `Http/Requests/`, `Http/Resources/`, `Http/Controllers/` and `Exceptions/` are grouped by module (e.g. `Actions/Auth/`, `Http/Controllers/Auth/`) — no `.php` file sits directly under those seven roots, except `Http/Controllers/Controller.php` and `Exceptions/DomainException.php`. `Models/` and `Enums/` stay flat.
- **Thin models**: relations, casts, basic scopes only. API Resources/DTOs do data shaping. Complex queries go in scopes/query classes, not controllers.
- **API routes**: live in `routes/api/v1/<module>.php` (one file per module); `routes/api.php` only loads them inside a single `Route::prefix('v1')` group, so the `v1` prefix is applied once, in that loader.

`tests/Arch/ArchTest.php` enforces the controller/FormRequest/Resource conventions and the strict-types rule automatically — a failing Arch test names exactly what regressed. Fix by refactoring, never by adding an `->ignoring()` exception (the existing ones are correctness exceptions, not debt).

### Auth

Sanctum SPA (cookie) auth, not tokens: `bootstrap/app.php` calls `$middleware->statefulApi()`, which only attaches session/CSRF handling to requests whose `Origin`/`Referer` matches `SANCTUM_STATEFUL_DOMAINS` (`.env`) — a request without that header falls through to stateless/token auth instead and `$request->session()` throws if a controller assumes it's always there. `config/cors.php` requires an explicit `FRONTEND_URL` origin with `supports_credentials: true`; CORS can't use a wildcard origin with credentialed requests. The panel's axios client sends `withCredentials` + `withXSRFToken`. Routes: `POST /api/v1/login`, `POST /api/v1/logout` and `GET /api/v1/me` behind `auth:sanctum` (`app/Http/Controllers/Auth/AuthController.php`). Tests simulate the SPA's `Referer` header explicitly (`tests/Feature/SanctumSpaAuthTest.php`) since Pest's HTTP client doesn't send one by default.

### Frontend structure (`apps/panel`)

See [ADR 0003](docs/adr/0003-estructura-features-react.md).

- `src/routes/<module>/`: only TanStack Router entrypoints — `index.tsx` (list), `nuevo.tsx` (create), `$id.tsx` (show), `$id.editar.tsx` (edit) at the module root; non-CRUD feature modules use a single `index.tsx`. Everything else (local components, hooks, tests) goes in a co-located `-components/`, `-hooks/`, `-tests/` folder inside the module — the `-` prefix is TanStack Router's own mechanism for excluding a folder from route generation, replacing Inertia's implicit "everything else" convention. A CRUD module of a listed entity uses this page pattern (`nuevo.tsx`/`$id.editar.tsx`); a non-CRUD feature module resolves its forms inline or in a contextual Dialog instead — see [ADR 0006](docs/adr/0006-patron-de-formularios-pagina-vs-dialog.md).
- Routes live under two pathless layout routes (no URL segment of their own): `src/routes/_auth/` holds every guarded module (`agenda`, `pacientes`, `profesionales`, `disponibilidad`, `ajustes`, `test`, `/`), rendered inside `PanelLayout`; `src/routes/_public/` holds `login`/`registro`, rendered inside a minimal centered layout with no sidebar/header. `_auth`'s `beforeLoad` requires a session and `_public`'s redirects an authenticated user away — see `src/lib/auth-guards.ts`.
- `src/components/ui/`: shadcn/ui primitives, domain-agnostic. `src/components/` root: shared atomic components without domain/layout awareness. `src/features/`: shared composed components with domain/layout awareness. Global infra: `src/layouts/`, `src/hooks/`, `src/lib/` (pure TS helpers/enums, the `api` axios client), `src/types/`.
- Components stay presentational; business logic, state mutations and API calls live in custom hooks (`useSomething.ts`). Max 250 lines per file, 150 per component — refactor before adding logic. Don't over-parametrize for reuse; prefer dedicated components.
- Styling: Tailwind utilities inside components; `src/index.css` is the only stylesheet.
- **No page-level horizontal scroll, on any viewport**: wide content scrolls inside its own `overflow-auto` wrapper or wraps (`flex-wrap`); mind `min-w-0` on flex items. Known smell: `grid gap-6 xl:grid-cols-*` without an explicit `grid-cols-1` base.
- The panel is a client-rendered SPA with no SSR/RSC: `'use client'`/`'use server'` directives are meaningless and banned everywhere under `src/**`, including vendored `src/components/ui/` primitives — enforced by ESLint (`no-restricted-syntax`, no exempt folders).
- **Prefilling form state from props/queries**: the ESLint rule `react-hooks/set-state-in-effect` rejects the obvious `useEffect(() => setValues(...), [data])` pattern. Use React's documented "adjust state during render" pattern instead — a guarded `setValues` call in the component body — not a `useEffect`.
- **Page reads happen in the route's `loader`, not via `useQuery` from the component.** The loader resolves with `queryClient.ensureQueryData(...)` using the router-context `queryClient` (the same pattern as `requireSession` in `src/lib/auth-guards.ts`), so caching and mutations stay TanStack Query's. A `useQuery` inside a component is only allowed for reads triggered by interaction rather than navigation (e.g. patient lookup by document). See [ADR 0007](docs/adr/0007-fetching-con-loaders-de-tanstack-router.md).
- **A mutation that leaves the user on a page whose data came from a loader must call the shared `useRefreshPageData()` hook (`src/hooks/use-refresh-page-data.ts`) in its `onSuccess`, returning its promise.** Plain `invalidateQueries` + `router.invalidate()` is not enough: `queryClient.ensureQueryData` (what the loader uses) returns the cached value without checking invalidation, and a loader-only read has no mounted observer to refetch it — so the helper invalidates with `refetchType: 'all'` and awaits it before re-running the loader. A mutation that navigates away instead needs nothing extra: the destination loader already runs on arrival. See [ADR 0007](docs/adr/0007-fetching-con-loaders-de-tanstack-router.md).
- **Request state lives in the URL.** Everything that parametrizes a read — search, pagination, date, view, selected entity — is declared with `validateSearch` (zod) and reaches the loader via `loaderDeps`. No `useState` or state library is the source of truth for a read. Pure UI state (dialog open, a pending confirmation) stays in `useState`.
- **Fully typed end to end**: the loader declares the type it returns and the page consumes it with `Route.useLoaderData()` — for page reads there is no `data | undefined`, no `?? []`, no `data && …` guard. Numeric route params are parsed in the route definition with `params.parse`, never with `Number(id)` inside the component.
- **Page-read errors are rendered by the route's `errorComponent`**, not by an error state rendered by the component.
- **Never write a shadcn API from memory — look it up first.** Before using or modifying any shadcn/registry component, confirm its real props, variants and sub-components by reading the installed source, `apps/panel/src/components/ui/<name>.tsx` — it includes this project's local customizations (e.g. the `focus-ring` utility in `button`; the own `size` prop on `avatar`/`select`/`switch`; the own `variant` prop on `dropdown-menu`) that the registry does not have, which is why it — not the MCP — is the source of truth for props/variants. Use `mcp__shadcn__get_item_examples_from_registries` to confirm *composition* (which part goes with which), since composition is identical across variants and the MCP is reliable there. Invented props are the failure mode this rule exists to prevent, and they often survive `tsc` — loose or `any`-typed props and `className` passthrough hide them until review. Recurring examples: `<Button isLoading>`/`isPending` (neither exists — compose `Spinner` + `data-icon` + `disabled`), undefined `variant` strings, and items rendered outside their required Group (`SelectItem` → `SelectGroup`). This covers registry components only; for the project's own `src/components/` and `src/features/`, read the source file. `pass-sentence` treats a violation as a REQUIRED finding.

### shadcn AI tooling (skill + MCP)

Two independent aids, both consumed through the container — see the mandatory-consultation rule above:

- **Skill** `shadcn` (`.agents/skills/shadcn/`, symlinked at `.claude/skills/shadcn`): composition and styling rules (Field/FieldGroup, `data-icon`, `asChild` vs `render`, semantic tokens). It is vendored upstream content and is **not** adapted to this repo: every CLI example in it is written as a bare host `npx shadcn@latest …`. Translate each one to `docker compose exec --workdir /workspace/apps/panel panel npx shadcn@latest …`, which is the allowlisted form. Bare `npm`/`npx`/`pnpm`/`bunx` are in `.claude/settings.json`'s `deny` list precisely so the skill's own `allowed-tools` grant cannot re-open that door.
- **MCP server** `shadcn` (`.mcp.json`, project scope, versioned): the live registry — real props, files and usage examples. It runs as `docker compose exec -T --workdir /workspace/apps/panel panel npx -y shadcn@latest mcp`; the workdir is what lets it resolve `apps/panel/components.json`. **It requires the `panel` container to be up** (`docker compose up -d`) — with the container down every tool call fails, and the fix is to start it, never to fall back to a host `npx`.
  - **Only three tools take a `registries` parameter — pass `["@shadcn"]` to those three, and to no others.** `list_items_in_registries`, `search_items_in_registries` and `get_item_examples_from_registries` accept it, and omitting it makes them return *"No registries are configured"* even though `get_project_registries` reports `@shadcn` as configured — a CLI quirk, not a misconfiguration, and not a reason to declare the MCP broken. The other four (`get_project_registries`, `view_items_in_registries`, `get_add_command_for_items`, `get_audit_checklist`) do **not** accept it and declare `additionalProperties: false`, so passing it is a schema violation, not a harmless extra. `view_items_in_registries` resolves `@shadcn/<item>` from the item name alone.
  - **`view_items_in_registries` is discarded as a source for props/variants** — for two independent reasons. First, it resolves the wrong variant: asking for `@shadcn/button` reports `Dependencies: radix-ui` and `@shadcn/data-table` resolves to `styles/new-york-v4/…`, even though `apps/panel/components.json` declares `"style": "base-nova"` — this project is pure base-ui (no `radix-ui` in `package.json`, no `@radix-ui` import under `src/`, none in `node_modules`), so a `Dependencies: radix-ui` answer means the MCP picked the wrong variant, not a missing dependency to install; the CLI itself resolves correctly, this is the MCP's defect. Second, despite its description promising them, it returns no file contents — only name, type, file count and dependencies. It still stays wired into the `tools:` frontmatter of `contractor`, `coroner` and `judge` (existence/list checks still use it), it is only ruled out as a props/API reference.
  - **Four questions, four sources** — this is the full split, not a single MCP authority:

    | question | source |
    |---|---|
    | which props/variants does this component accept? | the file `apps/panel/src/components/ui/<name>.tsx` — it includes the local customizations |
    | how is it composed correctly (which part goes with which)? | `mcp__shadcn__get_item_examples_from_registries` (composition is identical across variants, so the MCP *is* reliable here) |
    | does this component exist in the registry? | `mcp__shadcn__search_items_in_registries` / `list_items_in_registries` |
    | does it differ from upstream? | `npx shadcn@latest add <c> --diff` via the container (a deliberate one-off check, not day-to-day work) |

    Behind the local file, for a primitive's own detail, are base-ui's own types, e.g.:
    ```bash
    docker run --rm -v clini-app_panel_node_modules:/data alpine \
      sh -c "grep -n 'items' /data/@base-ui/react/select/root/SelectRoot.d.ts"
    ```
  - Available tools: `get_project_registries`, `list_items_in_registries`, `search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`, `get_add_command_for_items`, `get_audit_checklist`. They are declared one by one in the `tools:` frontmatter of the `contractor`, `judge` and `coroner` agents — a subagent's `tools:` is an explicit allowlist, so an `mcp__shadcn__*` wildcard is not relied on there; adding a tool means adding its full name. `coroner` gets all of them except `get_add_command_for_items`, whose only purpose is producing an install command it is barred from acting on.
  - **`deny` and `allow` here are complementary, not alternatives.** `.claude/settings.json` allows the container form (`Bash(docker compose exec --workdir /workspace/apps/panel panel npx shadcn@latest *)`) so it runs unprompted, *and* denies bare `npm`/`npx`/`pnpm`/`bunx`. The deny is the part that matters: the vendored skill's frontmatter carries `allowed-tools: Bash(npx shadcn@latest *)`, and only a `deny` rule outranks that grant — allowing the container form does not revoke it. The two do not collide: permission matching is prefix-based per command segment, so a segment starting with `docker` never matches `npx *` (verified: `npx --version` is denied while the `docker compose exec … npx …` form runs).

### Context7 MCP (library documentation)

`context7` (`.mcp.json`, project scope, versioned) gives agents current documentation for the stack libraries (React 19, TanStack Router/Query, Tailwind 4, Laravel 13) instead of relying on trained knowledge — a hallucination guard for *library* APIs. It runs as `docker compose exec -T panel npx -y @upstash/context7-mcp`; unlike shadcn MCP it needs no `--workdir`, and it works anonymously — no API key.

Consult it before writing non-trivial code against a stack library, and when debugging behavior that looks like an API changed under us. It does not overlap with shadcn MCP: **shadcn/ui component props and composition stay with the shadcn sources documented above** (the installed `src/components/ui/<name>.tsx` file for props, the shadcn MCP for composition); Context7 covers everything else in the stack. It is not for business logic, code review, or general programming concepts.

Two tools, used in sequence: `resolve-library-id` first (library name → a `/org/project` id), then `query-docs` (one concept per query — separate calls for separate concepts, never a single query bundling several).

Known limitations:
- Requires the `panel` container up (`docker compose up -d`) — same as shadcn MCP; with it down every call fails, and the fix is to start it, never to fall back to a host `npx`.
- The package is unpinned, and **tool names have changed across majors** (`get-library-docs` → `query-docs` in v3). If calls start failing after an upstream bump, re-check the real names with a `tools/list` handshake and update both the agents' frontmatter and `permissions.allow` — the allowlist is version-coupled.
- It reaches an external API over the network: never put credentials, secrets or proprietary code in a query (the tool schemas warn about this explicitly).

### E2E suite

`e2e/smoke.spec.ts` hits both servers directly (`api` on :8080, `panel` on :5174, its API check against `/api/v1/ping`) — no auth or seeded demo data involved yet. `playwright.config.ts`'s `webServer` array boots both (`php artisan serve` + `vite dev`) itself whenever `CI` is set — true in real CI, and also true for the local `e2e` compose service (see Tests above), which sets it deliberately so the whole run stays in one process/network namespace instead of depending on the persistent dev-loop `laravel.test`/`panel` containers (whose baked `VITE_API_URL` only resolves correctly from a browser on the same host/network as that specific container).

Every spec that drives a `page` imports `test`/`expect` from `e2e/fixtures.ts`, never from `@playwright/test` directly. The fixture fails the spec on any unexpected browser `console.error`/`console.warn`, and on any HTTP response with status >= 400 (`log`/`info`/`debug` and connection-level failures are out of scope). Exceptions are declared per spec — never in a global list — with a single `test.use({ expectedIssues: { console: [...], responses: [{ url, status }] } })` (one object option, not two array options — Playwright's fixture parser misreads an array of two-or-more `RegExp`/object entries as a `[value, options]` tuple), scoped as narrowly as possible (a `test.describe` around the one test that needs it) so adding one stays visible in the diff:

```ts
test.describe('panel redirects an unauthenticated visitor to login', () => {
  test.use({ expectedIssues: { responses: [{ url: /\/api\/v1\/me$/, status: 401 }] } })
  // ...
})
```

Both e2e environments run `php artisan db:seed --force` right after migrating (the deterministic `DatabaseSeeder`, no factories), so specs can log in as a known seeded user instead of creating their own fixtures. `e2e/auth.setup.ts` runs as a Playwright `setup` project that `chromium` depends on: it drives a real UI login as `ana.duena@test.com` / `password` and persists the session to `e2e/.auth/panel.json` (gitignored). `storageState` is deliberately **not** set globally in `playwright.config.ts`'s `use` block — `e2e/smoke.spec.ts` needs an anonymous session — so an authenticated spec opts in explicitly instead, e.g. `e2e/panel-crawl.spec.ts` with `test.use({ storageState: STORAGE_STATE })` imported from `./auth.setup`.

Conventions for real specs (DB reset strategy, spec isolation) aren't defined yet — write them into this section once they exist.

## ADRs

`docs/adr/` holds only decisions that would need re-litigating without a written reason — not tech choices. An ADR answers "why did we choose this and what did we rule out", not "what technology do we use". See `docs/adr/0001-api-rest-en-lugar-de-inertia.md` for the format.

## Session docs (local only)

`.claude/docs/` is gitignored (only `.claude/agents/`, `.claude/skills/` and `.claude/settings.json` are tracked). If `.claude/docs/status.md` exists, **read it at session start** — it is the living record of project status, recent decisions and pending work.

`.agents/` is the canonical home for the project's own AI tooling: instructions (`.agents/CLAUDE.md`), own skills (`.agents/skills/<name>/`) and subagents (`.agents/agents/<name>.md`). `CLAUDE.md`, `AGENTS.md`, `.claude/skills/<name>` and `.claude/agents/<name>.md` are symlinks into it, so Claude Code and Codex read the same files. A new own skill or agent is always created under `.agents/` and symlinked from `.claude/` — never the other way round.

Skills installed via the [`skills`](https://skills.sh) CLI follow the same shape: the real content lives under `.agents/skills/<name>/`, `.claude/skills/<name>` is a symlink into it (cross-agent sharing: other tools like Cursor/Copilot symlink the same directory). Both `.agents/` and `skills-lock.json` (repo root) are tracked, same as `.claude/skills/`. `skills-lock.json` tracks **only** skills installed via that CLI (today just the vendored `shadcn`) — the project's own skills (and its subagents) have no lock entry.

Codex's project config is versioned at `.codex/config.toml` (MCP servers + permission intent), kept in sync by hand with `.mcp.json` and `.claude/settings.json`'s intent.

Installing one still obeys the never-`npx`-on-host rule, and the disposable-container form needs a tweak: the CLI shells out to `git` to clone, which `node:24-bookworm-slim` does not ship, so use the full image for this one command:

```bash
docker run --rm -v "$PWD:/workspace" -w /workspace --user "$(id -u):$(id -g)" -e HOME=/tmp node:24-bookworm npx -y skills add <source> --yes
```

Two things to clean up after any install: the CLI also writes a duplicate copy of every skill to `agent/skills/` at the repo root for non-symlinking tools (delete it — it is gitignored, and `.agents/` is the tracked copy), and it installs **every** skill the source ships. `shadcn/ui` ships a sibling `migrate-radix-to-base` that this project deliberately does not track; if it reappears, remove its directory, its symlink and its `skills-lock.json` entry.

**Vendored skills are kept byte-identical to upstream** so `skills-lock.json`'s `computedHash` stays meaningful. That means a skill's own instructions are *not* adapted to this repo's constraints — where they conflict (e.g. `shadcn`'s host `npx` examples), the override lives in this file and in the agent prompts, never as a local edit to the skill. See the shadcn section above.
