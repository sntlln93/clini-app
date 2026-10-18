# ADR 0015: Archivos de usuarios en un bucket compatible con S3

## Estado

Aceptado.

## Contexto

Según la propuesta de planes, la página pública de reservas muestra «Hecho con Clini» en Gratis y la marca de la organización en los planes pagos (#239). La organización tiene que poder subir su logo desde Ajustes, y el logo se muestra en la página de reservas y en el mail de recordatorio.

Es el primer archivo que suben los usuarios. La API no tenía ningún manejo de archivos:
- el disco de Laravel es `local`, dentro del contenedor;
- no hay volumen persistente en Dokploy;
- `storage:link` no corre en la imagen, y nginx no sirve `/storage`.

Un archivo en el disco del contenedor se pierde en cada redeploy. Guardar la imagen en Postgres resolvía eso, pero haría crecer la base con archivos y volvería más pesados sus backups. Un bucket o un volumen se respalda por separado y más barato.

## Decisión

**Los archivos que suben los usuarios van a un bucket compatible con S3**, a través del disco `media` de Laravel (`config/filesystems.php`, driver `s3`). El logo es el primero.
- **En producción, Cloudflare R2**: región `auto`, `AWS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com` y un token de API de R2 (las variables están en `infrastructure.md`). El disco desactiva los checksums CRC que el SDK de AWS manda por defecto (`request_checksum_calculation` y `response_checksum_validation` en `when_required`), porque no todos los servicios compatibles con S3 los aceptan.
- **En dev, el servicio `s3` de Compose** (`adobe/s3mock`). Crea el bucket al arrancar y guarda los objetos en un volumen. MinIO dejó de publicar imágenes en Docker Hub, así que no se pudo usar.
- **En los tests**, `Storage::fake('media')`.
- El disco lanza excepción ante cualquier falla (`throw`), así un error de almacenamiento nunca pasa por un archivo guardado.

**La base guarda la referencia, no el archivo.** `organization_logos` tiene una fila por organización con:
- `path`: la clave del objeto, `organization-logos/{organización}/{sha256}.{ext}`;
- `mime_type`;
- `checksum`, que versiona la URL pública (`?v=`), así un logo nuevo no queda tapado por la caché del navegador ni del cliente de mail.

**Orden de escritura:** el objeto se sube antes de guardar la fila, y el reemplazado se borra después del commit. Si falla la base, se borra el objeto recién subido. Si falla un borrado, queda a lo sumo un objeto huérfano, nunca una fila que apunte a un objeto que no existe. Quitar el logo borra primero la fila y después el objeto.

**El bucket es privado; la API sirve el logo.** `GET /booking/{slug}/logo`, público y bajo `public-organization`, lee el objeto y lo responde con su tipo, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'` y un día de caché.
- La URL sale de `APP_URL` y no del request: el mail de recordatorio se arma en un job de la cola, donde no hay request, y así la URL no depende de que el proxy que termina TLS esté en `TRUSTED_PROXIES` (sin él, el request llega por http).
- La URL no cambia aunque cambie el proveedor del bucket, y no vence, así que los mails ya enviados siguen mostrando la imagen.

**Formatos y tamaño:** PNG, JPG o WebP, hasta 512 KB y 2000 px por lado (`StoreOrganizationLogoRequest`).
- SVG queda afuera porque puede llevar script, y se sirve desde el origen de la API.
- El panel controla tipo y peso antes de subir, y la API responde los mensajes en español.

**Quién:** dueño y administración, con el permiso `organization.manage`, que existía en la matriz sin uso. No es una decisión de cobro, así que no queda solo en manos del dueño, como la suscripción.

**Endpoints del panel:** `GET`, `POST` y `DELETE /organization/logo`. Es `POST` y no `PUT` porque PHP solo interpreta multipart en `POST`. `GET /booking/{slug}` suma a `organization` dos campos: `show_clini_mark` y `logo_url`.

**El plan decide qué se muestra, no qué se guarda** (`OrganizationBranding`), igual que el resto de ADR 0014:
- `PlanFeature::BookingBranding` es un caso nuevo, y Gratis no lo incluye.
- **Subir un logo** en Gratis responde 409 `plans.feature_unavailable`.
- **Quitar un logo** se permite en cualquier plan.
- **Bajar a Gratis no borra el logo.** La página de reservas vuelve a «Hecho con Clini» y el mail deja de mostrar el logo, que reaparece en los dos al volver a un plan pago. Ajustes lo sigue mostrando, con la opción de quitarlo.
- La ruta pública sirve el logo guardado cualquiera sea el plan, para que Ajustes pueda mostrarlo. Mostrarlo o no lo deciden el payload de la reserva y el mail.

**El mail de recordatorio** muestra el logo por URL absoluta, solo cuando el plan lo incluye y la organización no está suspendida (su ruta pública respondería 403). No muestra «Hecho con Clini»: el issue lo pide solo para la página de reservas.

**«Hecho con Clini» enlaza a la landing** si el panel tiene `VITE_LANDING_URL`. La variable es opcional porque la landing todavía no está publicada (#249); sin ella, la marca se muestra como texto.

## Alternativas descartadas

- **La imagen en Postgres (base64 en una columna `text`):** no pide infraestructura nueva, pero hace crecer la base con archivos y vuelve más pesados y lentos sus backups. Era la primera versión de esta decisión.
- **El disco `public` con un volumen persistente en Dokploy:** un redeploy sin el volumen borra los archivos sin aviso. Además suma `storage:link` a la imagen y una ruta más en nginx. Y no sirve si la API corre en más de una instancia.
- **Servir el logo directo desde el bucket** (bucket público o un dominio de R2): expone el bucket y ata la URL de los mails al proveedor. Las URLs firmadas vencen, y los mails ya enviados perderían la imagen.
- **Borrar el logo al bajar a Gratis:** es destructivo, y contradice ADR 0014, donde bajar de plan deja lo existente en solo lectura.
- **Mostrar el logo también en Gratis:** la landing promete «Página de reservas con tu marca, sin "Hecho con Clini"» solo en los planes pagos.

## Consecuencias

- **Un archivo nuevo de usuarios** (adjuntos clínicos, por ejemplo) se guarda en el disco `media`, con la clave en la base. Si no es público, se sirve a través de una ruta de la API con su propia autorización.
- **Producción necesita el bucket de R2 y las variables `AWS_*`** en la app API antes de desplegar este cambio. Sin ellas, subir un logo responde 500.
- Puede haber objetos huérfanos: los de un borrado fallido, o los de una organización eliminada definitivamente, porque la fila se borra en cascada y el objeto no. Por el tamaño, no se justifica limpiarlos todavía.
- La API transfiere cada imagen que sirve. Con logos de hasta 512 KB y un día de caché, no pesa. Si algún día pesa, se puede responder con una redirección a una URL firmada del bucket.
