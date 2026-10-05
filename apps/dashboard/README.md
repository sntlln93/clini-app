# Clini Plataforma (`apps/dashboard`)

Panel interno para los operadores de Clini: métricas de la plataforma,
organizaciones, usuarios, suscripciones, estadísticas y auditoría. No es para
clientes: usa una identidad propia (`platform_admins`, guard `admin`), separada
de los usuarios del panel clínico (ver ADR 0010).

Mismo stack y convenciones que `apps/panel` (React 19 + TanStack Router/Query,
Tailwind 4 + shadcn/ui, Vite 8). Ver `CLAUDE.md` → "Frontend structure".

- Desarrollo: `docker compose up -d dashboard` desde la raíz → <http://localhost:5175>
- Comandos (siempre por el contenedor, nunca `npm` en el host):
  `docker compose exec --workdir /workspace/apps/dashboard dashboard npm run <script>`
  (`test`, `typecheck`, `lint:check`, `format:check`, `lint`, `format`)
- Operador sembrado (solo fuera de producción): `operador@test.com` / `password`
- Build de producción: `apps/dashboard/Dockerfile` con la raíz del repo como
  contexto y el build arg `VITE_API_URL` (ver `docs/architecture/infrastructure.md`).
