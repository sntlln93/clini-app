# Build context is the repo root (npm workspace) — Dokploy: set this
# Dockerfile's path to apps/panel/Dockerfile with the build context at the
# repo root.
FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Every workspace's manifest, not just this app's: `npm ci` refuses a
# lockfile that lists a workspace whose package.json is absent ("not in
# sync"). The filtered install below still installs only apps/panel.
COPY apps/panel/package.json apps/panel/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/landing/package.json apps/landing/package.json
# The shared workspace packages (packages/*: @clini/theme, @clini/brand)
# in full, not just their manifests: they're sources (tokens, brand files
# and their Vite plugin) the build imports through the node_modules symlink
# `npm ci` creates.
COPY packages packages
RUN npm ci --workspace=apps/panel --include-workspace-root=false

COPY apps/panel apps/panel

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN test -n "$VITE_API_URL" || { \
      echo "ERROR: falta VITE_API_URL. Es un build arg (--build-arg VITE_API_URL=https://api.ejemplo.com), no una variable de runtime: se hornea en el bundle y definirla al levantar el contenedor no tiene ningún efecto." >&2; \
      exit 1; \
    }
# Optional: without it, «Hecho con Clini» on the booking page renders as text.
ARG VITE_LANDING_URL
ENV VITE_LANDING_URL=${VITE_LANDING_URL}
# Optional: `true` makes the error pages show the exact error (#304). Leave it
# unset in production, which never shows it then.
ARG VITE_APP_DEBUG
ENV VITE_APP_DEBUG=${VITE_APP_DEBUG}
RUN npm run build --workspace=apps/panel

FROM nginx:1.30.6-alpine AS runtime
COPY apps/panel/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/panel/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
