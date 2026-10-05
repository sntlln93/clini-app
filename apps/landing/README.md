# Clini Landing (`apps/landing`)

Sitio público de Clini: cuenta el producto a partir de un día de un
consultorio, muestra los planes y lleva al registro y al login del panel. No
habla con la API.

Mismo stack y convenciones que `apps/panel` y `apps/dashboard` (React 19 +
TanStack Router, Tailwind 4 + shadcn/ui, Vite 8). Ver `CLAUDE.md` → "Frontend
structure".

- Desarrollo: `docker compose up -d landing` desde la raíz → <http://localhost:5176>
- Comandos (siempre por el contenedor, nunca `npm` en el host):
  `docker compose exec --workdir /workspace/apps/landing landing npm run <script>`
  (`test`, `typecheck`, `lint:check`, `format:check`, `lint`, `format`)
- Build de producción: `apps/landing/Dockerfile` con la raíz del repo como
  contexto y el build arg `VITE_PANEL_URL` (origen público del panel).

**Regla de contenido**: todo texto que describa una función tiene que
corresponder al código desplegado. No se anuncian funciones futuras. La
sección de planes es la excepción conocida: los planes todavía no existen en
el código (#237 y siguientes).
