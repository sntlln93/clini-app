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

4. ~~**Playwright e2e**~~ — DONE. `playwright.config.ts` en la raíz (nuevo `package.json`
   raíz solo para esto), `webServer` array con api (`php artisan serve`, CI-only) + panel
   (`npm run dev`, CI-only) — local usa el stack de Sail ya levantado. `e2e/smoke.spec.ts`
   con dos specs reales: GET `/api/ping` directo, y el panel mostrando "conectado a api".
   Sin `helpers.ts`/`global.setup.ts` todavía — no hay auth ni dominio que justifique esa
   abstracción. Verificado contra el stack en vivo vía `mcr.microsoft.com/playwright`: el
   spec de API pasa; el del panel falla solo por un artefacto de correr el browser en un
   contenedor aislado (`VITE_API_URL=http://localhost:8080` resuelve dentro de ESE
   contenedor, no contra el host) — no aplica en CI real ni en un browser de verdad.

5. ~~**`.github/actions/setup-php` y `setup-node`**~~ — DONE. `setup-php` hardcodeado a
   `apps/api` (único consumidor). `setup-node` con input `working-directory` (default
   `apps/panel`) porque `e2e` necesita instalarlo dos veces (panel + raíz para Playwright).

6. ~~**`.github/workflows/tests.yml` y `code-quality.yml`**~~ — DONE. `working-directory`
   por step apuntando a `apps/api`/`apps/panel`, servicio Postgres 18 (DB `testing`) en vez
   de MySQL. `e2e` no arma servers a mano — el `webServer` array de `playwright.config.ts`
   ya levanta `php artisan serve` + `vite dev` solo. El step "Arch tests" está de vuelta:
   se agregó `tests/Arch/ArchTest.php` (adaptado de `../fototobares` — se sacaron las
   reglas atadas a su patrón específico de `App\Actions`/`App\Data`/`ActionContract` que
   Clini no adoptó, y las de `App\Domain`/`App\Application` quedan pasando en vacío hasta
   que exista código ahí). `phpunit.xml` con testsuite `Arch`. 14/14 tests verificados
   (Arch+Unit+Feature) vía Sail. Check de atribución de agente intacto. Verificado solo
   con YAML lint
   (`python -c yaml.safe_load`, vía contenedor) — no hay manera de correr Actions
   localmente sin `act` (no instalado) o un push real a GitHub.

7. **`.claude/settings.json`** — permissions con `apps/api/vendor/bin/sail ...` en vez de
   `./vendor/bin/sail ...`, y comandos de panel corriendo directo (no a través de Sail,
   porque el panel no vive dentro del contenedor PHP).

8. ~~**`run-forensics.sh`**~~ — DONE. Detección de paths nueva (`apps/api/**`,
   `apps/panel/src/**`, `e2e/`+`playwright.config.ts`+`package.json` para e2e). Backend por
   `sail()` (subshell `cd apps/api` — Sail resuelve `compose.yaml` relativo al cwd del
   caller, no a su propia ubicación). Frontend por `panel()` (`docker compose exec` directo
   al servicio `panel`, con `--workdir /workspace/apps/panel` — Sail no puede targetear
   servicios que no sean `laravel.test`). e2e por `e2e_node()` (contenedor descartable, no
   host node). Verificado `--full` end-to-end: pint/phpstan/pest + prettier/eslint/tsc/vitest
   + tsc(e2e), todo OK.

9. ~~**npm workspaces**~~ — DONE (surgió a mitad del paso 8, no estaba en el plan original).
   Root `package.json` con `workspaces: ["apps/panel"]`, un solo `package-lock.json`. TS
   alineado a `~6.0.2` en ambos — se probó `^7.0.2` (última estable) primero pero
   `typescript-eslint@8.64.0` tiene un peer dep duro `<6.1.0`, rompe con TS7 real (no era
   un artefacto de hoisting). `apps/panel/Dockerfile` reescrito para build-context raíz
   (`npm ci --workspace=apps/panel --include-workspace-root=false`), con
   `apps/panel/Dockerfile.dockerignore` (convención BuildKit) reemplazando el
   `.dockerignore` viejo. Servicio `panel` de Sail monta la raíz del repo (`../..`) en vez
   de solo `apps/panel`. CI: `setup-node` simplificado a un solo install, el job `e2e` ya
   no necesita dos calls. Verificado: build de imagen real + smoke test, stack de Sail
   recreado y respondiendo, `run-forensics.sh --full` limpio.

9. ~~**Hook + limpieza de docs de agentes/skills**~~ — DONE.
   - `git config core.hooksPath .githooks` instalado.
   - `coroner.md`: layer chain adaptado (sin Inertia), sacada la referencia a
     `shouldBeStrict`/stock (no decidido para Clini).
   - `stenographer.md`: paths a `apps/api/tests`, `apps/panel/src`, `apps/panel/src/tests/setup.ts`.
   - `verify/SKILL.md`: reescrito — cómo se sirve el panel ahora (Sail :5174 + api :8080),
     se sacó toda la sección de gotchas de UI de Fototobares (login/cmdk/accordion, no
     aplican, no hay UI real todavía), se mantuvo la regla de scroll horizontal (confirmada
     para Clini).
   - `pass-sentence.md`: paths a `apps/api/tests/Arch/ArchTest.php` (existe de verdad ahora),
     sacada la referencia a `PageSmokeTest` (no existe), `Dockerfile`/`docker/**` → glob
     `apps/*/Dockerfile*` / `apps/*/docker/**` (dos apps, no una). Mismo ajuste de glob en
     `contractor.md` y `detective.md`.
   - `collect-evidence/SKILL.md`: path del config-dir a `-Volumes-eSSD-src-clini-app`.
   - `.claude/settings.json`: mismo glob `apps/*/Dockerfile*` en la sección `ask`.
   - `serve-warrant.md`: un ejemplo de comando con path viejo, corregido.
   - `judge.md`, `canvass-the-scene.md` no tenían referencias de dominio — sin cambios.
   - Barrido final (`grep` por fototobares/taller/oficina/ComboProduct/cmdk/etc.) sin
     resultados.

## Estado

Sail (`apps/api`) sigue arriba desde la sesión (pgsql + laravel.test + panel), así que los
pasos 2-3 pueden correr contra ese stack sin levantarlo de nuevo.

Vamos paso por paso — decime por cuál arrancamos o si querés que siga el orden de arriba.
