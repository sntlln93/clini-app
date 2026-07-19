# Plan: adaptar el tooling copiado de Fototobares a Clini

Contexto: `.github/`, `.githooks/`, `.claude/` y `CLAUDE.md` fueron copiados de Fototobares
(otro proyecto tuyo — Laravel+Inertia monolito en la raíz del repo, MySQL, dominio de
fotografía escolar). Clini es un monorepo con dos apps separadas (`apps/api` Laravel API
pura, `apps/panel` React SPA) y Postgres. Hay que adaptar estructura, DB engine y limpiar
referencias de dominio, además de instalar herramientas que el tooling copiado asume pero
que todavía no existen acá.

Decisiones ya tomadas (confirmadas con vos):
- Paridad completa: instalar todo lo que falta en vez de recortar pasos de CI.
- Sin atribución a Claude en commits: instalar `.githooks/commit-msg`
  (`git config core.hooksPath .githooks`), y el CLAUDE.md nuevo documenta la regla.

## Pasos

1. ~~**CLAUDE.md**~~ — DONE. Reescrito con la info de `about-this-project.md`: proyecto,
   stack (Laravel API pura per ADR 0001, no Inertia), monorepo, capas
   `Domain/Application/Infrastructure/Http`, estructura de `apps/panel`. Se sacó la regla
   de "generar PDFs client-side" (específica de Fototobares, sin base en Clini). Se
   confirmó con vos: migraciones automáticas en todo entorno, seed solo en dev/test, prod
   nunca siembra (ya coincide con `apps/api/docker/entrypoint.sh`). Agregado
   `.claude/docs|transcripts|handoffs|session-report` al `.gitignore` para que la sección
   "Session docs" del CLAUDE.md sea cierta.

2. ~~**Tooling backend**~~ — DONE. `larastan/larastan`, `driftingly/rector-laravel` (no
   `rector/rector-laravel`, que está abandonado — confirmado contra `../fototobares`),
   `pestphp/pest` + `pest-plugin-laravel`. `phpstan.neon` (level 9), `rector.php`,
   `pint.json` (`declare_strict_types`), `tests/Pest.php`, tests de ejemplo convertidos a
   sintaxis Pest. `composer.json` con scripts `analyse`/`pint`. Verificado: pint (fixeó
   strict_types en todo el código existente), phpstan, pest (2/2) y rector --dry-run
   (0 cambios) corren limpios contra el stack de Sail.

3. ~~**Tooling frontend**~~ — DONE. oxlint afuera, ESLint 9 (pin porque
   `eslint-plugin-react` todavía no soporta ESLint 10) + Prettier + Vitest + Testing
   Library, calcado de `../fototobares` con paths a `src/` y la convención de `routes/`
   en vez de `pages/` (import-boundary rules, tailwind-canonical cssPath). `src/tests/setup.ts`
   con los mismos polyfills de jsdom (ResizeObserver, scrollIntoView, matchMedia) para
   shadcn/Radix. `vitest.config.ts` con `passWithNoTests: true` — no hay componentes
   todavía, sacarlo cuando exista el primer test. Verificado: format, lint, lint:check,
   typecheck, test y build corren limpios.

4. **Playwright e2e** — crear `e2e/` con `playwright.config.ts` apuntando a los dos
   servidores (api :8080 + panel :5174, no un solo server Inertia :8000 como en
   Fototobares), `e2e/helpers.ts` mínimo, sin los gotchas de UI de Fototobares (login page,
   cmdk, etc. — eso se escribe cuando exista UI real).

5. **`.github/actions/setup-php` y `setup-node`** — cache keys y working-directory
   apuntando a `apps/api/composer.lock` y `apps/panel/package-lock.json` en vez de la raíz.

6. **`.github/workflows/tests.yml` y `code-quality.yml`** — `working-directory: apps/api`
   / `apps/panel` por job, Postgres en vez de MySQL (matchear `apps/api/.env.example`),
   `e2e` levanta ambos servers (Laravel `serve` + `vite preview`/`dev`) en vez de uno solo.
   Mantener el check de "sin atribución de agente en los commits" tal cual.

7. **`.claude/settings.json`** — permissions con `apps/api/vendor/bin/sail ...` en vez de
   `./vendor/bin/sail ...`, y comandos de panel corriendo directo (no a través de Sail,
   porque el panel no vive dentro del contenedor PHP).

8. **`run-forensics.sh`** — reescribir la detección de "backend/frontend tocado" para los
   paths nuevos (`apps/api/**`, `apps/panel/**`), correr backend por Sail y frontend con
   node directo (docker run, como venimos haciendo en esta sesión) en vez de `sail npm`.

9. **Hook + limpieza de docs de agentes/skills**:
   - `git config core.hooksPath .githooks`
   - Barrer `.claude/agents/*.md` y `.claude/skills/*/SKILL.md` por referencias a
     Fototobares: layer chain de Inertia (`coroner.md`), stock/producción (`coroner.md`),
     `resources/js` paths y `setup.ts` (`stenographer.md`), `PageSmokeTest`/`ArchTest.php`
     (`pass-sentence.md`), ruta literal `-Volumes-eSSD-src-fototobares` (`collect-evidence`),
     gotchas de UI específicos de Fototobares (`verify` skill). `serve-warrant` y
     `canvass-the-scene` ya se revisaron y no tienen referencias de dominio — quedan como
     están.

## Estado

Sail (`apps/api`) sigue arriba desde la sesión (pgsql + laravel.test + panel), así que los
pasos 2-3 pueden correr contra ese stack sin levantarlo de nuevo.

Vamos paso por paso — decime por cuál arrancamos o si querés que siga el orden de arriba.
