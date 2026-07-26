# Development Guide

## Requisitos

- Docker
- Node (solo para tooling puntual fuera de Sail; el flujo normal corre todo en contenedores)

## Docker Compose: un archivo por app + uno en la raíz

Cada app tiene su propio compose file — `apps/api/compose.yaml` (Sail: `laravel.test` + `pgsql`) y `apps/panel/compose.yaml` (`panel`) — y el `compose.yaml` de la raíz los une vía [`include`](https://docs.docker.com/reference/compose-file/include/), como si estuvieran declarados en un solo archivo. Las rutas relativas de cada archivo incluido se resuelven contra su propia carpeta, no contra la raíz. Los tres comparten un único proyecto Compose (`name: clini-app`, fijado explícitamente en `apps/api/compose.yaml` y `apps/panel/compose.yaml`) para que no importe desde dónde se invoque — `sail` (que corre `docker compose` con cwd en `apps/api`) y `docker compose up` desde la raíz terminan operando sobre los mismos contenedores, nunca duplicados.

`WWWUSER`/`WWWGROUP` tienen default `1000` en ambos compose files, así que `docker compose up` anda sin exportar nada primero; `sail` los pisa igual con el UID/GID real del host antes de invocar compose.

## Levantar el entorno

```bash
git config core.hooksPath .githooks   # una vez por clon
npm install                            # workspace: panel + e2e

cp apps/api/.env.example apps/api/.env   # si no existe
docker compose up -d                     # desde la raíz del repo
apps/api/vendor/bin/sail artisan migrate
```

Esto levanta cuatro servicios en la red `sail`:

| Servicio      | URL                     | Descripción                        |
|---------------|-------------------------|-------------------------------------|
| `laravel.test`| http://localhost:8080   | API Laravel                         |
| `panel`       | http://localhost:5174   | SPA React (Vite dev server)         |
| `pgsql`       | localhost:5432          | PostgreSQL                          |
| `mailpit`     | http://localhost:8025   | UI de Mailpit (transporte de correo de dev) |

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

Para trabajar en el panel sin Sail (más rápido para iterar en UI pura), también se puede correr localmente con Node 24 LTS, después de instalar el workspace desde la raíz:

```bash
npm install                         # desde la raíz, una vez
npm run dev --workspace=apps/panel  # o: cd apps/panel && npm run dev
```

## Build de producción (verificación local)

```bash
docker build -f apps/api/Dockerfile -t clini-api apps/api

# build context es la raíz del repo (npm workspace) — ver ADR y apps/panel/Dockerfile
docker build -f apps/panel/Dockerfile -t clini-panel \
  --build-arg VITE_API_URL=https://api.tu-dominio.com .
```

Estas son las mismas imágenes que Dokploy construye en despliegue (mismo Dockerfile, mismo build context).
