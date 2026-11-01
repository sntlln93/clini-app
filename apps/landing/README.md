# Clini Landing (`apps/landing`)

Sitio público de Clini: cuenta el producto a partir de un día de un
consultorio, muestra los planes y lleva al registro y al login del panel. Su
única llamada a la API es el formulario de contacto (ADR 0011).

Mismo stack y convenciones que `apps/panel` y `apps/dashboard` (React 19 +
TanStack Router, Tailwind 4 + shadcn/ui, Vite 8). Ver `CLAUDE.md` → "Frontend
structure".

- Desarrollo: `docker compose up -d landing` desde la raíz → <http://localhost:5176>
- Comandos (siempre por el contenedor, nunca `npm` en el host):
  `docker compose exec --workdir /workspace/apps/landing landing npm run <script>`
  (`test`, `typecheck`, `lint:check`, `format:check`, `lint`, `format`)
- Build de producción: `apps/landing/Dockerfile` con la raíz del repo como
  contexto y los build args `VITE_PANEL_URL` (origen público del panel),
  `VITE_API_URL` (la API) y, opcional, `VITE_SITE_URL` (origen público de la
  landing: canonical, `og:url`, `og:image`, `/sitemap.xml` y la línea
  `Sitemap:` de `/robots.txt`, que se omiten sin él).

**Regla de contenido**: todo texto que describa una función tiene que
corresponder al código desplegado. No se anuncian funciones futuras. Las
excepciones conocidas son las funciones de planes que todavía tienen su propio
issue (ver `CLAUDE.md` → "Content rule").
