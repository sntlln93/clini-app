# ADR 0019: Historia clínica de solo agregado, con enmiendas versionadas

## Estado

Aceptado (#323).

## Contexto

Las notas clínicas (CU-45) y la medicación indicada (CU-53) son historia clínica. La Ley 26.529 (art. 13) exige integridad e inalterabilidad, y la Ley 10.549 de La Rioja (art. 4) exige registrar quién agrega, modifica o elimina información. Varias provincias exigen además corregir sin borrar.

Hasta ahora el autor podía editar una nota (`PATCH`, que pisaba el texto) y borrarla (`DELETE`, borrado suave). La medicación indicada se editaba reemplazando todos sus ítems. En los dos casos se perdía la versión anterior.

## Decisión

**Las notas y la medicación indicada son de solo agregado: no se editan ni se borran.** No hay rutas `PUT`, `PATCH` ni `DELETE` sobre ellas. Las únicas escrituras son:
- **Enmendar** (`POST /clinical-notes/{id}/amendments`, `POST /prescriptions/{id}/amendments`): agrega una versión nueva (texto o lista completa de ítems) con su autor, su fecha y un motivo opcional. Las anteriores quedan como estaban. Una enmienda que repite lo vigente responde 409 (`*.amendment_unchanged`).
- **Anular una nota** (`POST /clinical-notes/{id}/annulment`): reemplaza al borrado. Exige un motivo de 3 a 500 caracteres. La nota sigue en la historia con todas sus versiones, marcada como anulada, y ya no se puede enmendar ni volver a anular (409 `clinical_notes.annulled`).

**El modelo guarda cada versión en su propia fila.**
- `clinical_notes` y `prescriptions` quedan con lo que no cambia: turno, autor, organización y fecha de creación (sin `updated_at` ni `deleted_at`).
- El texto vive en `clinical_note_versions`, y los ítems cuelgan de `prescription_versions`.
- La anulación es una fila de `clinical_note_annulments`, una por nota.
- Solo el autor enmienda o anula, igual que antes editaba o borraba (#30, #31), y cada versión y cada anulación guardan la membresía que la hizo.

**La base de datos lo garantiza, no solo la API.** Un trigger de Postgres rechaza todo `UPDATE`, `DELETE` o `TRUNCATE` sobre las seis tablas, así que tampoco un bug, un script ni un `artisan tinker` alteran la historia. La única excepción es el seeder de fixtures, que borra lo escrito sobre sus organizaciones de prueba para poder re-sembrarse: activa `clini.clinical_records_purge` con `set_config(..., true)`, que dura solo hasta el fin de su transacción y solo deja pasar `DELETE`. Ningún archivo de `app/`, `routes/` ni `config/` nombra ese setting (ArchTest).

**Migración de datos existentes** (`2026_10_18_000001_make_clinical_records_append_only`): cada nota y cada registro pasa a la versión 1, fechada en su `updated_at`, que es cuando se escribió el texto vigente. Las ediciones anteriores ya se habían perdido. En una nota borrada, el borrado suave pisó `updated_at` con la fecha del borrado, así que su versión 1 queda fechada en su `created_at`. Las notas borradas con borrado suave **se restauran como anuladas**, con el motivo «Borrada antes de que las notas clínicas fueran inmutables.», fechadas en su `deleted_at` y a nombre del autor, que era el único que podía borrarlas. Nada se pierde. El panel muestra el texto de una nota anulada detrás de un desplegable, no a la vista.

## Alternativas descartadas

- **Una tabla de auditoría genérica (antes/después en JSON) y seguir editando la fila.** La versión vigente quedaría en una tabla y la historia en otra, que se puede olvidar de escribir. La integridad dependería de que cada camino de escritura audite. Con versiones, la historia es el dato mismo.
- **Guardar el texto vigente en `clinical_notes` y las versiones viejas aparte.** Obliga a actualizar la fila de la nota en cada enmienda, justo lo que el trigger prohíbe, y deja dos copias del texto vigente.
- **Restaurar las notas borradas como notas comunes, o dejarlas borradas.** Restaurarlas sin marca contradice la decisión del autor de sacarlas. Dejarlas fuera pierde datos de la historia. Anularlas conserva las dos cosas, y mostrarlas u ocultarlas es solo un cambio de interfaz.
- **Permitir anular la medicación indicada.** Nunca se pudo borrar, y un error en los ítems se corrige con una enmienda. Si hace falta, es un issue aparte.
- **Validar la inmutabilidad solo en la API** (policies, sin rutas de edición). No protege contra una consola, un script ni una migración mal escrita.

## Consecuencias

- El autor ya no puede editar ni borrar. El panel ofrece «Enmendar» y «Anular», y cada diálogo lo explica.
- Una anulación no se deshace. Si se anula por error, la nota se vuelve a escribir.
- El trigger también bloquea a cualquier proceso futuro que necesite borrar historia clínica: la exportación por baja (#329) o el vencimiento a los 10 años (Ley 26.529, art. 18). Un proceso así tiene que ser explícito y pasar por su propio ADR.
- El diagnóstico estructurado (#324) entra como dato de una versión de la nota: cambiarlo es una enmienda.
- Relajar cómo se muestra lo anulado o el historial es un cambio de interfaz, sin migrar datos.
