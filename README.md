# Clini

[![Tests](https://github.com/sntlln93/clini-app/actions/workflows/tests.yml/badge.svg?branch=develop)](https://github.com/sntlln93/clini-app/actions/workflows/tests.yml)
[![Code Quality](https://github.com/sntlln93/clini-app/actions/workflows/code-quality.yml/badge.svg?branch=develop)](https://github.com/sntlln93/clini-app/actions/workflows/code-quality.yml)

**Tu agenda, en orden. Tu tiempo, de vuelta.**

Clini es un sistema de turnos para profesionales independientes y consultorios chicos (1 a 5 profesionales) — simple, rápido y sin planillas. Es el primer paso de una plataforma de gestión médica modular más amplia; ver [visión del producto](docs/product/vision.md) y [roadmap](docs/product/roadmap.md).

## Estructura

```
clini-app/
├── apps/
│   ├── api/       # Laravel — API REST (Sail para desarrollo)
│   └── panel/     # React + TS + TanStack Router/Query — SPA del panel profesional
├── e2e/           # Playwright, corre contra api + panel
└── docs/
    ├── product/       # visión, roadmap
    ├── architecture/  # overview, development
    └── adr/           # decisiones de arquitectura
```

`apps/panel` y `e2e` son un único npm workspace (un `package-lock.json` en la raíz) para desarrollo y CI; en producción cada app se despliega por separado con su propio Dockerfile.

## Quickstart

```bash
git config core.hooksPath .githooks   # una vez por clon
npm install                            # workspace: panel + e2e

cp apps/api/.env.example apps/api/.env
docker compose up -d                   # api + panel + postgres, desde la raíz
apps/api/vendor/bin/sail artisan migrate
```

- API: <http://localhost:8080>
- Panel: <http://localhost:5174>

Más detalle en [docs/architecture/development.md](docs/architecture/development.md).

## Calidad

```bash
bash .claude/skills/run-forensics/scripts/run-forensics.sh          # lint + análisis estático
bash .claude/skills/run-forensics/scripts/run-forensics.sh --full   # + test suites
```

Herramientas: Pint, Larastan, Rector y Pest (+ Arch tests) en `apps/api`; ESLint, Prettier, TypeScript y Vitest en `apps/panel`; Playwright end-to-end.

## Stack

- **Backend**: Laravel, PostgreSQL, Sail — API REST pura (ver [ADR 0001](docs/adr/0001-api-rest-en-lugar-de-inertia.md)).
- **Frontend**: React, TypeScript, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui.
- **Deploy**: Docker + Dokploy, un Dockerfile por app.

## Flujo de trabajo

PRs contra `develop` (squash); `develop → main` por merge commit dispara el deploy. Ver [docs/architecture/overview.md](docs/architecture/overview.md).

## Documentación

- [Visión del producto](docs/product/vision.md)
- [Roadmap](docs/product/roadmap.md)
- [Architecture overview](docs/architecture/overview.md)
- [Infrastructure](docs/architecture/infrastructure.md)
- [Integrations](docs/architecture/integrations.md)
- [Development guide](docs/architecture/development.md)
- [ADRs](docs/adr/)
