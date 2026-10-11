# ADR 0015: Logo de la organización en la base de datos

## Estado

Aceptado.

## Contexto

Según la propuesta de planes, la página pública de reservas muestra «Hecho con Clini» en Gratis y la marca de la organización en los planes pagos (#239). La organización tiene que poder subir su logo desde Ajustes, y el logo se muestra en la página de reservas y en el mail de recordatorio.

Es el primer archivo que suben los usuarios. La API no tenía ningún manejo de archivos:
- el disco de Laravel es `local`, dentro del contenedor;
- ningún volumen persistente está configurado en Dokploy ni documentado en `docs/architecture/infrastructure.md`;
- `storage:link` no corre en la imagen, y nginx no sirve `/storage`.

Un archivo guardado en el disco del contenedor se pierde en cada redeploy.

## Decisión

**El logo se guarda en Postgres**, en una tabla propia, `organization_logos`, con una fila por organización:
- `content` es la imagen en base64, en una columna `text`. Un `bytea` obligaría a enlazar binarios a mano con PDO, y Eloquent no lo hace.
- `checksum` (sha256 del archivo) versiona la URL pública (`?v=`), así un logo nuevo no queda tapado por la caché del navegador ni del cliente de mail.
- La tabla está separada de `organizations` para que la imagen no viaje en cada consulta de la organización. El panel (`/me`) serializa ese modelo entero.

**Formatos y tamaño**: PNG, JPG o WebP, hasta 512 KB y 2000 px por lado (`StoreOrganizationLogoRequest`).
- SVG queda afuera porque puede llevar script, y el logo se sirve desde el origen de la API.
- El panel controla tipo y peso antes de subir, y la API responde los mensajes en español.

**Quién**: dueño y administración, con el permiso `organization.manage`, que existía en la matriz sin ningún uso. No es una decisión de cobro, así que no queda solo en manos del dueño, como la suscripción.

**Endpoints**:
- `GET`, `POST` y `DELETE /organization/logo` en el panel. Es `POST` y no `PUT` porque PHP solo interpreta multipart en `POST`.
- `GET /booking/{slug}/logo`, público, bajo `public-organization`. Responde la imagen con su tipo, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'` y un día de caché.
- `GET /booking/{slug}` suma a `organization` dos campos: `show_clini_mark` y `logo_url`.

**El plan decide qué se muestra, no qué se guarda** (`OrganizationBranding`), igual que el resto de ADR 0014:
- `PlanFeature::BookingBranding` es un caso nuevo, y Gratis no lo incluye.
- **Subir un logo** en Gratis responde 409 `plans.feature_unavailable`.
- **Quitar un logo** se permite en cualquier plan.
- **Bajar a Gratis no borra el logo.** La página de reservas vuelve a «Hecho con Clini» y el mail deja de mostrar el logo, que reaparece en los dos al volver a un plan pago. Ajustes lo sigue mostrando, con la opción de quitarlo.
- La ruta pública sirve el logo guardado cualquiera sea el plan, para que Ajustes pueda mostrarlo. Mostrarlo o no lo deciden el payload de la reserva y el mail.

**El mail de recordatorio** muestra el logo por URL absoluta, solo cuando el plan lo incluye y la organización no está suspendida (su ruta pública respondería 403). La URL sale de `APP_URL` y no del request, porque detrás del proxy que termina TLS el request llega por http. No muestra «Hecho con Clini»: el issue lo pide solo para la página de reservas.

**«Hecho con Clini» enlaza a la landing** si el panel tiene `VITE_LANDING_URL`. La variable es opcional porque la landing todavía no está publicada (#249); sin ella, la marca se muestra como texto.

## Alternativas descartadas

- **El disco `public` de Laravel, con un volumen persistente en Dokploy:** depende de configurar infraestructura que hoy no existe, y que un redeploy sin el volumen borra sin aviso. Además suma `storage:link` a la imagen y una ruta más en nginx. Para una imagen por organización de hasta 512 KB, Postgres alcanza, y entra en sus backups.
- **Un bucket compatible con S3:** `infrastructure.md` lo reserva para cuando haga falta almacenamiento distribuido. Un logo por organización no lo justifica, y agregaría credenciales y un proveedor externo.
- **Columnas del logo en `organizations`:** cada lectura de la organización, incluido `/me`, cargaría la imagen.
- **Borrar el logo al bajar a Gratis:** es destructivo, y contradice ADR 0014, donde bajar de plan deja lo existente en solo lectura.
- **Mostrar el logo también en Gratis:** la landing promete «Página de reservas con tu marca, sin "Hecho con Clini"» solo en los planes pagos.

## Consecuencias

- Si los logos crecen en cantidad o tamaño, o aparecen otros archivos (adjuntos clínicos, por ejemplo), conviene revisar esta decisión a favor de un bucket. Migrar es copiar `content` a un objeto y cambiar la ruta pública.
- La URL del logo depende del slug de la organización. Hoy el slug no cambia; si alguna vez cambia, los mails ya enviados pierden la imagen.
