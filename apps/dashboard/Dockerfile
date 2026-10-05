# Build context is the repo root (npm workspace) — Dokploy: set this
# Dockerfile's path to apps/dashboard/Dockerfile with the build context at the
# repo root.
FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Every workspace's manifest, not just this app's: `npm ci` refuses a
# lockfile that lists a workspace whose package.json is absent ("not in
# sync"). The filtered install below still installs only apps/dashboard.
COPY apps/panel/package.json apps/panel/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/landing/package.json apps/landing/package.json
# The shared workspace packages (packages/*, e.g. @clini/theme) in full,
# not just their manifests: they're CSS-only sources the build imports
# through the node_modules symlink `npm ci` creates.
COPY packages packages
RUN npm ci --workspace=apps/dashboard --include-workspace-root=false

COPY apps/dashboard apps/dashboard

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN test -n "$VITE_API_URL" || { \
      echo "ERROR: falta VITE_API_URL. Es un build arg (--build-arg VITE_API_URL=https://api.ejemplo.com), no una variable de runtime: se hornea en el bundle y definirla al levantar el contenedor no tiene ningún efecto." >&2; \
      exit 1; \
    }
RUN npm run build --workspace=apps/dashboard

FROM nginx:1.27-alpine AS runtime
COPY apps/dashboard/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
