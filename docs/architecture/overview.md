# Architecture Overview

## Monorepo

Un único repositorio con las apps desplegables como carpetas hermanas:

```
clini-app/
├── apps/
│   ├── api/      # Laravel — API REST, Sail para desarrollo
│   └── panel/     # React + TS — SPA del panel profesional
└── docs/
```

El panel y la (futura) landing comparten workspace de Node cuando exista una segunda app frontend; hasta entonces `apps/panel` se maneja con npm sin herramientas de monorepo JS adicionales.

## Backend

- Laravel, API pura (sin Inertia — ver [ADR 0001](../adr/0001-api-rest-en-lugar-de-inertia.md)).
- PostgreSQL, base única compartida.
- Multi-tenancy vía `organization_id`: `Organization → Membership → User`.
- Colas: `QUEUE_CONNECTION=database` inicialmente, Redis solo cuando haya necesidad real.
- Organización del código por dominios de negocio (`Domain/`, `Application/`, `Infrastructure/`, `Http/`), no solo por tipo de archivo.

## Frontend (panel)

- React + TypeScript, Vite.
- TanStack Router (file-based) + TanStack Query.
- Tailwind CSS v4 + shadcn/ui.
- Consume la API vía `VITE_API_URL`.

## Infraestructura

- Desarrollo: Laravel Sail, con el panel integrado como servicio adicional en el mismo `compose.yaml`.
- Producción: un Dockerfile propio por app (`apps/api/Dockerfile`, `apps/panel/Dockerfile`), desplegados en Dokploy. Sin Nixpacks.

## Pacientes

Entidades globales, para dejar abierta la posibilidad de funcionalidades más avanzadas a futuro. La historia clínica seguirá modelándose por organización hasta definir mejor los aspectos legales y de permisos.
