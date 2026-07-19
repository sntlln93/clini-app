# Clini

Plataforma de gestión de turnos médicos. Monorepo con la API y el panel profesional.

## Estructura

```
clini-app/
├── apps/
│   ├── api/      # Laravel — API REST (Sail para desarrollo)
│   └── panel/     # React + TS + TanStack Router/Query — SPA del panel
└── docs/
    ├── product/       # visión, roadmap
    ├── architecture/  # overview, development
    └── adr/           # decisiones de arquitectura
```

## Quickstart

```bash
cd apps/api
cp .env.example .env
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate
```

- API: http://localhost:8080
- Panel: http://localhost:5174

Ver [docs/architecture/development.md](docs/architecture/development.md) para más detalle.

## Stack

- **Backend**: Laravel, PostgreSQL, Sail.
- **Frontend**: React, TypeScript, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui.
- **Deploy**: Docker + Dokploy, un Dockerfile por app.

## Documentación

- [Visión del producto](docs/product/vision.md)
- [Roadmap](docs/product/roadmap.md)
- [Architecture overview](docs/architecture/overview.md)
- [ADRs](docs/adr/)
