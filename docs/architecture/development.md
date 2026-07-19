# Development Guide

## Requisitos

- Docker
- Node (solo para tooling puntual fuera de Sail; el flujo normal corre todo en contenedores)

## Levantar el entorno

```bash
cd apps/api
cp .env.example .env   # si no existe
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate
```

Esto levanta tres servicios en la red `sail`:

| Servicio      | URL                     | Descripción                        |
|---------------|-------------------------|-------------------------------------|
| `laravel.test`| http://localhost:8080   | API Laravel                         |
| `panel`       | http://localhost:5174   | SPA React (Vite dev server)         |
| `pgsql`       | localhost:5432          | PostgreSQL                          |

El puerto de la API es `8080` (no `80`) para evitar conflictos con otros proyectos Sail corriendo en la misma máquina. Configurable vía `APP_PORT` en `apps/api/.env`.

El servicio `panel` monta `apps/panel` completo y corre `npm install && npm run dev` al arrancar el contenedor.

## Comandos habituales

```bash
./vendor/bin/sail artisan ...     # comandos artisan
./vendor/bin/sail composer ...    # composer dentro del contenedor
./vendor/bin/sail down            # apagar el stack
```

Para trabajar en el panel sin Sail (más rápido para iterar en UI pura), también se puede correr localmente con Node 24 LTS:

```bash
cd apps/panel
npm install
npm run dev -- --port 5174
```

## Build de producción (verificación local)

```bash
docker build -t clini-api apps/api
docker build -t clini-panel --build-arg VITE_API_URL=https://api.tu-dominio.com apps/panel
```

Estas son las mismas imágenes que Dokploy construye en despliegue.
