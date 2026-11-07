# Seguridad

El deber de seguridad de la Ley 25.326 (art. 9) es obligatorio. La Ley 10.549 de La Rioja (art. 5) hace responsable al establecimiento de la seguridad y de la custodia de las claves. La [Res. AAIP 47/2018](https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-47-2018-312662/texto), en su Anexo I, trae las medidas recomendadas para datos en medios informatizados, y este documento las usa como checklist (#358, derivado de #330). Lo acompaña el [protocolo de incidentes](incident-response.md).

Clini es el facilitador de los medios: los consultorios cargan y deciden sobre los datos de sus pacientes, y Clini opera la plataforma donde viven. El reparto legal de roles está en #317 y #379. Este documento cubre lo que depende de Clini: el código, el despliegue y la operación.

**Responsable de seguridad**: el titular de Clini (#379 define quién es legalmente). Responde por el cumplimiento de estas medidas (E.1.2), por el entorno productivo (C.1.1), por las destrucciones fuera de las purgas programadas (F.1.3) y por la comunicación de incidentes (G.1.1). Hoy es la misma persona que mergea a `main`.

## Cómo leer el checklist

El Anexo I separa las medidas para datos personales (**DP**) de las adicionales para datos sensibles (**DS**). Clini trata datos de salud, así que aplican las dos. Cada medida tiene uno de estos estados:

- **Cumple**: el código o la operación ya la satisfacen, con la evidencia citada.
- **Resuelta acá**: se resolvió en #358, con un cambio de código o de configuración, o con un procedimiento escrito en este documento.
- **#N**: queda abierta y la sigue ese issue. Las medidas que no son del software (el centro de datos, los medios físicos, los contratos) van a #379, los trámites del titular.

Este checklist se revisa en cada release que agregue un proveedor, un almacén de datos o una entrada de datos personales, y una vez por trimestre, aunque no haya cambios (ver [Revisión periódica](#revisión-periódica)).

## A. Recolección de datos

| Medida | Estado | Cómo |
|---|---|---|
| A.1.1 (DP) Completitud de los formularios | Cumple | Toda entrada pasa por un FormRequest (ArchTest), con su obligatoriedad repetida en zod en el panel. Ejemplos: `StorePatientRequest`, `features/patient-form/patient-schemas.ts`. |
| A.1.2 (DP) Tipo y formato claros | Cumple | `Field` + `FieldError` con mensajes en español, inputs tipados y ejemplos de formato («Ej.: 11 2345-6789»). |
| A.1.3 (DP) Exactitud del dato | Cumple | La API valida fechas (`date_format:Y-m-d`), instantes (`Iso8601Instant`, ADR 0016), enums, teléfonos E.164 y emails (`PatientContactValue`, ADR 0028), y fechas de nacimiento no futuras. |
| A.2.1 (DP) Cifrar cliente-servidor | Resuelta acá | Traefik de Dokploy termina TLS. El checklist de despliegue de [Infrastructure](infrastructure.md#https-y-cookies) exige HTTPS en cada dominio con redirección, HSTS en Traefik y URLs `https` en las variables. Las cabeceras en las apps van en #393. |
| A.2.2 (DP) Limitar la caché del cliente | Resuelta acá | Toda respuesta de la API sale con `Cache-Control: no-store, private`, salvo la que se declara `public` (el logo de la reserva) (`PreventResponseCaching`, #358). TanStack Query vive en memoria, sin persistencia. |
| A.2.2 (DP) Una sola sesión de usuario en el cliente | Cumple | `queryClient.clear()` en cada cambio de identidad (login, logout, aceptar invitación) en los dos SPAs. La sesión se regenera en el login y se invalida o regenera en el logout (ADR 0010). |
| A.2.3 (DP) Certificados de una CA | Resuelta acá | Let's Encrypt, emitido y renovado por Traefik. Es un paso del checklist de despliegue. |
| A.2.3 (DS) Cifrar API ↔ base de datos | Resuelta acá | Postgres va en el mismo servidor que la API, en la red interna de Dokploy y sin puerto publicado (checklist de despliegue), así que el tráfico no sale del host. Si sale de ese servidor: `DB_SSLMODE=require`, o `verify-full` con `DB_SSLROOTCERT` (agregada en #358) cuando cruza una red que no es privada. Ver [Infrastructure](infrastructure.md#postgres). |

## B. Control de acceso

| Medida | Estado | Cómo |
|---|---|---|
| B.1.1 (DP) Inventario de activos | Resuelta acá | [Inventario de activos](#inventario-de-activos). |
| B.1.2 (DP) Propietarios y autorizaciones | Resuelta acá | Columnas «Responsable» y «Quién accede» del inventario. |
| B.1.3 (DP) Actualizar el inventario y verificar autorizaciones | Resuelta acá | Un PR que agrega un proveedor, un almacén o una entrada de datos personales actualiza el inventario en el mismo cambio. La [revisión periódica](#revisión-periódica) verifica las autorizaciones. |
| B.2.1 (DP) Controles por sistema y superusuarios | Resuelta acá | [Superusuarios](#superusuarios) lista los de la aplicación y los de infraestructura, y el registro de su actividad. Faltan el trigger de solo agregado de `admin_audit_logs` y el segundo factor de los operadores: #392. |
| B.2.2 (DP) Notificación fehaciente de responsabilidades | #317 | Los términos y el contrato con los consultorios cubren a sus usuarios. Cada operador acepta por escrito un compromiso de confidencialidad antes de que se le cree la cuenta (`admin:create`). |
| B.2.3 (DP) Identificación inequívoca y sin usuarios genéricos | Cumple | Email único por usuario y por operador, en tablas separadas (ADR 0010). Lo clínico se atribuye a la membresía, y lo del operador a `platform_admin_id`. En producción no hay cuentas sembradas: los seeders no corren solos (`RUN_SEEDERS` es `false` por defecto) y el de operadores no hace nada en producción. La demo sí tiene cuentas compartidas, por eso no lleva datos reales ([Datos sintéticos](#datos-sintéticos-en-dev-y-demo)). |
| B.2.3 (DP) Política de contraseñas | Cumple | Una sola regla, `Password::defaults()` (`App\Support\PasswordPolicy`, #389): mínimo de 12 caracteres y ausente de las filtraciones conocidas (Have I Been Pwned, por k-anonimato), en el registro, la aceptación de invitación, el cambio, el restablecimiento y `admin:create`. Las contraseñas anteriores más cortas siguen valiendo hasta que se cambien. Hash bcrypt (12 rondas). Cada usuario clínico la cambia en Ajustes › Seguridad con la actual, y la recupera por mail con un enlace de un solo uso que vence a los 60 minutos y no abre sesión. TOTP opcional para los clínicos (ADR 0026, #357). Los operadores no tienen recuperación: el titular les reemplaza el hash en `platform_admins` a mano, con una anotación en el [registro de operación](#registro-de-operación) (el comando va en #392). |
| B.2.3 (DP) Registro de acceso y de uso | Cumple en parte, resto en #392 | El uso de la historia clínica queda en `clinical_access_logs`, de solo agregado con trigger (ADR 0022). Las búsquedas por documento quedan en `patient_lookups` (ADR 0028), y las mutaciones y logins de los operadores en `admin_audit_logs`. Falta el registro de los logins de los clínicos y de los cambios de permisos: #392. |
| B.2.3 (DP) Alta, baja y modificación de usuarios | Resuelta acá, resto en #392 | En la clínica, alta por invitación (vence a los 7 días) o registro; cambios por `PATCH memberships`; baja desactivando la membresía; bloqueo por un operador (`not-blocked`). Cada usuario puede eliminar su propia cuenta desde Ajustes › Protección de datos (#384, ADR 0034): tiene 7 días para arrepentirse ingresando de nuevo, y después se anonimiza y queda una fila sin datos personales en `account_deletions`. Los operadores se dan de alta con `admin:create` y de baja a mano en la base, que se anota en el [registro de operación](#registro-de-operación). El comando de baja va en #392. |
| B.2.3 (DP) Limitar a los superusuarios o seguir su actividad | Cumple en la app | Ningún namespace `Admin` puede usar un modelo clínico (ArchTest). De pacientes, los operadores ven solo conteos. Cada mutación suya queda en `admin_audit_logs`. El acceso de infraestructura se anota en el [registro de operación](#registro-de-operación). |
| B.2.4 (DP) Acceso físico al centro de datos | #379 | Lo da el proveedor del servidor. Se le exige al contratarlo. |
| B.2.5 (DP) Limpiar cuentas inactivas con privilegios | Resuelta acá, resto en #392 | La revisión trimestral da de baja a los operadores que no entraron en 90 días. `last_login_at` visible y el comando de baja: #392. |
| B.2.5 (DS) Una sesión concurrente | #392 | Decisión conservadora: no forzar una sola sesión (un profesional usa el escritorio y el teléfono a la vez) y ofrecer «cerrar las otras sesiones». |
| B.2.5 (DS) Cuentas con privilegios especiales diferenciadas | Cumple | Los operadores son otra identidad, con otra tabla, otro guard y otro origen (ADR 0010). En la clínica, el rol y los permisos están en la membresía. |
| B.2.5 (DS) Intentos de autenticación fallidos | Cumple en parte, resto en #392 | Throttles: `login` y `admin-login` (5 por minuto por email + IP), `two-factor-challenge` (5 por minuto por cuenta), `password-reset` (5 por minuto por email + IP y 20 por hora por IP, más uno por minuto por cuenta del broker de Laravel). Registrarlos y analizarlos: #392. |

### Inventario de activos

| Activo | Qué guarda o procesa | Categoría | Responsable | Quién accede |
|---|---|---|---|---|
| Postgres de producción | Todo el modelo (`der.dbml`): pacientes, contactos, turnos, historia clínica (su texto libre, cifrado con la maestra clínica desde #391), usuarios, logs de acceso | Identificatorios, contacto, **salud** | Titular | La API, y el titular por la terminal de Dokploy |
| Tabla `sessions` | Payload de la sesión, cifrado con `APP_KEY` desde #358; `ip_address` y `user_agent` en claro; 120 minutos | Identificatorios mínimos | Titular | La API |
| Tabla `password_reset_tokens` | Email y hash (bcrypt) del token de recuperación de contraseña; uno por email, vence a los 60 minutos y se borra al usarse, al eliminarse la cuenta o, vencido, en la limpieza diaria (`auth:clear-resets`, #389) | Contacto | Titular | La API |
| Tablas `jobs` y `failed_jobs` | Payloads de los mails en cola (cifrados si llevan datos que no son modelos) y excepciones; una semana | Contacto | Titular | La API |
| Bucket R2 (`media`) | Logos de las organizaciones; uno reemplazado o quitado sigue `MEDIA_DELETION_RETENTION_DAYS` días (35) antes de borrarse (#410) | Sin datos de pacientes | Titular | La API (token de R2) y el titular (cuenta de Cloudflare) |
| Servidor de Dokploy | Las cuatro apps, Postgres, las variables (`APP_KEY`, `CLINICAL_ENCRYPTION_KEY`, credenciales) y los logs de los contenedores | Todas | Titular y proveedor (#379) | El titular (root y panel de Dokploy) |
| Resend | Mails al paciente: recordatorio y código de acceso (ADR 0018: sin profesional, servicio ni nada clínico). Mails a usuarios: invitaciones, verificación, recuperación de contraseña (#389), avisos de plan y suscripción, y la eliminación de la cuenta (pedido, cancelación, eliminación y anulación, #384). Aviso de consultas de contacto (datos del interesado) | Contacto | Titular (DPA en #379) | La API (`RESEND_API_KEY`) |
| Mercado Pago | Suscripción de la organización | Datos del pagador | Titular | La API |
| Have I Been Pwned (Pwned Passwords) | Recibe los primeros 5 caracteres del SHA-1 de cada contraseña que se elige, nunca la contraseña ni el hash completo (k-anonimato, #389). Si no responde en 5 segundos, la contraseña pasa | Ninguno | — | La API |
| Buscador Nacional de Medicamentos | Recibe solo el término buscado, de un medicamento o de la sustancia de una alergia (ADR 0031, #383) | Ninguno | — | La API |
| Buscador Nacional de Profesionales | Recibe el DNI del profesional (ADR 0032); se guarda lo mínimo | Identificatorios del profesional | Titular | La API |
| Repositorio y GitHub Actions | Código, secrets de CI (sin datos reales) | Ninguno | Titular | Colaboradores del repo |
| Backups | Pendientes (#390) | Todas | Titular | Pendiente (#390) |
| Equipos de los consultorios | La memoria de los SPAs, sin persistencia, y los archivos de la historia que exporta el profesional (PDF o JSON, ADR 0023) | Todas | El consultorio (#317) | Sus usuarios |

### Superusuarios

Pueden saltear los controles de la aplicación:

- **Root del servidor y acceso a Postgres** (titular): puede leer todo y desactivar los triggers de solo agregado. Solo se entra para operar o diagnosticar, y cada acceso se anota en el [registro de operación](#registro-de-operación).
- **Quien tiene `APP_KEY`**: descifra la sesión, los payloads de jobs, el DNI del profesional, los secretos 2FA y los códigos de acceso. Vive solo en las variables de Dokploy. Su resguardo va en #390.
- **Quien tiene `CLINICAL_ENCRYPTION_KEY`** (la maestra clínica, #391) **y la base**: descifra el texto libre de la historia clínica. Vive solo en las variables de Dokploy, aparte de `APP_KEY`. Ver [Cifrado de la historia clínica](#cifrado-de-la-historia-clínica).
- **Quien mergea a `main`**: despliega código arbitrario. Todo cambio pasa por un PR con los 5 checks ([Control de cambios](#c-control-de-cambios)).
- **Cuentas de Cloudflare, Resend, Mercado Pago y GitHub** (titular): con segundo factor activado en cada proveedor.
- **Operadores de plataforma** (dashboard): no leen la historia clínica (ArchTest) y toda mutación suya queda registrada. Ver B.2.3.

### Registro de operación

Hasta que exista un sistema de tickets, un documento privado del titular (fuera del repo) registra con fecha, persona y motivo:

- cada acceso a la terminal del servidor o a la base;
- cada alta y baja de operadores;
- cada `user:reset-two-factor`;
- cada destrucción fuera de las purgas programadas (F.1.3);
- cada prueba de restauración (D.1.1);
- cada incidente ([protocolo](incident-response.md)).

## C. Control de cambios

| Medida | Estado | Cómo |
|---|---|---|
| C.1.1 (DP) Cambios que preservan la integridad, con registro de pruebas | Resuelta acá | Todo cambio entra por un PR a `develop` con los 5 checks requeridos (Pint y PhpStan; Prettier, ESLint y tsc; Pest; Vitest; Playwright). Las corridas de Actions quedan como registro de las pruebas. La release `develop → main` es un merge commit y despliega sola. Antes de una release que migre: backup manual (#390). Después: verificar el login y una lectura de la agenda, y anotarlo. |
| C.1.1 (DS) Responsable y procedimiento de cambios en producción | Resuelta acá | El responsable es el titular. Procedimiento: el de arriba. `entrypoint.sh` migra con `--force` y corta el arranque si una migración falla (`set -e`). |

Dos condiciones a sostener:

- **Las migraciones se editan en el lugar solo mientras no haya datos reales** (CLAUDE.md). Desde que producción tenga el primer consultorio, cada cambio de esquema es una migración nueva, porque `migrate:fresh` borraría datos.
- **El bypass del ruleset de `develop`** (rol admin, modo `always`) permite pushear sin los checks. El titular lo pasa a modo `pull_request`, como el de `main`. Es una configuración de GitHub, no del repo.

## D. Respaldo y recuperación

| Medida | Estado | Cómo |
|---|---|---|
| D.1.1 (DP) Procedimiento de resguardo, pruebas de recuperación e inventario de copias | #390 | Hoy no hay backups configurados. |
| D.1.2 (DP) Control de acceso y cifrado de las copias; pruebas aisladas y borradas | #390 | Requisitos: cifrar el dump antes de que salga del servidor, con una clave que no esté en el destino; credenciales del destino separadas de las de producción; restaurar las pruebas en un entorno aislado y borrarlo al terminar. |
| D.1.2 (DS) Protección física, otra locación, traslado | #379 y #390 | Un segundo proveedor, en otra locación (#379). Las condiciones físicas van en el contrato. |

Lo borrado en la base sigue en los backups hasta que vencen (#329 fija la retención).

## E. Gestión de vulnerabilidades

| Medida | Estado | Cómo |
|---|---|---|
| E.1.1 (DP) Análisis de amenazas | Resuelta acá | [Amenazas](#amenazas). |
| E.1.1 (DP) Mapa del flujo de información | Resuelta acá | [Flujo de datos](#flujo-de-datos). |
| E.1.1 (DP) Documento de seguridad | Resuelta acá | Este documento. |
| E.1.2 (DP) Roles y perfiles | Cumple | Roles y permisos por membresía (`MembershipRole`, `Permission`). Historia clínica por autoría y código del paciente, no por rol (ADR 0029). |
| E.1.2 (DP) Autenticación segura | Cumple en parte, resto en #392 | Sanctum SPA con cookie HttpOnly y CSRF, pines de origen (ADR 0010), throttles y TOTP opcional (ADR 0026). Cambio y recuperación de contraseña con una política única (#389): cambiarla o restablecerla cierra las otras sesiones del usuario (`AuthenticateSession` de Sanctum compara el hash), y el restablecimiento nunca abre sesión, así que el segundo factor sigue pidiéndose al ingresar. |
| E.1.2 (DP) Gestión de sesiones | Resuelta acá | La sesión se cifra en la base (`SESSION_ENCRYPT`, por defecto `true` desde #358) y ya no guarda la URL de cada GET (`StartSessionWithoutPreviousUrl`; antes guardaba búsquedas como `?q=<nombre o DNI>`). Cookie `Secure` en producción (`SESSION_SECURE_COOKIE=true`), `SameSite=Lax`, HttpOnly. Vence a los 120 minutos sin uso. Ver [Sesiones](#sesiones). |
| E.1.2 (DP) Mensajes de error | Cumple | Un solo render de errores de dominio (ADR 0009). Un error inesperado responde «Server Error» sin traza, salvo con `APP_DEBUG` (ADR 0024). Los logs no llevan datos personales (#322). `APP_DEBUG=false` es un paso del checklist de despliegue. |
| E.1.2 (DP) Reglas y alertas en servidores expuestos | #393 | Solo Traefik expone puertos. Las alertas van en #393. |
| E.1.2 (DP) Segmentar la red | Resuelta acá | Postgres y la API sin puertos publicados: solo Traefik llega a ellos, por la red de Dokploy, en la que no se despliegan terceros ([Infrastructure](infrastructure.md)). |
| E.1.2 (DP) Separar Producción, QA, Prueba y Desarrollo | Resuelta acá | [Entornos](#entornos). |
| E.1.2 (DP) Antivirus y prevención en servidores y estaciones | #379 | Servidor: lo cubre el proveedor y el endurecimiento del host. Estaciones: las de los consultorios son suyas (#317); las del titular, con el sistema actualizado y el disco cifrado. |
| E.1.2 (DP) Actualización periódica de software | Cumple en parte, resto en #393 | Imágenes y runtimes fijados por patch, con Dependabot (`docker`, `docker-compose`, `github-actions`, #349). Composer y npm: #393. |
| E.1.2 (DP) Responsable de las medidas | Resuelta acá | El titular (arriba). |
| E.1.2 (DS) Filtros de inyección en la base | Cumple | Eloquent y el query builder con bindings. Todo `whereRaw`/`selectRaw` liga los valores del usuario con `?`, y solo interpola literales del código. El `LIKE` del listado de pacientes no escapa `%` ni `_`: no es inyección, porque un `%` solo lista lo que el usuario ya ve en su organización. |
| E.1.2 (DS) Filtros de inyección en las aplicaciones | Cumple | React escapa todo. El único `dangerouslySetInnerHTML` es el CSS de `chart.tsx`, armado con constantes del código. Los mails de `app/Mail` son Blade sin Markdown. Las tres notificaciones de plan y suscripción usan `MailMessage` (Markdown) con el nombre de la organización: Blade escapa el HTML, pero un link en Markdown en ese nombre se dibuja. Solo las recibe el dueño de esa misma organización. Pasarlas a Blade va en #393. |
| E.1.2 (DS) Detección de intrusiones en la red | #393 | |
| E.1.2 (DS) Detección de intrusos y fugas en estaciones | #317 y #379 | Las estaciones son de los consultorios o del titular. |
| E.1.3 (DP) Logs para auditar incidentes | Cumple en parte, resto en #392 y #393 | Los logs de auditoría en la base (`clinical_access_logs`, `admin_audit_logs`, `patient_lookups`, `clinical_record_exports`). El log de la aplicación va a stderr en producción (`LOG_STACK=stderr`, checklist de despliegue). Conservarlo fuera del contenedor: #393. |
| E.1.3 (DP) Hora sincronizada | #379 | El host sincroniza por NTP. Se verifica al contratarlo. Todo instante se guarda en UTC (ADR 0016). |
| E.1.3 (DP) Canal para que los usuarios avisen | Resuelta acá, resto en #379 y #317 | El canal está en el [protocolo](incident-response.md#canal-de-aviso). La dirección de seguridad se define con el dominio (#379) y se publica en la landing y los términos (#317). Hasta entonces, el aviso llega por el soporte del titular. |
| E.1.3 (DP) Gestión de incidentes | Resuelta acá | El [protocolo](incident-response.md) y su planilla de registro. |
| E.1.4 (DS) Auditorías internas periódicas | Resuelta acá | [Revisión periódica](#revisión-periódica). |
| E.1.4 (DS) Auditorías externas | #379 | Una por año desde que haya consultorios pagos, a cargo del titular. |

### Amenazas

| Amenaza | Mitigación hoy | Pendiente |
|---|---|---|
| Robo de la contraseña de un usuario clínico | Throttle del login, TOTP opcional (ADR 0026), bloqueo por un operador, política de 12 caracteres sin filtraciones conocidas, y cambio y recuperación de contraseña que cierran las otras sesiones y descartan un login de dos pasos pendiente (#389) | Registro de logins (#392) |
| Un usuario de un consultorio lee los datos de otro | `organization_id` con scope global en los modelos del consultorio, el pivot `organization_patient` para los listados, policies y la historia por autoría y código (ADR 0029). Los datos personales del paciente se comparten en la plataforma a propósito (ADR 0028), pero se llega a ellos solo por documento exacto, con un límite de 30 búsquedas cada 5 minutos por usuario y una fila en `patient_lookups` por búsqueda | Alertas ante muchas búsquedas (#392) |
| XSS en un SPA que usa la sesión | React escapa, pines de origen entre el panel y el dashboard (ADR 0010) | CSP (#393) |
| CSRF | Sanctum SPA (token XSRF), `SameSite=Lax` | — |
| Volcado de la base (backup o acceso indebido, inyección SQL que lee) | Tokens guardados como hash, secretos 2FA, DNI del profesional y sesión cifrados con `APP_KEY`; el texto libre de la historia clínica, con cifrado envolvente y una maestra propia (#391, ADR 0036) | Cifrar los backups (#390) |
| Un operador de plataforma abusa de su acceso | Sin acceso a la historia (ArchTest), auditoría de sus mutaciones | Segundo factor y trigger de solo agregado (#392) |
| Abuso de los formularios anónimos (reserva, contacto, registro) | Throttles por IP y por consultorio (#299) con `TRUSTED_PROXIES` | Alertas (#393) |
| Pérdida del servidor, de `APP_KEY` o de la maestra clínica | — | Backups y resguardo de las claves (#390); sin la maestra clínica, la historia es ilegible |
| Compromiso del servidor de la app (base y maestra clínica a la vez) | Ninguna desde el cifrado: es el riesgo residual aceptado de #391 | Un KMS que no entregue la maestra (ADR 0036) |
| Datos personales en los logs | `logContext()` sin datos personales, `SafeExceptionLog`, access logs apagados (#322) | — |
| Dependencia vulnerable | Imágenes fijadas y Dependabot de imágenes | Composer y npm (#393) |

### Flujo de datos

```text
Navegador (panel, dashboard)  ──HTTPS──▶ Traefik ──▶ API (nginx + PHP-FPM) ──▶ Postgres (misma red, sin puerto público)
Navegador (reserva anónima)   ──HTTPS──▶ Traefik ──▶ API                     ──▶ R2 (logos)
Navegador (landing, SSR)      ──HTTPS──▶ Traefik ──▶ landing (Node) ··· sin datos; su formulario hace POST a la API
API ──▶ Resend ──▶ mail del paciente: consultorio, día, hora y dirección; código de acceso (ADR 0018, 0029)
API ──▶ Mercado Pago: suscripción de la organización (sin pacientes)
API ──▶ Buscador Nacional de Medicamentos: solo el término, sin el paciente (ADR 0031)
API ──▶ Buscador Nacional de Profesionales: DNI del profesional (ADR 0032)
```

Ningún dato de pacientes sale hacia un tercero salvo el mail que se le manda al propio paciente. La exportación de la historia se arma en el navegador (ADR 0023).

### Entornos

| Entorno | Datos | Quién accede |
|---|---|---|
| Producción | Reales | Los consultorios; el titular como superusuario |
| Demo / testing | Solo sintéticos (el fixture del seeder y lo que se cargue a mano para probar) | Cualquiera con las cuentas de prueba públicas |
| CI y e2e | El fixture, en un Postgres efímero | GitHub Actions |
| Desarrollo local | El fixture | Quien desarrolla |

No hay QA separado de la demo. La demo corre la imagen de producción, pero nunca comparte con producción la base, el bucket ni la `APP_KEY`.

## F. Destrucción de la información

| Medida | Estado | Cómo |
|---|---|---|
| F.1.1 (DP) Procedimiento de destrucción | #329 | Qué se borra y cuándo lo fija la retención (#329). Hoy se purgan solas las consultas de contacto cerradas (`CONTACT_RETENTION_DAYS`), los jobs fallidos (`QUEUE_FAILED_RETENTION_HOURS`), las sesiones vencidas y los archivos subidos que se reemplazaron o quitaron (`MEDIA_DELETION_RETENTION_DAYS`, `media:delete-due`, ADR 0035), y se anonimiza la cuenta de un usuario que pidió eliminarla, a los 7 días (`accounts:complete-deletions`, ADR 0034). La historia clínica es de solo agregado (ADR 0019). |
| F.1.2 (DP) Borrado irreversible | #329 | Al vencer la retención, el borrado físico de las filas. En los backups, al vencer la copia (#390). |
| F.1.3 (DP) Persona autorizada | Resuelta acá | El titular. Toda destrucción fuera de las purgas programadas requiere su autorización escrita en el registro de operación. |
| F.1.4 (DP) Inventario de medios destruidos | #379 | Lo lleva el proveedor del servidor y de los backups. Se exige en el contrato. |
| F.1.2 (DS) Descarte de medios magnéticos | #379 | Ídem: cláusula de descarte de medios en el contrato con el proveedor. |

## G. Incidentes de seguridad

| Medida | Estado | Cómo |
|---|---|---|
| G.1.1 (DP) Procedimiento y responsable de la comunicación | Resuelta acá | [Protocolo de incidentes](incident-response.md). Responsable: el titular. |
| G.1.2 (DP) Informe del incidente | Resuelta acá | La plantilla del protocolo: naturaleza, categorías de datos, afectados, mitigación y prevención, con la tabla que responde cada punto. El registro de logins, que lo completa, va en #392. |
| G.1.3 (DP) Notificación a la AAIP | Resuelta acá | El protocolo fija el destinatario (incidente.seguridad@aaip.gob.ar; Av. Pte. Gral. Julio A. Roca 710, CABA, C1067ABP) y el plazo de 72 horas. |

## H. Entornos de desarrollo

| Medida | Estado | Cómo |
|---|---|---|
| H.1.1 (DP) Enmascaramiento o disociación fuera de producción | Resuelta acá | [Datos sintéticos en dev y demo](#datos-sintéticos-en-dev-y-demo). |

### Datos sintéticos en dev y demo

**Fuera de producción no hay datos personales reales. Nunca.**

- Desarrollo, CI, e2e y la demo usan solo el fixture de `DatabaseSeeder`: literal, determinista, con nombres y documentos inventados y sin factories. Lo que se cargue a mano para probar también es inventado.
- Nunca se copia ni se restaura un dump de producción en otro entorno, ni siquiera para reproducir un bug. Si un bug depende de los datos, se reproduce con datos inventados que tengan la misma forma.
- Los fixtures grabados de terceros (`tests/Fixtures/NationalProfessionalSearch`, `NationalMedicationSearch`) se disocian antes de commitearlos: documento, nombre y matrícula inventados (ADR 0032).
- La demo es un entorno con cuentas de prueba públicas (contraseña `password`) y registro abierto: no tiene las garantías de producción y no se usa con pacientes reales. Si alguien carga datos reales ahí, se borran.
- Los seeders nunca corren solos en producción (`RUN_SEEDERS` es `false` por defecto) y el seeder de operadores no hace nada en producción. Es un riesgo aceptado que el seeder no se niegue a correr sobre una base con datos reales: `migrate:fresh --seed` es un comando manual y el protocolo de cambios no lo usa en producción.

Si alguna vez hiciera falta trabajar con datos reales fuera de producción, ese entorno pasa a tener todas las medidas de A a G (lo dice H.1.1), y se decide antes por escrito.

## Datos en reposo y cifrado de columnas

Ya cifrado en la base con `APP_KEY`:

- el DNI del profesional (`users.document_number`, ADR 0032), con el cast `encrypted`;
- el secreto y los códigos de recuperación del TOTP (ADR 0026), con el cast;
- el código de acceso del paciente (`patient_access_codes.code`, ADR 0029), con el cast;
- el payload de la sesión (desde #358), con `SESSION_ENCRYPT`;
- los payloads de los jobs con datos que no son modelos, con `ShouldBeEncrypted`.

Los tokens de invitación y de verificación de correo se guardan como `sha256`.

**Evaluación del cifrado de columnas (criterio 5 de #358).** El cast `encrypted` de Laravel usa AES-256-CBC con un IV aleatorio, así que el texto cifrado no admite `WHERE`, `UNIQUE`, índices, `ORDER BY` ni `LIKE`. Protege un volcado de la base o un backup robado sin la clave. No protege de quien tiene `APP_KEY` (el servidor, el titular).

| Dato | Uso en SQL | Decisión |
|---|---|---|
| Texto de las notas, ítems de medicación y antecedentes | Ninguno: se leen por ids y el aviso de alergias compara en PHP | **Cifrado desde #391**, con cifrado envolvente y una maestra propia: ver [Cifrado de la historia clínica](#cifrado-de-la-historia-clínica). |
| Documento del paciente | Lookup exacto, `UNIQUE (document_type, document_number)` contra duplicados en carrera, búsqueda parcial en `/pacientes` | **Queda en claro.** Cifrarlo exige un blind index (un HMAC con una clave propia) y perder la búsqueda parcial. Con unos 10⁸ DNI posibles, el HMAC se fuerza en minutos si se filtra la clave, así que solo protegería un volcado sin la clave, que ya cubre el cifrado de los backups (#390). |
| Nombre del paciente | `ILIKE` y orden alfabético del listado | **Queda en claro.** No es viable sin un motor de búsqueda aparte. |
| Contactos, dirección, nacimiento | `UNIQUE (patient_id, type, value)` en contactos; el resto no se busca | **Queda en claro** por ahora. Su exposición la cubre el cifrado de los backups y del disco. |
| Signos vitales | Numéricos | **Quedan en claro.** No son texto libre y cifrarlos les quita el tipo. |

El cifrado del disco y de los volúmenes del servidor es del proveedor (#379). R2 cifra los objetos en reposo por defecto.

### Cifrado de la historia clínica

Desde #391 ([ADR 0036](../adr/0036-cifrado-envolvente-de-la-historia-clinica.md)) el texto libre de la historia clínica se guarda cifrado con **cifrado envolvente**:

- Cada valor se cifra (AES-256-GCM) con una **clave de datos** y se guarda como `<id de la clave>:<texto cifrado>` en una columna `text` (cast `EncryptedClinicalText`, o `EncryptedClinicalList` para una lista).
- Hay una sola clave de datos, en `clinical_encryption_keys`, cifrada con la **maestra** (`CLINICAL_ENCRYPTION_KEY`), que no es `APP_KEY`. Esa tabla es la única de la historia que admite `UPDATE`.
- La maestra solo la usa `App\Contracts\KeyManagementService` para cifrar o descifrar la clave de datos. Hoy la da el entorno (`EnvKeyManagementService`).
- Sin la maestra no se escribe ni se lee nada clínico, y migrar falla: nunca se guarda en claro. La clave pública de `.env.example`, `phpunit.xml` y e2e (solo datos sintéticos) la rechaza producción.

**Columnas cifradas:**

- `clinical_note_versions.body` y `reason`, `clinical_note_annulments.reason`;
- `prescription_items.medication`, `presentation`, `dosage`, `gtin`, `snomed` y `substances` (un JSON cifrado, ya no `jsonb`), `prescription_versions.reason`, `prescription_annulments.reason`;
- `medical_history_entry_versions.description`, `reaction`, `approximate_date` y `reason`, `medical_history_entry_withdrawals.reason`;
- `blood_type_records.reason`, `vital_sign_versions.reason`, `vital_sign_annulments.reason`;
- `clinical_access_logs.reason_detail` (las palabras del profesional al declarar un acceso excepcional).

**Quedan en claro**, y por qué:

- Los valores de `vital_signs`: son numéricos, y cifrarlos les quita el tipo.
- `severity`, `blood_type`, `dispensing_condition`, `control_mark`, la categoría del antecedente y el motivo (`reason`) del acceso excepcional: son enums, sin texto libre.
- Los diagnósticos CIE-10 (`clinical_note_diagnoses`): son una copia del catálogo, no texto libre, y #391 no los incluye. Revelan el diagnóstico, así que quedan anotados como candidatos a una próxima ronda.
- Los ids, las fechas, los autores y los vínculos (turno, paciente, organización): la historia se lee por ellos.
- El documento, el nombre y los contactos del paciente: ver la tabla de arriba.

Nada de lo cifrado se busca, se ordena ni se agrupa en SQL. Una columna clínica de texto libre nueva usa el mismo cast, y su test de lectura cruda se suma a `ClinicalEncryptionAtRestTest`.

**Riesgo residual aceptado.** El cifrado protege un robo de la base, un backup filtrado o una inyección SQL que solo lee, porque la maestra no está en la base. No protege de quien compromete el servidor de la app: ahí están la base y la maestra a la vez. Lo cubriría un KMS que nunca entregue la maestra (ver abajo). Tampoco de una inyección que inserta filas y además tiene una cuenta de profesional: el texto cifrado no está atado a su fila, y podría copiar el de otro paciente en un registro propio. Atarlo queda para un issue aparte.

**Rotar la maestra** (si se filtró o por calendario):

1. Generar una nueva con `php artisan clinical-keys:generate-master --show`.
2. En Dokploy, poner la nueva en `CLINICAL_ENCRYPTION_KEY` y la vieja en `CLINICAL_ENCRYPTION_PREVIOUS_KEYS`, y redesplegar.
3. Correr `php artisan clinical-keys:rotate` en el contenedor de la API. Vuelve a cifrar la clave de datos con la nueva en una sola transacción: si falla a mitad, la clave queda como estaba. Las fichas no se tocan: el trigger de solo agregado impide volver a cifrarlas, y no hace falta.
4. Quitar `CLINICAL_ENCRYPTION_PREVIOUS_KEYS` y redesplegar. Con la maestra vieja, la clave de datos guardada ya no se descifra.
5. Anotarlo en el [registro de operación](#registro-de-operación).

**Resguardo fuera de línea.** La maestra vigente se guarda también fuera del servidor: perderla es perder la historia. La maestra retirada sale del servidor y se guarda fuera de línea **solo mientras duren los backups anteriores a la rotación**, porque esos backups traen la clave de datos cifrada con ella. Después se destruye. El procedimiento va con los backups (#390).

**Camino a un KMS.** Un KMS (OpenBao, u otro) entra como otro adaptador de `KeyManagementService`. La migración es como una rotación: se descifra la clave de datos con la maestra del entorno y se vuelve a cifrar con el KMS. La historia no se toca.

**Rotar la clave de datos** queda fuera de alcance: implicaría volver a cifrar la historia, que el trigger impide. Si alguna vez hiciera falta, una clave de datos nueva convive con la vieja (cada valor nombra la suya).

**`APP_KEY` pasa a ser crítica:** si se pierde, todo lo de arriba queda ilegible. Rotarla sin `APP_PREVIOUS_KEYS` invalida las sesiones y los links `/turno/<token>` y deja ilegible lo cifrado. Con `APP_PREVIOUS_KEYS` se sigue leyendo lo viejo (ver el [protocolo](incident-response.md) si la clave se filtró). Su resguardo fuera del servidor va en #390.

## Sesiones

- **Dónde**: tabla `sessions` (`SESSION_DRIVER=database`). Las filas vencidas las borra la lotería de GC de Laravel. `ip_address` y `user_agent` quedan en claro: el cifrado cubre solo el payload.
- **Qué guarda**: el token CSRF, el id del usuario clínico y el del operador, un HMAC del hash de la contraseña de cada guard y, mientras espera el código, el login pendiente del TOTP. Desde #358, nada más: Laravel guardaba la URL completa de cada GET que no fuera ajax, y los SPAs (axios) no mandan `X-Requested-With`, así que quedaba la última búsqueda (`/patients?q=…`). `StartSessionWithoutPreviousUrl` lo apaga.
- **Cifrado**: `SESSION_ENCRYPT` es `true` por defecto (`config/session.php`). Activarlo sobre sesiones existentes las descarta una vez: Laravel no puede descifrar el payload viejo, arranca una sesión vacía y todos vuelven a iniciar sesión (ver [Infrastructure](infrastructure.md#https-y-cookies)).

## Revisión periódica

Una vez por trimestre, y en cada release que agregue un proveedor, un almacén o una entrada de datos personales, el titular:

1. recorre este checklist y actualiza los estados (los issues cerrados pasan a «Cumple»);
2. revisa el inventario y los superusuarios;
3. da de baja a los operadores que no entraron en 90 días o que ya no operan;
4. revisa los accesos excepcionales a la historia y una muestra de `admin_audit_logs`;
5. verifica que haya backups y la fecha de la última prueba de restauración (#390);
6. guarda la revisión (fecha, hallazgos y acciones) en el registro de operación.
