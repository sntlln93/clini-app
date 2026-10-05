# Development Guide

## Requisitos

- Docker

`npm`/`npx` nunca se invocan como proceso bare del host, por ningún motivo — ver la regla en `CLAUDE.md` § Environment & commands. No hace falta Node instalado en el host para nada del flujo normal.

## Docker Compose: un archivo por app + uno en la raíz

Cada app tiene su propio compose file — `apps/api/compose.yaml` (Sail: `laravel.test` + `pgsql`), `apps/panel/compose.yaml` (`panel`), `apps/dashboard/compose.yaml` (`dashboard`) y `apps/landing/compose.yaml` (`landing`) — y el `compose.yaml` de la raíz los une vía [`include`](https://docs.docker.com/reference/compose-file/include/), como si estuvieran declarados en un solo archivo. Las rutas relativas de cada archivo incluido se resuelven contra su propia carpeta, no contra la raíz. Todos comparten un único proyecto Compose (`name: clini-app`, fijado explícitamente en `apps/api/compose.yaml`, `apps/panel/compose.yaml`, `apps/dashboard/compose.yaml` y `apps/landing/compose.yaml`) para que no importe desde dónde se invoque — `sail` (que corre `docker compose` con cwd en `apps/api`) y `docker compose up` desde la raíz terminan operando sobre los mismos contenedores, nunca duplicados.

`WWWUSER`/`WWWGROUP` tienen default `1000` en los compose files de los frontends, así que `docker compose up` anda sin exportar nada primero; `sail` los pisa igual con el UID/GID real del host antes de invocar compose.

## Levantar el entorno

```bash
git config core.hooksPath .githooks   # una vez por clon

# workspace: panel + dashboard + landing + e2e — vía container descartable, npm nunca corre bare en el host
docker run --rm -v "$PWD:/workspace" -w /workspace --user "$(id -u):$(id -g)" node:24-bookworm-slim npm install

cp apps/api/.env.example apps/api/.env   # si no existe
docker compose up -d                     # desde la raíz del repo
apps/api/vendor/bin/sail artisan migrate
```

El `npm install` de arriba no hace falta para que nada *corra* — `panel`, `dashboard` y `landing` gestionan cada uno su propio `node_modules` aislado (ver más abajo) y `e2e` hace lo mismo dentro de su propio container (ver Testing). Existe solo para que el editor/IDE resuelva tipos en el host.

Esto levanta seis servicios en la red `sail`:

| Servicio      | URL                     | Descripción                        |
|---------------|-------------------------|-------------------------------------|
| `laravel.test`| http://localhost:8080   | API Laravel                         |
| `panel`       | http://localhost:5174   | SPA React del panel de clínicas (Vite dev server) |
| `dashboard`   | http://localhost:5175   | SPA React del dashboard de operación de la plataforma (Vite dev server) |
| `landing`     | http://localhost:5176   | Sitio público con SSR (TanStack Start, Vite dev server) |
| `pgsql`       | localhost:55432         | PostgreSQL                          |
| `mailpit`     | http://localhost:8025   | UI de Mailpit (transporte de correo de dev) |

Detrás del profile `e2e` (no arranca con `docker compose up` normal) hay dos servicios más: `pgsql-e2e` (Postgres efímero, aislado del `pgsql` de dev) y `e2e` (Playwright, imagen `sail-8.5/app` reutilizada — ya trae PHP 8.5 + Node 24 + deps de sistema de Playwright). Se levantan con `docker compose --profile e2e up --abort-on-container-exit e2e`; ver CLAUDE.md § Tests para el detalle de por qué `e2e` levanta sus propios `php artisan serve` + `vite dev` en vez de apuntar a `laravel.test`/`panel`.

El puerto de la API es `8080` (no `80`) para evitar conflictos con otros proyectos Sail corriendo en la misma máquina. Configurable vía `APP_PORT` en `apps/api/.env`. Por el mismo motivo, `pgsql` expone `55432` en el host (no el `5432` estándar) — cualquier otro proyecto Postgres/Sail local que sí use `5432` (Sail lo trae como default) puede pisar el puerto y hacer fallar el contenedor. `DB_PORT` (dentro de `apps/api/.env`) sigue siendo `5432`: es el puerto interno en la red `sail`, no se toca. Configurable vía `FORWARD_DB_PORT`.

Los servicios `panel`, `dashboard` y `landing` montan solo su propia app más los dos manifiestos de la raíz (`package.json`, `package-lock.json`) y, en solo lectura, el `package.json` de cada app hermana: con los tres workspaces declarados en la raíz, una carpeta de workspace ausente hace que npm considere el lockfile desincronizado y reescriba el `package-lock.json` montado sin las entradas de la otra app. Cada uno corre `npm install --workspace=apps/<app> --include-workspace-root=false && npm run dev --workspace=apps/<app>` al arrancar, sobre su propio volumen nombrado de `node_modules` (`panel_node_modules`, `dashboard_node_modules`, `landing_node_modules`). Todos montan el mismo `package-lock.json`: con el lockfile sincronizado `npm install` no lo reescribe, así que arrancarlos juntos es seguro — después de cambiar dependencias, regenerar el lockfile primero (el `npm install` en container descartable de arriba) y recién ahí `docker compose up`.

### Dashboard de operación (`apps/dashboard`)

SPA separada para los operadores de la plataforma (no para las clínicas): resumen con KPIs, organizaciones, usuarios, suscripciones, estadísticas y auditoría, con acciones de moderación (suspender/reactivar una organización, bloquear/desbloquear un usuario, verificar un correo a mano, extender un período de gracia). Usa la misma API bajo `/api/v1/admin/*`, con una identidad propia (`platform_admins` + guard de sesión `admin`) — ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md).

Para que la API acepte al dashboard en dev, `apps/api/.env` necesita su origen (ya está en `.env.example`; un `.env` copiado antes de este cambio hay que actualizarlo a mano y reiniciar `laravel.test`):

```dotenv
FRONTEND_URL=http://localhost:5174,http://localhost:5175   # el panel siempre primero
SANCTUM_STATEFUL_DOMAINS=localhost:5174,localhost:5175
ADMIN_ALLOWED_ORIGINS=http://localhost:5175
ADMIN_REPORTING_TIMEZONE=America/Argentina/Buenos_Aires
```

`FRONTEND_URL` se lee como lista y su **primer** elemento es la URL del panel que usan los links de los mails (invitaciones, verificación, retorno de la suscripción) — por eso el panel va primero. `ADMIN_ALLOWED_ORIGINS` es la lista de orígenes desde los que se aceptan las rutas `/api/v1/admin/*` (falla cerrada: sin la variable, solo `http://localhost:5175`). Sin estas líneas el dashboard queda bloqueado por CORS.

`artisan serve` (lo que corre `laravel.test`) **ignora** las variables exportadas al contenedor que también estén definidas en `apps/api/.env`: re-lee el archivo en el proceso hijo. Cambiar estos valores es siempre editando `apps/api/.env`, no con `environment:` en compose.

## Correo

En dev, todo el correo saliente se envía a **Mailpit** (`axllent/mailpit`, servicio estándar de Laravel Sail): SMTP en el puerto `1025` (host interno `mailpit`, ya configurado en `apps/api/.env.example` vía `MAIL_HOST`/`MAIL_PORT`), y una UI web en <http://localhost:8025> donde se ven los correos capturados sin que salgan nunca a Internet.

En producción, el mailer es **Resend** (`MAIL_MAILER=resend`), el único proveedor soportado. Requiere la variable de entorno `RESEND_API_KEY` (sin valor real en el repo — se provisiona en el ambiente productivo cuando exista).

## Comandos habituales

```bash
apps/api/vendor/bin/sail artisan ...   # comandos artisan, desde la raíz
apps/api/vendor/bin/sail composer ...  # composer dentro del contenedor
docker compose down                    # apagar el stack completo (desde la raíz)
docker compose up panel                # levantar/reiniciar solo el panel
docker compose up dashboard            # levantar/reiniciar solo el dashboard de operación
docker compose up landing              # levantar/reiniciar solo la landing (SSR)
apps/api/vendor/bin/sail artisan admin:create   # crear un operador del dashboard (pregunta nombre, correo y contraseña)
```

### Gotcha: `sail up`/`sail down` sí les importa el cwd

`sail artisan ...`/`sail composer ...`/`sail php ...` son seguros invocados desde
cualquier lado porque hacen `exec` sobre un contenedor que ya existe — no
necesitan recrearlo. `sail up`/`sail down`/`sail restart` no: ejecutan
`docker compose` sin `-f`, así que Compose busca el `compose.yaml` según el
**directorio desde el que se invoca**, no según dónde vive el script. Invocado
bare desde la raíz (`apps/api/vendor/bin/sail up -d`), termina agarrando el
`compose.yaml` de la raíz (los tres servicios) — pero además, como el propio
script de Sail exporta sus defaults (`APP_PORT`, `WWWUSER`, `DB_PORT`, ...)
*antes* de invocar Compose, y esos defaults se calculan porque no encontró
`apps/api/.env` (buscó `./.env` con cwd en la raíz), esos valores por defecto
pisan los reales — se comprobó en la práctica: la API pasó de `8080→80` a
`80→80`. Siempre `cd apps/api && ./vendor/bin/sail up -d`; para bajar todo,
mejor `docker compose down` desde la raíz en lugar de `sail down`.

## Datos de prueba (seeders)

`database/seeders/DatabaseSeeder.php` es el único punto de entrada — no hay comandos artisan alternativos ni perfiles/subconjuntos. Es literal y determinístico (sin factories, sin faker, `Model::create`/`firstOrCreate` únicamente), así que corre también sobre la imagen de producción (`composer install --no-dev`) y es re-ejecutable: un `php artisan db:seed` repetido no duplica filas.

Crea dos organizaciones fijas — `Clínica Modelo` (slug `clinica-modelo`, con dirección en CABA) y `Consultorio Dos` (slug `consultorio-dos`, con dirección en Córdoba; la dirección es lo que resuelve la provincia para los feriados) — con estos usuarios. **Contraseña única para todos: `password`** (sin override por variable de entorno).

| Email                          | Organización     | Rol(es)         | Estado      |
|---------------------------------|------------------|------------------|-------------|
| `ana.duena@test.com`            | Clínica Modelo   | Owner            | Active      |
| `bruno.admin@test.com`          | Clínica Modelo   | Admin            | Active      |
| `carla.profesional@test.com`    | Clínica Modelo   | Professional     | Active      |
| `carla.profesional@test.com`    | Consultorio Dos  | Professional     | Active      |
| `diego.profesional@test.com`    | Clínica Modelo   | Professional     | Inactive    |
| `elena.staff@test.com`          | Clínica Modelo   | Staff            | Active      |
| `fabian.duenostaff@test.com`    | Clínica Modelo   | Owner + Staff    | Active      |
| `gabriela.duena@test.com`       | Consultorio Dos  | Owner            | Active      |
| `hernan.admin@test.com`         | Consultorio Dos  | Admin            | Suspended   |
| `julian.staff@test.com`         | Consultorio Dos  | Staff            | Active      |

Además, fuera de producción, `PlatformAdminSeeder` crea un **operador** del dashboard de operación (tabla `platform_admins`, identidad separada de `users` — ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md)):

| Email                | Nombre            | App        | Contraseña |
|----------------------|-------------------|------------|------------|
| `operador@test.com`  | Olivia Operadora  | dashboard (<http://localhost:5175>) solamente | `password` |

Ese operador no puede entrar al panel y ningún usuario de la tabla de arriba puede entrar al dashboard. `PlatformAdminSeeder` es un no-op cuando `app()->isProduction()` — incluido el server de testing/demo, que corre la imagen de producción con `RUN_SEEDERS=true`: un dashboard público con `operador@test.com / password` sería una puerta abierta. Ahí los operadores se crean con `php artisan admin:create` (dentro del contenedor de la API en Dokploy; acepta `--name`, `--email` y `--password`, pero la contraseña conviene dejarla para el prompt; mínimo 12 caracteres, el correo se guarda en minúsculas).

`carla.profesional@test.com` aparece dos veces a propósito: es el único usuario con membresía en ambas organizaciones. Cada organización también queda con pacientes (uno compartido entre ambas vía el pivot `organization_patient`, sin duplicar la fila de `patients`), especialidades/servicios asignados a las membresías profesionales, y disponibilidad/excepciones/turnos/recordatorios con fechas relativas a `now()` (pasado, hoy y futuro). Además, `clinica-modelo` suma un bloque de volumen literal y determinístico — 20 pacientes más (23 en total) y 14 usuarios más con membresía `Staff` (20 membresías en total) — para que los listados paginados (`GET /api/v1/patients`, `GET /api/v1/memberships`) siempre tengan una segunda página; `consultorio-dos` no lleva volumen y se queda con 3 pacientes y 4 membresías.

Sembrar un ambiente ya desplegado puede ser manual o automático, según la variable `RUN_SEEDERS`. `apps/api/docker/entrypoint.sh` corre `php artisan migrate --force` en cada arranque de contenedor y, si `RUN_SEEDERS=true`, también `php artisan db:seed --force` a continuación; el default es `false`, así que sin la variable definida el arranque se comporta exactamente igual que siempre (sólo migra). `RUN_SEEDERS` se activa desde la pestaña **Environment** de Dokploy —es una variable de runtime del contenedor, no un build-time argument— y está pensada para el server de testing/demo: **en producción real no se setea**. Que sea seguro correrla en cada arranque se apoya en la idempotencia de los seeders ya documentada arriba.

Para sembrar a mano (útil en un ambiente de testing/demo, nunca en producción real con datos de pacientes):

```bash
apps/api/vendor/bin/sail artisan db:seed --force
```

`--force` es necesario porque `db:seed` pide confirmación interactiva fuera de `local`/`testing`.

### Una sola vez tras desplegar el dashboard de operación: `migrate:fresh --seed`

El cambio que introdujo el dashboard agregó columnas (`organizations.suspended_at`/`suspension_reason`, `users.blocked_at`/`block_reason`) editando las migraciones de creación en el lugar, en vez de sumar una migración nueva (no hay tráfico productivo real todavía — ver `CLAUDE.md`). Un `migrate` sobre una base ya migrada no las agrega, y `ResolveCurrentOrganization` lee `suspended_at` en cada request con organización: sin ellas, la API responde 500. Por eso, **una vez**, después de desplegar ese cambio en un ambiente de testing/demo ya existente (y en el `pgsql` de dev de cada uno):

```bash
php artisan migrate:fresh --seed --force                    # dentro del contenedor de la API en Dokploy
apps/api/vendor/bin/sail artisan migrate:fresh --seed       # en dev, desde la raíz del repo
```

Borra todos los datos del ambiente. Nunca en una base con datos reales.

## Build de producción (verificación local)

```bash
docker build -f apps/api/Dockerfile -t clini-api apps/api

# build context es la raíz del repo (npm workspace) — ver ADR y apps/panel/Dockerfile
docker build -f apps/panel/Dockerfile -t clini-panel \
  --build-arg VITE_API_URL=https://api.tu-dominio.com .

# mismo esquema para el dashboard de operación
docker build -f apps/dashboard/Dockerfile -t clini-dashboard \
  --build-arg VITE_API_URL=https://api.tu-dominio.com .

# landing (SSR, servidor Node en el puerto 3000)
docker build -f apps/landing/Dockerfile -t clini-landing \
  --build-arg VITE_PANEL_URL=https://panel.tu-dominio.com .
docker run --rm -p 3000:3000 clini-landing
```

Los tres Dockerfiles de frontend copian **todos** los manifiestos de workspace (`apps/panel/package.json`, `apps/dashboard/package.json` y `apps/landing/package.json`) antes del `npm ci --workspace=apps/<app> --include-workspace-root=false`: `npm ci` rechaza un lockfile que lista un workspace cuyo `package.json` no está. Por lo mismo, cada `Dockerfile.dockerignore` excluye las apps hermanas salvo su `package.json`.

Estas son las mismas imágenes que Dokploy construye en despliegue (mismo Dockerfile, mismo build context).
