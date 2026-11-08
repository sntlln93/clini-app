# Infrastructure

> Proyecto vivo: esto documenta el punto de partida elegido para no bloquear el arranque, no un compromiso permanente. Cualquier punto acá puede cambiar cuando aparezca una necesidad real — no hay que pedir permiso para revisar esto, solo actualizar el doc cuando cambie.

## Despliegue (Dokploy)

Cuatro aplicaciones, todas con la raíz del repo como build context:

| App | Dockerfile | Build args | Notas |
|---|---|---|---|
| API | `apps/api/Dockerfile` | — | `entrypoint.sh` migra en cada arranque (`RUN_SEEDERS=true` también siembra; solo testing/demo). |
| Panel | `apps/panel/Dockerfile` | `VITE_API_URL` (obligatorio), `VITE_LANDING_URL` (opcional: el link de «Hecho con Clini» en la página de reservas; sin ella, la marca va como texto) | nginx sirviendo la SPA. |
| Dashboard de operación | `apps/dashboard/Dockerfile` | `VITE_API_URL` (obligatorio) | nginx sirviendo la SPA, con `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY` y `robots.txt` que bloquea todo. |
| Landing | `apps/landing/Dockerfile` | `VITE_PANEL_URL` (obligatorio), `VITE_API_URL` (obligatorio: el formulario de contacto, su única llamada a la API), `VITE_SITE_URL` (opcional: el origen público de la landing, del que salen todas sus URLs absolutas — canonical, `og:url`, `og:image`, el sitemap y la línea `Sitemap:` de `robots.txt`; sin ella se omiten y `/sitemap.xml` responde 404) | Servidor Node con SSR (TanStack Start + Nitro) en el puerto **3000**, no nginx. Indexable: `/robots.txt` (ruta del servidor) permite todo y apunta a `/sitemap.xml`. |

Los tres Dockerfiles de frontend copian `packages/` (los paquetes compartidos del workspace, hoy `@clini/theme` y `@clini/brand`, ver [ADR 0012](../adr/0012-tokens-de-diseno-en-un-paquete-del-workspace.md) y [ADR 0017](../adr/0017-marca-en-un-paquete-del-workspace-con-manifiesto.md)) antes del `npm ci`. Por eso el build context tiene que ser la raíz del repo, y por eso un cambio que solo toca `packages/` también cambia las imágenes de los frontends que lo usan.

Variables de la API que dependen de los frontends (pestaña **Environment** de la app API):

- `CONTACT_NOTIFICATION_EMAIL` — opcional: dirección a la que llega un mail por cada consulta del formulario de contacto de la landing, con el visitante como Reply-To. Vacía, no se manda nada (las consultas están siempre en el módulo Contactos del dashboard). Es también la casilla del equipo para los avisos de caída del registro de profesionales y del Buscador de Medicamentos (#419, #425): vacía, nadie se entera de una caída, así que en producción conviene setearla.
- `BRAND_MAIL_LOGO_URL` — opcional: URL pública (PNG) del logo del encabezado de los mails. Sin ella, es el `mailLogo` que publica el panel (`<primer origen de FRONTEND_URL>/brand/…`), así que el panel tiene que estar desplegado. `BRAND_NAME` (default `Clini`) es el nombre que muestran los mails; `MAIL_FROM_NAME` (el remitente) conviene definirla igual, porque su default es `APP_NAME`. Ver [Marca](brand.md).
- `CONTACT_RETENTION_DAYS` — días que se guarda una consulta cerrada antes de que `model:prune` (diario, en el scheduler) la borre. Default 180; `0` las guarda para siempre. Las consultas abiertas no se borran.
- `NATIONAL_MEDICATION_SEARCH_ENABLED` — `true` para que el catálogo de medicamentos consulte el Buscador Nacional de Medicamentos cuando no tiene un término ([ADR 0031](../adr/0031-catalogo-de-medicamentos-desde-el-buscador-nacional.md)). Default `false`: el campo «Medicamento» sugiere solo lo que ya está en la base. Opcionales: `NATIONAL_MEDICATION_SEARCH_URL` (default `https://cnpm.msal.gov.ar`) y `NATIONAL_MEDICATION_SEARCH_USER_AGENT` (default `Clini/1.0 (catalogo de medicamentos; +APP_URL)`).
- `PROFESSIONAL_REGISTRY` — el registro con el que se validan las matrículas de los profesionales al cargarlas y en la reverificación diaria, y del que salen su profesión y sus especialidades ([ADR 0032](../adr/0032-matriculas-validadas-con-el-buscador-nacional-de-profesionales.md), [ADR 0038](../adr/0038-especialidades-tomadas-del-registro-nacional-de-profesionales.md)). Default `national_search`, el Buscador Nacional de Profesionales de la Salud: en producción no se setea. `fake` responde a los DNIs inventados del seeder sin salir de Clini (dev y e2e) y producción lo rechaza. Opcionales: `NATIONAL_PROFESSIONAL_SEARCH_URL` (default `https://www.argentina.gob.ar/salud/buscador-nacional-de-profesionales-de-la-salud`), `NATIONAL_PROFESSIONAL_SEARCH_USER_AGENT` (default `Clini/1.0 (validacion de matriculas; +APP_URL)`), `PROFESSIONAL_REGISTRY_PER_RUN` (profesionales que consulta como mucho cada corrida diaria; default `200`). Las caídas del registro (#419) y del Buscador de Medicamentos (#425) se avisan por mail a `CONTACT_NOTIFICATION_EMAIL` (sin ella no se avisa); el umbral y lo que busca cada prueba son valores fijos de `config/services.php`, no variables de entorno.

- `FRONTEND_URL` — orígenes con CORS + credenciales, separados por coma. **El panel siempre primero**: el primer elemento es la URL base de los links de los mails (invitaciones, verificación de correo, retorno de la suscripción). Después, el origen del dashboard y el de la landing (que solo lo necesita para el `POST /api/v1/contact` de su formulario de contacto).
- `SANCTUM_STATEFUL_DOMAINS` — host(s) de los dos frontends con sesión (`panel.tu-dominio.com,dashboard.tu-dominio.com`), para que los dos reciban la sesión por cookie. **Nunca la landing**: su formulario de contacto es un pedido sin sesión ni CSRF (ADR 0011).
- `ADMIN_ALLOWED_ORIGINS` — solo el origen del dashboard (`https://dashboard.tu-dominio.com`). Las rutas `/api/v1/admin/*` rechazan con 403 cualquier pedido cuyo `Origin`/`Referer` no esté acá, y las rutas de la clínica rechazan con 403 cualquier pedido que venga desde acá. Falla cerrada: si falta, el default es `http://localhost:5175` y todo el dashboard productivo queda en 403.
- `SESSION_DOMAIN` — tiene que cubrir los dos frontends y la API (el dominio padre, p. ej. `.tu-dominio.com`): panel y dashboard comparten la misma cookie de sesión de la API, con una identidad por guard (ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md)). Por eso el dashboard tiene que vivir en el mismo sitio (dominio registrable) que la API y el panel.
- `ADMIN_REPORTING_TIMEZONE` — zona horaria de los agregados diarios del dashboard (default `America/Argentina/Buenos_Aires`). **Tiene que coincidir con la constante `REPORTING_TIMEZONE` de `apps/dashboard/src/lib/format.ts`**: el dashboard la usa para mostrar fechas y para los límites del input de extensión de gracia, y cambiarla ahí requiere rebuild. Si difieren, cerca de medianoche el cliente permite fechas que la API rechaza (422) o al revés, y las fechas mostradas no coinciden con los buckets.

Operadores: en producción y en el server de demo no se siembran (`PlatformAdminSeeder` es un no-op en producción); se crean con `php artisan admin:create` desde la terminal del contenedor de la API.

Después de desplegar el cambio que introdujo el dashboard sobre una base ya existente de testing/demo hace falta, una sola vez, `php artisan migrate:fresh --seed --force` (agregó columnas editando migraciones en el lugar) — ver [Development Guide](development.md#una-sola-vez-tras-desplegar-el-dashboard-de-operación-migratefresh---seed).

**IP real del visitante (proxy de confianza, #312)**: los pedidos llegan a la API a través del proxy de Dokploy (Traefik), así que la conexión la abre el proxy y la IP del visitante viaja en `X-Forwarded-For`. La API solo cree en ese header (y en `X-Forwarded-Proto`, `-Host` y `-Port`; nunca en `X-Forwarded-Prefix`) cuando la conexión viene de una dirección listada en `TRUSTED_PROXIES` (`config/trustedproxy.php`):

- `TRUSTED_PROXIES` — IPs o rangos CIDR separados por coma: la red de Docker por la que el proxy llega a la API. **Vacía (el default) no confía en ningún proxy**, y `*`, `**` o `REMOTE_ADDR` se descartan: confiarían en cualquiera que se conecte, y quien llegue a la API sin pasar por el proxy (un puerto del contenedor publicado) podría elegir su propia IP. Sin ella, `$request->ip()` es la dirección del proxy para todos los visitantes: los throttles de los logins del panel y del dashboard (`login` y `admin-login`, 5 por minuto por `email|ip`) degradan a un límite por email (el del código de la verificación en dos pasos, `two-factor-challenge`, ya es por cuenta: 5 por minuto, sin IP), los del formulario de contacto (`contact`, 5 por minuto y 20 por hora por IP) y del registro de cuentas (`register`, los mismos valores) pasan a ser límites globales, los de la reserva online (abajo) quedan por consultorio y globales, y la columna `ip` de `admin_audit_logs` registra el proxy.

Para cargarla en Dokploy (pestaña **Environment** de la app API):

1. En el servidor, la red del proxy: `docker network inspect dokploy-network --format '{{range .IPAM.Config}}{{.Subnet}} {{end}}'` (suele ser algo como `10.0.1.0/24`). Es la red que comparten Traefik y todas las aplicaciones del servidor, así que la API les cree los `X-Forwarded-*` a todos los contenedores conectados a ella, no solo a Traefik: no desplegar en ese servidor aplicaciones de terceros o que no sean de confianza. No agregar la red `ingress` de Swarm ni una red pública: si la API tiene un puerto publicado, los pedidos que entran por ahí no pasan por el proxy.
2. `TRUSTED_PROXIES=<esa red>` y redeploy de la API.
3. Verificar: iniciar sesión en el dashboard y mirar la IP del inicio de sesión en Auditoría. Tiene que ser la IP pública propia, no una `10.x`. Repetirlo desde otra conexión (p. ej. los datos del celular) tiene que dar otra IP.

Si delante de Traefik hay otro proxy (p. ej. Cloudflare con la nube naranja), la IP que ve Traefik es la de ese proxy. Traefik descarta los `X-Forwarded-*` que le llegan de una IP en la que no confía y pone la que vio, así que hay que configurar sus `forwardedHeaders.trustedIPs` con los rangos de ese proxy. Agregarlos a `TRUSTED_PROXIES` no alcanza, porque el header original ya no llega a la API. No se agregó un límite solo por IP al login del dashboard: con `TRUSTED_PROXIES` vacía sería un bloqueo global del login para todos los operadores, así que queda para cuando la variable esté verificada en producción.

**Límites de la reserva online** (#299, `config/booking.php`): la página pública de reserva es anónima, así que la API la limita por IP del visitante y por consultorio. Solo cuenta para los límites por hora una reserva creada (un 201); un pedido rechazado (un dato mal cargado, un horario recién tomado) no los gasta, pero sí cuenta para el límite por minuto. Las dos URLs de un consultorio (la suya y la de cada profesional) comparten el mismo cupo, y una URL que no existe no gasta ninguno. Al pasarse, la API responde 429 con `Retry-After` y la página le pide al paciente que pruebe en unos minutos. Cada valor se cambia por variable de entorno sin deploy de código, y `0` apaga ese límite:

| Variable | Default | Qué limita |
|---|---|---|
| `BOOKING_LIMIT_PER_ORGANIZATION` | 5 | reservas por hora de una IP en un consultorio |
| `BOOKING_LIMIT_PER_IP` | 20 | reservas por hora de una IP en todos los consultorios |
| `BOOKING_ATTEMPTS_PER_MINUTE` | 10 | pedidos de reserva por minuto de una IP, con cualquier resultado |
| `BOOKING_SLOT_SEARCHES_PER_MINUTE` | 60 | búsquedas de horarios por minuto de una IP en un consultorio |

Los límites por hora se cuentan después de la respuesta (solo así puede saberse que se creó la reserva), así que una ráfaga de pedidos simultáneos puede pasarlos: la frena el límite por minuto, que se cuenta antes.

Mientras `TRUSTED_PROXIES` no tenga la red del proxy (arriba), todos los pacientes comparten la IP del proxy: los límites por consultorio pasan a valer para todos sus pacientes juntos (5 reservas por hora, 60 búsquedas de horarios por minuto) y los de solo IP para toda la plataforma (20 reservas por hora, 10 pedidos por minuto). Como un pedido rechazado también cuenta para los límites por minuto y para los de `register` y `contact`, cualquiera podría llenarlos a propósito y dejar sin reserva online o sin registro a todos. **Antes de abrir la plataforma a tráfico real hay que cargar `TRUSTED_PROXIES`** (o, mientras tanto, poner en `0` los límites de la reserva).

## Seguridad del despliegue

El checklist de la Res. AAIP 47/2018 contra el estado del proyecto está en [Seguridad](security.md), y el protocolo de incidentes en [incident-response.md](incident-response.md). Esta sección junta lo que esas medidas le piden al despliegue.

### HTTPS y cookies

- **HTTPS en cada dominio** (API, panel, dashboard, landing): en Dokploy, cada dominio con HTTPS y el proveedor de certificados `letsencrypt`. Traefik emite y renueva el certificado. Con la redirección de HTTP a HTTPS activada.
- **HSTS en Traefik**: un middleware de cabeceras con `Strict-Transport-Security: max-age=31536000`. `includeSubDomains` solo cuando todos los subdominios del dominio tengan HTTPS: una vez que el navegador lo aprende, no se puede deshacer hasta que vence. Las demás cabeceras de seguridad (CSP, Referrer-Policy) van en #393.
- **URLs en `https`**: `APP_URL`, `FRONTEND_URL`, `ADMIN_ALLOWED_ORIGINS` y los build args `VITE_*_URL`.
- `SESSION_SECURE_COOKIE=true`: la cookie de sesión solo viaja por HTTPS. Sin la variable, Laravel la marca `Secure` solo si ve el pedido como HTTPS, y detrás del proxy eso depende de `TRUSTED_PROXIES` (arriba). Con la variable no depende de eso.
- `SESSION_ENCRYPT=true` (el default desde #358): el payload de la sesión se guarda cifrado con `APP_KEY` en la tabla `sessions`. **La primera vez que se despliega con el cifrado activado, todas las sesiones abiertas se descartan**: Laravel no puede descifrar el payload viejo, arranca una sesión vacía y todos los usuarios y operadores vuelven a iniciar sesión (sin errores). Conviene hacerlo en un horario de poco uso. Lo mismo pasa al rotar `APP_KEY` sin `APP_PREVIOUS_KEYS`.

### Postgres

- En el mismo servidor que la API, conectado solo a la red de Dokploy y **sin puerto externo publicado** (en Dokploy, sin «External Port»). Así el tráfico entre la API y la base no sale del host.
- Si la base pasa a otro servidor o a un servicio gestionado: `DB_SSLMODE=require`, y `verify-full` con `DB_SSLROOTCERT` (la ruta al certificado de la CA, montado en el contenedor) cuando la conexión cruza una red que no es privada. El default de Laravel, `prefer`, usa TLS solo si el servidor lo ofrece, y si no, conecta en claro sin avisar.
- Backups: pendientes (#390).

### Maestra de la historia clínica

`CLINICAL_ENCRYPTION_KEY` cifra la clave de datos de la historia clínica (#391, [ADR 0036](../adr/0036-cifrado-envolvente-de-la-historia-clinica.md)). Se genera una vez con `php artisan clinical-keys:generate-master --show`, se carga en las variables de Dokploy **antes del primer deploy que migre** y se guarda también fuera de línea: perderla es perder la historia. Nunca es `APP_KEY`, y producción rechaza la clave pública de `.env.example`. La demo tiene la suya. Cómo rotarla: [Seguridad](security.md#cifrado-de-la-historia-clínica).

`DOCUMENT_INDEX_KEY` es la clave del índice ciego por el que se busca el DNI de un profesional (#417, ADR 0032). Se genera con `php artisan document-index:generate-key` y se carga en Dokploy antes del primer deploy; producción rechaza la pública de `.env.example`, y nunca es `APP_KEY` ni la maestra clínica. Perderla no pierde datos: con una nueva, `document-index:rotate` recalcula el índice desde los DNI cifrados. Cómo rotarla: [Seguridad](security.md#índice-ciego-del-dni-del-profesional).

### Logs y modo debug

- `APP_ENV=production` y `APP_DEBUG=false`: con debug, un error inesperado devuelve la traza (ADR 0024).
- `LOG_STACK=stderr`: el log de la aplicación va a la salida del contenedor, que Dokploy muestra. El default (`single`) escribe `storage/logs/laravel.log` dentro del contenedor, sin rotar, y se pierde en cada redeploy. Conservarlo fuera del contenedor va en #393.

### Checklist de despliegue

Antes de abrir producción a consultorios reales:

- [ ] HTTPS y redirección en los cuatro dominios, HSTS en Traefik.
- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `LOG_STACK=stderr`.
- [ ] `SESSION_SECURE_COOKIE=true`, `SESSION_ENCRYPT=true` (o sin definir), `SESSION_DOMAIN` y `TRUSTED_PROXIES` cargados.
- [ ] Postgres sin puerto publicado.
- [ ] El access log de Traefik apagado (abajo, Observabilidad).
- [ ] Backups funcionando y una restauración probada (#390).
- [ ] `CLINICAL_ENCRYPTION_KEY` propia, cargada en Dokploy y guardada fuera de línea (#391).
- [ ] `DOCUMENT_INDEX_KEY` propia, de `php artisan document-index:generate-key`, cargada en Dokploy (#417).
- [ ] La demo sin la base, el bucket, la `APP_KEY`, la `CLINICAL_ENCRYPTION_KEY` ni la `DOCUMENT_INDEX_KEY` de producción.

## Colas

`QUEUE_CONNECTION=database` para arrancar. Redis solo si aparece una necesidad real de throughput/latencia que la cola en base de datos no pueda cubrir — no antes.

Un job fallido queda en `failed_jobs` con su payload y la excepción entera, y los dos pueden llevar datos personales (#322). `queue:prune-failed` corre todos los días en el scheduler y borra los que tienen más de `QUEUE_FAILED_RETENTION_HOURS` horas (default 168, una semana; nunca menos de una hora, así que una variable vacía o en `0` no vacía la tabla). Un job cuyo payload lleva un dato que no es un modelo (una dirección, un token) implementa `ShouldBeEncrypted`, como `EmailVerificationMail`, y así va cifrado con `APP_KEY` en `jobs` y en `failed_jobs`. Los modelos viajan solo como id (`SerializesModels`).

## Caché

Driver por defecto de Laravel. No optimizar prematuramente: sin justificación concreta (medición, no intuición), no vale la pena introducir Redis/Memcached solo para cache.

## Archivos

Los archivos que suben los usuarios (hoy, el logo de la organización, #239) van a un bucket compatible con S3, a través del disco `media` ([ADR 0015](../adr/0015-archivos-de-usuarios-en-un-bucket-s3.md)). La base guarda solo la clave del objeto. El bucket es privado, y la API sirve los archivos públicos con su propia ruta.

**Producción: Cloudflare R2.** Antes de desplegar, crear el bucket y un token de API de R2 con permiso de lectura y escritura sobre ese bucket. Después, cargar estas variables en la app API (pestaña **Environment**):

| Variable | Valor |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | las credenciales del token de R2 |
| `AWS_DEFAULT_REGION` | `auto` |
| `AWS_BUCKET` | el nombre del bucket |
| `AWS_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `false` |

Sin ellas, la API arranca igual, pero subir un logo responde 500.

**Borrado diferido** ([ADR 0035](../adr/0035-borrado-diferido-de-los-archivos-de-usuarios.md), #410). Reemplazar o quitar un archivo no borra el objeto: queda anotado en `media_object_deletions` con una fecha de borrado a `MEDIA_DELETION_RETENTION_DAYS` días (default 35; un valor vacío o en `0` toma el default, y nunca es menos de un día). `media:delete-due` corre todos los días en el scheduler y borra los vencidos, salvo que una fila viva vuelva a nombrar el objeto. Así, una base restaurada a un momento anterior sigue encontrando los objetos que nombra, y un logo quitado se puede recuperar mientras no venza. **`MEDIA_DELETION_RETENTION_DAYS` no puede ser menor que la ventana de PITR de los backups de Postgres** (30 días, #411): si lo fuera, restaurar la base al principio de esa ventana dejaría filas que nombran objetos ya borrados. Si se agranda la ventana, se agranda también esta variable. El backup y el versionado del bucket van en #411.

En dev, el servicio `s3` de Compose (`adobe/s3mock`) reemplaza a R2: crea el bucket `clini` al arrancar y guarda los objetos en el volumen `clini-s3-v5` (s3mock 5 no lee lo que guardó la 4.x, así que el volumen `clini-s3` anterior puede borrarse con `docker volume rm clini-app_clini-s3`).

## Observabilidad

### Datos personales en los logs

Los logs no tienen la protección ni la retención de la base, así que no llevan datos personales (#322; la regla de `logContext()` está en [Contrato de errores](error-contract.md#dónde-se-traduce)). Lo que lo sostiene fuera del código de la aplicación:

- La imagen de la API corre con `zend.exception_ignore_args=On` (`apps/api/Dockerfile`): sin eso, cada frame de una traza en `laravel.log` o en `failed_jobs` lleva sus argumentos, como un DNI, un email o un nombre que se le pasó a una Action.
- Los nginx de la API, del panel y del dashboard no escriben access log, y el error log de la API va a stderr solo en `crit`. Una URL lleva el estado de búsqueda (`?q=` con un nombre o un DNI) y tokens en el path (`/turno/<token>`), y el `Referer` también. La búsqueda de un paciente por documento (`POST /api/v1/patients/lookup`) es un POST para que el DNI no viaje en la URL. Además tiene un límite de 30 búsquedas cada 5 minutos por usuario, y cada búsqueda deja una fila en `patient_lookups` sin el documento buscado (ADR 0028).
- **Dokploy/Traefik**: el monitoreo de **Requests** de Dokploy activa el access log de Traefik, y ese log guarda la URL completa, con el query string. Mantenerlo apagado. Si se activa, las búsquedas `?q=` del panel y del dashboard (nombres, DNI, emails) quedan ahí, con la retención que tenga el host.
- La sesión de la API (tabla `sessions`) va cifrada (`SESSION_ENCRYPT`) y no guarda la URL de cada GET, que llevaría las búsquedas `?q=` (#358, `StartSessionWithoutPreviousUrl`).
- `MAIL_MAILER` nunca es `log` en producción, porque el mailer `log` escribe cada mail entero (destinatario, paciente, turno) en `laravel.log`. Producción usa `resend`, y el server de demo puede usar `array`.

Herramientas evaluadas (no instaladas todavía): Laravel Pulse, Laravel Nightwatch, Uptime Kuma. El objetivo cuando se necesite: logs, métricas, monitoreo, uptime — con preferencia por soluciones gratuitas o de muy bajo costo dado el estadio del proyecto. Sin decisión tomada sobre cuál(es) usar.
