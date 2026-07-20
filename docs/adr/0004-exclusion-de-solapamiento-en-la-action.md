# ADR 0004: Exclusión de solapamiento de turnos en la Action, no en la base

## Estado

Aceptado.

## Contexto

Un profesional no puede tener dos turnos activos que se solapen (CU-20). En la reserva online, dos pacientes pueden intentar el mismo slot casi en simultáneo y solo uno debe ganar (CU-36). Además, un mismo profesional puede atender en varias organizaciones, y su tiempo físico es uno solo: un turno a las 10:00 en la organización A debería detectarse como solapado con uno a las 10:00 en la B (CU-23).

`docs/product/checklist-schema.md` marca como bandera roja "solapamiento controlado solo en código, sin constraint/índice" y pide que la exclusión sea **imponible** (garantizada a nivel de base) para CU-20/36. Este ADR existe porque la decisión va deliberadamente en contra de esa bandera roja, y sin una razón escrita se re-litigaría (alguien agregaría el constraint, o quitaría el lock creyéndolo redundante).

Postgres puede imponer esto con un exclusion constraint (`EXCLUDE USING gist` sobre `tstzrange(start_at, end_at)` con `&&`, requiere `btree_gist`), pero clavarlo en `membership_id` solo cubre el solapamiento **intra-organización**: la membresía es por organización, así que no ve los turnos del mismo profesional en otra org.

## Decisión

La exclusión de solapamiento se resuelve en la **Action de reserva**, dentro de una transacción con lock (p. ej. `SELECT … FOR UPDATE` sobre los turnos del profesional en el rango, o un advisory lock), **sin** exclusion constraint en la base.

- Estados que **liberan** el slot y no cuentan para el solapamiento: `cancelled` y `rescheduled`.
- El chequeo inter-organización (CU-23) se hace en la misma capa, resolviendo el profesional físico a través de `memberships.user_id`.
- El schema conserva lo necesario para hacerlo verificable: `membership_id`, `start_at`/`end_at` y `status`. La garantía de unicidad es de aplicación, no de base.

## Alternativas descartadas

- **Exclusion constraint intra-org (`btree_gist` sobre `membership_id`)**: impone y da atomicidad a nivel base, pero solo intra-organización. No cubre CU-23 (mismo profesional en dos orgs), que quedaría igual en la Action — es decir, no elimina la lógica de aplicación, solo agrega un mecanismo parcial que hay que mantener en paralelo.
- **Exclusion constraint clavado en `user_id`** (denormalizando `user_id` en `appointments`): sí impone el tiempo físico inter-organización a nivel base, pero denormaliza un dato que hay que mantener coherente con `memberships.user_id` y **acopla organizaciones que el modelo mantiene aisladas** (un turno de A bloquea contra turnos de B). La checklist pide que el caso inter-org sea *expresable*, no *imponible*, así que este mecanismo es más fuerte de lo requerido a cambio de romper el aislamiento multi-tenant.

## Consecuencias

- La atomicidad frente a concurrencia (CU-36) **depende del lock transaccional en la Action**: no es opcional. Toda ruta que cree o reprograme turnos (reserva online, carga manual, reprogramación) debe pasar por esa Action; escribir en `appointments` por fuera puede colar un solapamiento.
- No hay red de seguridad a nivel base: un bug en la Action se traduce en doble reserva. Esto se cubre con tests de concurrencia/feature, no con un test de estructura.
- Si en el futuro se decide imponerlo en la base, la vía es el constraint sobre `user_id` (con su costo de aislamiento) — pero sería un cambio de esta decisión, no un complemento silencioso.
- La bandera roja correspondiente en `checklist-schema.md` queda marcada como decisión aceptada, no como hueco.
