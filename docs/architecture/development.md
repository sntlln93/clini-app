# Development Guide

## Requisitos

- Docker

`npm`/`npx` nunca se invocan como proceso bare del host, por ningún motivo — ver la regla en `CLAUDE.md` § Environment & commands. No hace falta Node instalado en el host para nada del flujo normal.

## Docker Compose: un archivo por app + uno en la raíz

Cada app tiene su propio compose file — `apps/api/compose.yaml` (Sail: `laravel.test` + `pgsql`) y `apps/panel/compose.yaml` (`panel`) — y el `compose.yaml` de la raíz los une vía [`include`](https://docs.docker.com/reference/compose-file/include/), como si estuvieran declarados en un solo archivo. Las rutas relativas de cada archivo incluido se resuelven contra su propia carpeta, no contra la raíz. Los tres comparten un único proyecto Compose (`name: clini-app`, fijado explícitamente en `apps/api/compose.yaml` y `apps/panel/compose.yaml`) para que no importe desde dónde se invoque — `sail` (que corre `docker compose` con cwd en `apps/api`) y `docker compose up` desde la raíz terminan operando sobre los mismos contenedores, nunca duplicados.

`WWWUSER`/`WWWGROUP` tienen default `1000` en ambos compose files, así que `docker compose up` anda sin exportar nada primero; `sail` los pisa igual con el UID/GID real del host antes de invocar compose.

## Levantar el entorno

```bash
git config core.hooksPath .githooks   # una vez por clon

# workspace: panel + e2e — vía container descartable, npm nunca corre bare en el host
docker run --rm -v "$PWD:/workspace" -w /workspace --user "$(id -u):$(id -g)" node:24-bookworm-slim npm install

cp apps/api/.env.example apps/api/.env   # si no existe
docker compose up -d                     # desde la raíz del repo
apps/api/vendor/bin/sail artisan migrate
```

El `npm install` de arriba no hace falta para que nada *corra* — `panel` gestiona su propio `node_modules` aislado (ver más abajo) y `e2e` hace lo mismo dentro de su propio container (ver Testing). Existe solo para que el editor/IDE resuelva tipos en el host.

Esto levanta cuatro servicios en la red `sail`:

| Servicio      | URL                     | Descripción                        |
|---------------|-------------------------|-------------------------------------|
| `laravel.test`| http://localhost:8080   | API Laravel                         |
| `panel`       | http://localhost:5174   | SPA React (Vite dev server)         |
| `pgsql`       | localhost:5432          | PostgreSQL                          |
| `mailpit`     | http://localhost:8025   | UI de Mailpit (transporte de correo de dev) |

Detrás del profile `e2e` (no arranca con `docker compose up` normal) hay dos servicios más: `pgsql-e2e` (Postgres efímero, aislado del `pgsql` de dev) y `e2e` (Playwright, imagen `sail-8.5/app` reutilizada — ya trae PHP 8.5 + Node 24 + deps de sistema de Playwright). Se levantan con `docker compose --profile e2e up --abort-on-container-exit e2e`; ver CLAUDE.md § Tests para el detalle de por qué `e2e` levanta sus propios `php artisan serve` + `vite dev` en vez de apuntar a `laravel.test`/`panel`.

El puerto de la API es `8080` (no `80`) para evitar conflictos con otros proyectos Sail corriendo en la misma máquina. Configurable vía `APP_PORT` en `apps/api/.env`.

El servicio `panel` monta la raíz del repo (necesita ver el workspace de npm) y corre `npm install && npm run dev --workspace=apps/panel` al arrancar el contenedor.

## Correo

En dev, todo el correo saliente se envía a **Mailpit** (`axllent/mailpit`, servicio estándar de Laravel Sail): SMTP en el puerto `1025` (host interno `mailpit`, ya configurado en `apps/api/.env.example` vía `MAIL_HOST`/`MAIL_PORT`), y una UI web en <http://localhost:8025> donde se ven los correos capturados sin que salgan nunca a Internet.

En producción, el mailer es **Resend** (`MAIL_MAILER=resend`), el único proveedor soportado. Requiere la variable de entorno `RESEND_API_KEY` (sin valor real en el repo — se provisiona en el ambiente productivo cuando exista).

## Comandos habituales

```bash
apps/api/vendor/bin/sail artisan ...   # comandos artisan, desde la raíz
apps/api/vendor/bin/sail composer ...  # composer dentro del contenedor
docker compose down                    # apagar el stack completo (desde la raíz)
docker compose up panel                # levantar/reiniciar solo el frontend
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

## Build de producción (verificación local)

```bash
docker build -f apps/api/Dockerfile -t clini-api apps/api

# build context es la raíz del repo (npm workspace) — ver ADR y apps/panel/Dockerfile
docker build -f apps/panel/Dockerfile -t clini-panel \
  --build-arg VITE_API_URL=https://api.tu-dominio.com .
```

Estas son las mismas imágenes que Dokploy construye en despliegue (mismo Dockerfile, mismo build context).
