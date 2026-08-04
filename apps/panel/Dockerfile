# Build context is the repo root (npm workspace) — Dokploy: set this
# Dockerfile's path to apps/panel/Dockerfile with the build context at the
# repo root.
FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/panel/package.json apps/panel/package.json
RUN npm ci --workspace=apps/panel --include-workspace-root=false

COPY apps/panel apps/panel

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN test -n "$VITE_API_URL" || { \
      echo "ERROR: falta VITE_API_URL. Es un build arg (--build-arg VITE_API_URL=https://api.ejemplo.com), no una variable de runtime: se hornea en el bundle y definirla al levantar el contenedor no tiene ningún efecto." >&2; \
      exit 1; \
    }
RUN npm run build --workspace=apps/panel

FROM nginx:1.27-alpine AS runtime
COPY apps/panel/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/panel/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
