# Build context is the repo root (npm workspace) — Dokploy: set this
# Dockerfile's path to apps/landing/Dockerfile with the build context at the
# repo root.
FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Every workspace's manifest, not just this app's: `npm ci` refuses a
# lockfile that lists a workspace whose package.json is absent ("not in
# sync"). The filtered install below still installs only apps/landing.
COPY apps/panel/package.json apps/panel/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY apps/landing/package.json apps/landing/package.json
# The shared workspace packages (packages/*, e.g. @clini/theme) in full,
# not just their manifests: they're CSS-only sources the build imports
# through the node_modules symlink `npm ci` creates.
COPY packages packages
RUN npm ci --workspace=apps/landing --include-workspace-root=false

COPY apps/landing apps/landing

# The panel's public origin: the landing's "Ingresar" / "Empezar gratis"
# links point at its /login and /registro.
ARG VITE_PANEL_URL
ENV VITE_PANEL_URL=${VITE_PANEL_URL}
RUN test -n "$VITE_PANEL_URL" || { \
      echo "ERROR: falta VITE_PANEL_URL. Es un build arg (--build-arg VITE_PANEL_URL=https://panel.ejemplo.com), no una variable de runtime: se hornea en el bundle y definirla al levantar el contenedor no tiene ningún efecto." >&2; \
      exit 1; \
    }
RUN npm run build --workspace=apps/landing

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Nitro bundles the server's dependencies into .output, so the runtime image
# needs no node_modules of its own.
COPY --from=build /app/apps/landing/.output ./.output

USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
