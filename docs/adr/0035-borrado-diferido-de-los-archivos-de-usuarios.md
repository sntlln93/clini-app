# ADR 0035: Borrado diferido de los archivos de usuarios

## Estado

Aceptado. Modifica el orden de escritura de [ADR 0015](0015-archivos-de-usuarios-en-un-bucket-s3.md).

## Contexto

Hasta #410, reemplazar el logo borraba el objeto anterior del bucket `media` después del commit, y quitarlo lo borraba en el momento. Eso trae dos problemas:
- **Restaurar la base a un momento anterior** (PITR, #411) deja filas que nombran objetos que ya no existen en el bucket: el logo de la página de reservas y del mail responde 500.
- **Un logo borrado no se recupera**, aunque el titular lo quite por error.

## Decisión

**Ningún objeto se borra cuando una fila deja de nombrarlo.** Se anota en una tabla genérica de borrados pendientes, `media_object_deletions` (disco, clave del objeto, `deletes_at`), dentro de la misma transacción que cambia la fila. `media:delete-due` corre todos los días en el scheduler y borra los vencidos.

- **Retención:** `MEDIA_DELETION_RETENTION_DAYS`, default 35 días, por encima de la ventana de PITR de 30 días de #411. Nunca menos de un día: un valor vacío o en `0` toma el default, igual que `QUEUE_FAILED_RETENTION_HOURS`. Nunca puede ser menor que la ventana de PITR (`infrastructure.md`).
- **Volver a subir el mismo archivo** reusa la misma clave, porque sale del checksum. Eso cancela su borrado pendiente, antes de escribir el objeto y dentro de la transacción que guarda la fila.
- **La tarea nunca borra un objeto que una fila viva vuelve a nombrar**: en ese caso borra solo la fila pendiente. Cada tabla que nombra objetos se suma a `MediaObjectDeletions::isNamedByLiveRow()`.
- **Concurrencia:** la tarea bloquea la fila pendiente mientras borra el objeto. Una subida del mismo archivo cancela esa fila antes de escribir el objeto, así que espera a que la tarea termine y lo escribe después. El objeto que queda es siempre el de la subida.
- **Si la subida falla**, el objeto recién escrito se borra en el momento, salvo que otra fila (viva o pendiente) lo nombre: la misma clave es el mismo archivo. Antes, volver a subir el logo actual y fallar borraba el objeto que la fila seguía nombrando. La subida toma un *advisory lock* de Postgres sobre la clave hasta su commit, y la limpieza de una subida fallida lo toma antes de mirar las filas: si dos subidas del mismo archivo coinciden y una falla, la limpieza espera a la otra y ve su fila, en lugar de borrarle el objeto (no hay fila que bloquear cuando es el primer logo).
- **Si falla el borrado de un objeto vencido**, la fila pendiente vuelve atrás y se reintenta en la próxima corrida, sin frenar las demás.

## Alternativas descartadas

- **Soft delete en `organization_logos`:** la fila es una por organización y se reescribe al reemplazar el logo, así que no puede guardar el objeto reemplazado. Además, cada archivo nuevo repetiría el mecanismo en su propia tabla.
- **Versionado o *bucket locks* de R2 en lugar de la tabla:** dependen del proveedor y no los ofrece cualquier servicio compatible con S3. Van en #411 como resguardo del bucket, no como reemplazo de este borrado.
- **Borrar al vencer con `model:prune`:** no bloquea la fila mientras borra el objeto, así que una subida del mismo archivo en ese momento podría quedar apuntando a un objeto borrado.

## Consecuencias

- Un archivo nuevo de usuarios agenda su borrado con `MediaObjectDeletions::schedule()` y cancela uno pendiente con `cancel()` al volver a nombrar la misma clave.
- El bucket guarda, además de los objetos en uso, los reemplazados y quitados de los últimos `MEDIA_DELETION_RETENTION_DAYS` días. Con logos de hasta 512 KB, no pesa.
- Un logo quitado por error se puede recuperar a mano mientras su fila pendiente no venza.
- Los objetos de una organización eliminada definitivamente siguen huérfanos, como dice ADR 0015: la fila del logo se borra en cascada y no agenda nada.
