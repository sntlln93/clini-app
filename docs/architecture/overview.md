# Architecture Overview

## Monorepo

Un único repositorio con las apps desplegables como carpetas hermanas:

```
clini-app/
├── apps/
│   ├── api/        # Laravel — API REST, Sail para desarrollo
│   ├── panel/      # React + TS — SPA del panel de clínicas (profesionales y equipo)
│   ├── dashboard/  # React + TS — SPA del dashboard de operación de la plataforma
│   └── landing/    # React + TS — sitio público con SSR (TanStack Start)
├── e2e/            # Playwright (proyectos chromium = panel, dashboard = dashboard, landing = landing)
└── docs/
```

La raíz es un workspace de npm con tres miembros, `apps/panel`, `apps/dashboard` y `apps/landing`, y un único `package-lock.json` (que además cubre las dependencias de Playwright de `e2e/`). No hay herramientas de monorepo JS adicionales; cada frontend se instala filtrado (`npm install|ci --workspace=apps/<app> --include-workspace-root=false`) en su contenedor de dev, en su Dockerfile y en CI.

## Backend

- Laravel, API pura (sin Inertia — ver [ADR 0001](../adr/0001-api-rest-en-lugar-de-inertia.md)).
- PostgreSQL, base única compartida.
- Multi-tenancy vía `organization_id`: `Organization → Membership → User`.
- Colas: `QUEUE_CONNECTION=database` inicialmente, Redis solo cuando haya necesidad real.
- Estructura estándar de Laravel (`app/Http/Controllers`, `app/Http/Requests`, `app/Http/Resources`, `app/Models`), con `app/Actions/` y `app/Services/` para lógica de negocio y adapters de terceros — ver [ADR 0002](../adr/0002-estructura-laravel-estandar.md).

## Frontend (panel)

SPA de las clínicas: profesionales, dueños, administradores y recepción, autenticados con el guard `web` (`auth:sanctum`).


- React + TypeScript, Vite.
- TanStack Router (file-based) + TanStack Query.
- Tailwind CSS v4 + shadcn/ui.
- Consume la API vía `VITE_API_URL`.
- Estructura de carpetas (`routes/`, `components/`, `features/`) — ver [ADR 0003](../adr/0003-estructura-features-react.md).

## Frontend (dashboard)

SPA de los **operadores de la plataforma** (el equipo de Clini, no las clínicas), en `apps/dashboard`: resumen con KPIs y series diarias, organizaciones, usuarios, suscripciones (con el log de webhooks del proveedor), estadísticas de uso y auditoría, más las acciones de moderación (suspender/reactivar una organización, bloquear/desbloquear un usuario, verificar un correo, extender una gracia). Todas quedan auditadas en `admin_audit_logs`.

- Mismo stack, versiones y convenciones que el panel (ADR 0003/0006/0007/0009): loaders + `ensureQueryData`, estado de la request en la URL, `RouteErrorState`, shadcn/ui (`base-nova`) más el `chart` de shadcn (recharts) para los gráficos.
- Consume `/api/v1/admin/*` de la misma API, con su propia identidad: tabla `platform_admins` + guard de sesión `admin` (`auth:admin`), nunca `auth:sanctum`, y rutas restringidas al origen del dashboard (`ADMIN_ALLOWED_ORIGINS`). Ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md).
- Los agregados por día se calculan en la zona horaria de reporte (`ADMIN_REPORTING_TIMEZONE`, por defecto `America/Argentina/Buenos_Aires`); la app corre en UTC.
- Desplegado como una tercera app de Dokploy, `noindex` (meta, `X-Robots-Tag`, `robots.txt`) y `X-Frame-Options: DENY`.

## Frontend (landing)

Sitio público de Clini en `apps/landing`. Cuenta el producto, muestra los planes y enlaza al registro y al login del panel. No habla con la API.

- Mismo stack y convenciones que panel y dashboard, pero **con SSR**: TanStack Start sobre Vite, servido por Nitro como servidor Node. Ver [ADR 0011](../adr/0011-landing-con-ssr-en-tanstack-start.md).
- `VITE_PANEL_URL` (build arg) es el origen del panel. `VITE_CONTACT_URL` (opcional) es el contacto comercial del plan Centro.
- Su texto solo describe funciones que existen en el código desplegado. Los planes son la excepción conocida mientras no existan (#237).

## Infraestructura

- Desarrollo: Laravel Sail para la API; el panel, el dashboard y la landing tienen cada uno su propio servicio Docker. Cada app tiene su `compose.yaml`, unidos por uno en la raíz vía `include` — `docker compose up` desde la raíz levanta todo. Ver [Development Guide](development.md#docker-compose-un-archivo-por-app--uno-en-la-raíz).
- Producción: un Dockerfile propio por app (`apps/api/Dockerfile`, `apps/panel/Dockerfile`, `apps/dashboard/Dockerfile`, `apps/landing/Dockerfile`), desplegados en Dokploy como cuatro aplicaciones. Sin Nixpacks. Ver [Infrastructure](infrastructure.md#despliegue-dokploy).

## Pacientes

Entidades globales, para dejar abierta la posibilidad de funcionalidades más avanzadas a futuro. La historia clínica seguirá modelándose por organización hasta definir mejor los aspectos legales y de permisos.
