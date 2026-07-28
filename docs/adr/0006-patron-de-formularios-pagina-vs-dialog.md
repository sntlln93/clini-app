# ADR 0006: Patrón de formularios — página vs. Dialog

## Estado

Aceptado.

## Contexto

Los módulos del panel divergieron en cómo resuelven la creación/edición de una entidad. `pacientes` usa páginas propias (`nuevo.tsx`, `$id.tsx`, `$id.editar.tsx`), mientras `profesionales` resuelve la invitación y edición de miembros con Dialogs (`InviteMemberDialog`, `MemberEditDialog`) montados sobre la lista. No hay un criterio escrito que diga cuándo corresponde cada uno, y el issue #92 pide fijar uno único para no seguir divergiendo módulo a módulo.

## Decisión

El criterio depende de si el módulo es un CRUD de una entidad listada o una funcionalidad no-CRUD:

- **Módulo CRUD de una entidad listada** (tiene una lista con filas navegables, alta y edición como acciones de primer nivel): usa páginas propias bajo `src/routes/<module>/` — `index.tsx` (lista), `nuevo.tsx` (alta), `$id.tsx` (detalle si aplica) y `$id.editar.tsx` (edición). Da deep-link, historial del navegador y espacio para formularios largos sin las limitaciones de accesibilidad de un Dialog.
- **Módulo de funcionalidad no-CRUD** (una sola pantalla que no lista instancias de una entidad, o cuyas acciones son contextuales a otra vista): usa un único `index.tsx` y resuelve sus formularios inline o en Dialog contextual, sin rutas de página dedicadas.

Bajo este criterio: `pacientes` y `profesionales` caen del lado "página" (ambos son CRUD de una entidad listada — pacientes y miembros de la organización, respectivamente). `agenda` (turnos contextuales al calendario), `disponibilidad` (franjas y excepciones inline) y `ajustes` (secciones inline) caen del lado "no-CRUD".

## Alternativas descartadas

- **Todo a Dialog**: pierde deep-link (no se puede compartir/recargar un enlace a "editar profesional X"), pierde historial de navegación (el botón atrás no cierra el diálogo de forma predecible) y degrada la accesibilidad de formularios largos (foco atrapado, scroll interno, menor espacio en mobile).
- **Todo a página**: desproporcionado para acciones puramente contextuales de una fila de tabla o de un evento del calendario, donde el usuario no necesita salir del contexto visual en el que está parado.

## Consecuencias

- `profesionales` pasa de Dialogs a páginas (`nuevo.tsx`, `$id.editar.tsx`), alineándose con `pacientes`.
- `agenda`, `disponibilidad` y `ajustes` no cambian: ya son no-CRUD y sus Dialogs/formularios inline son correctos bajo este criterio.
- Un módulo nuevo que liste entidades con alta/edición como acciones de primer nivel debe empezar directamente con el patrón de páginas, sin pasar por Dialog primero.
