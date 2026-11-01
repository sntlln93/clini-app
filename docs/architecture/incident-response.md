# Protocolo de incidentes de seguridad

Qué hacer cuando un incidente puede afectar datos personales de Clini: detección, contención, evidencia, aviso y cierre. Responde a las medidas E.1.3 y G de la Res. AAIP 47/2018 (ver [Seguridad](security.md)).

La Ley 25.326 no obliga a notificar brechas, pero la AAIP lo recomienda (Res. 47/2018, G.1.3) y los proyectos de reforma piden 72 horas. Este protocolo adopta ese plazo como objetivo.

## Qué es un incidente

Cualquier evento, confirmado o sospechado, que comprometa la confidencialidad, la integridad o la disponibilidad de los datos que guarda Clini. Algunos ejemplos:

- acceso indebido a la base, al servidor, a Dokploy o a una cuenta de proveedor (Cloudflare, Resend, GitHub);
- un usuario que ve datos de otro consultorio, o un bug que expone datos;
- filtración de `APP_KEY`, de credenciales o de un backup;
- una cuenta clínica o de operador comprometida;
- un mail con datos enviado a quien no correspondía;
- pérdida de datos o caída prolongada sin backup del que restaurar.

Un intento bloqueado (un pico de logins fallidos que frenó el throttle) es un **evento**: se anota en el registro de operación, pero no dispara el protocolo salvo que haya indicios de que alguien entró.

## Roles

- **Responsable del incidente y de la comunicación**: el titular de Clini (Res. 47/2018, G.1.1). Decide la contención, redacta el informe y firma los avisos.
- **Consultorios afectados**: deciden sobre los datos de sus pacientes. Clini les avisa y les da lo necesario para que avisen a sus pacientes. El reparto formal de obligaciones va en el contrato (#317).

## Canal de aviso

Cualquiera puede avisar un problema de seguridad (un usuario de un consultorio, un paciente, un investigador) por el formulario de contacto de la landing, o escribiendo a la dirección de seguridad de Clini (la define el titular junto con el dominio, #379, y se publica en la landing y en los términos, #317). El titular acusa recibo en el día hábil siguiente.

## Pasos

El reloj de las 72 horas arranca cuando el titular **confirma** que el incidente afecta datos personales. Todo se anota en la planilla del incidente (abajo) a medida que pasa, con fecha y hora.

### 1. Detección y triage (en el día)

1. Abrir la planilla del incidente.
2. Confirmar si es un incidente: qué pasó, desde cuándo, qué sistemas toca.
3. Estimar el alcance inicial: qué consultorios, qué categorías de datos (identificatorios, de contacto, de salud), cuántos titulares.

Fuentes para estimarlo:

| Pregunta | Dónde mirar |
|---|---|
| Quién leyó o escribió historia clínica | `clinical_access_logs` (por paciente, membresía, acción y fecha) |
| Qué se exportó | `clinical_record_exports` |
| Qué hizo un operador | `admin_audit_logs` (incluye logins e IP) |
| Quién buscó pacientes por documento | `patient_lookups` (sin el documento) |
| Sesiones activas | `sessions` (`ip_address`, `user_agent`, `last_activity`; el payload está cifrado, y `user_id` es el del último guard que tocó la sesión) |
| Errores de la aplicación | Logs del contenedor de la API en Dokploy (stderr) |
| Mails enviados | Panel de Resend |

### 2. Contención (en cuanto se confirma)

Lo que corresponda al caso, de menor a mayor impacto:

- **Una cuenta clínica comprometida**: bloquear al usuario desde el dashboard. El bloqueo corta sus sesiones en el próximo pedido (`not-blocked`). Hasta #389 no hay cambio ni recuperación de contraseña, así que desbloquearlo le devuelve el acceso a quien tenga la contraseña: el usuario queda bloqueado hasta que el titular le reemplace el hash a mano, con una anotación en el registro de operación. Si tiene TOTP, `php artisan user:reset-two-factor <email>`, una vez verificada su identidad.
- **Una cuenta de operador**: reemplazar su `password` en `platform_admins` por un hash inutilizable. La fila no se puede borrar si ya tiene auditoría, y la tabla no tiene estado: la baja real va en #392. Después, cerrar todas las sesiones (abajo). `sessions.user_id` no sirve para encontrar las suyas: guarda el id del guard que tocó la sesión por última vez, y un mismo navegador comparte una sesión entre el panel y el dashboard (ADR 0010). Se anota en el registro de operación.
- **Cerrar todas las sesiones**: `TRUNCATE sessions` desloguea a todos.
- **Credenciales filtradas** (R2, Resend, Mercado Pago, base): rotarlas en el proveedor y en las variables de Dokploy, y redeploy.
- **`APP_KEY` filtrada**: generar una nueva, mover la vieja a `APP_PREVIOUS_KEYS` para seguir leyendo lo cifrado, redeploy y `TRUNCATE sessions`. Mientras la clave filtrada siga en `APP_PREVIOUS_KEYS`, quien la tenga puede seguir armando links `/turno/<token>` válidos y descifrar lo que esté cifrado con ella. Por eso se recifran cuanto antes las columnas con el cast `encrypted` (`users.document_number`, `two_factor_secret`, `two_factor_recovery_codes`, `patient_access_codes.code`) y después se saca la clave vieja, lo que invalida los links `/turno/<token>` emitidos antes.
- **Un bug que expone datos**: revertir el deploy o desactivar la ruta. Un fix urgente pasa igual por un PR con los checks.
- **Servidor comprometido**: modo mantenimiento (`php artisan down`), aislar el servidor y restaurar en uno limpio desde el último backup sano (#390). Con `APP_MAINTENANCE_DRIVER=file` (el default), el modo mantenimiento es un archivo dentro del contenedor de la API: recrearlo o redeployar lo apaga, así que se repite después de cada redeploy durante el incidente. Solo afecta a la API: los SPAs siguen arriba y muestran errores.

### 3. Preservación de evidencia (antes de limpiar)

Antes de borrar, reinstalar o rotar algo que destruya evidencia:

- exportar las filas relevantes de los logs de auditoría (`clinical_access_logs`, `admin_audit_logs`, `patient_lookups`, `sessions`) y los logs de los contenedores;
- si el servidor está comprometido, un snapshot del disco a través del proveedor;
- guardar todo cifrado, fuera del servidor, con su hash (`sha256sum`) anotado en la planilla. Lo que se copia tiene datos personales: se guarda con el mismo cuidado que un backup y se borra al cerrar el incidente, salvo que haga falta para una actuación legal.

### 4. Aviso a los consultorios (dentro de las 72 horas)

Un mail del titular a los dueños de cada organización afectada (los `owner` activos; el dashboard muestra los miembros de cada organización). Lleva:

- qué pasó y cuándo, en lenguaje claro;
- qué datos de su consultorio se vieron afectados y de cuántos pacientes;
- qué hizo Clini para contenerlo y qué va a hacer;
- qué conviene que hagan ellos (avisar a sus pacientes; hasta #389 no pueden cambiar la contraseña, así que Clini bloquea las cuentas comprometidas);
- un contacto para dudas.

Si no se sabe todavía el alcance completo, se avisa igual dentro del plazo con lo que se sabe y se completa después. El envío masivo es manual hasta que haga falta otra cosa.

### 5. Aviso a la AAIP (dentro de las 72 horas, si afecta datos personales)

Res. 47/2018, G.1.3: se envía el informe (abajo) a **incidente.seguridad@aaip.gob.ar** (o por correo a Av. Pte. Gral. Julio A. Roca 710, CABA, C1067ABP). Lo envía el titular de Clini, coordinado con los consultorios afectados para que no haya avisos contradictorios. Ante la duda sobre si corresponde, se avisa.

### 6. Aviso a los titulares de los datos

Cuando el incidente puede perjudicar a los pacientes o a los usuarios (siempre que haya datos de salud expuestos, credenciales o documentos), se les avisa. A los pacientes les avisa su consultorio, con el texto y los datos que le da Clini. Si el consultorio no puede o no responde, Clini avisa directo con lo que tenga. A los usuarios de los consultorios y a los operadores les avisa Clini.

El aviso a un paciente sigue ADR 0018: no menciona al profesional, el servicio ni nada clínico en el mail. Dice qué tipo de dato se vio afectado y a quién preguntar.

### 7. Cierre y aprendizaje (dentro de las dos semanas)

1. Completar el informe con las medidas para evitar que se repita.
2. Abrir los issues que salgan y enlazarlos en el informe.
3. Actualizar el checklist de [Seguridad](security.md) si cambió un estado.
4. Borrar la evidencia copiada que ya no haga falta y anotarlo.

## Informe del incidente

Contenido mínimo de la Res. 47/2018 (G.1.2), que es también lo que se manda a la AAIP:

1. **Naturaleza del incidente**: qué pasó, cómo se detectó, fechas de inicio, detección y contención.
2. **Categorías de datos afectados**: identificatorios, de contacto, de salud, credenciales.
3. **Afectados**: consultorios, cantidad de titulares, usuarios. Sin listar datos personales en el informe: los ids internos alcanzan.
4. **Medidas para mitigarlo**.
5. **Medidas para evitar futuros incidentes**, con sus issues.

## Planilla del incidente

Una por incidente, en el registro de operación del titular (fuera del repo, porque puede tener datos personales):

| Campo | |
|---|---|
| Id y título | |
| Detectado (fecha y hora, por quién, cómo) | |
| Confirmado (fecha y hora): arranca el plazo de 72 horas | |
| Sistemas y activos afectados | |
| Consultorios y titulares afectados | |
| Cronología de acciones (fecha, hora, quién, qué) | |
| Evidencia guardada (qué, dónde, hash) | |
| Aviso a consultorios (fecha y destinatarios) | |
| Aviso a la AAIP (fecha y medio) | |
| Aviso a titulares (fecha y medio) | |
| Cierre (fecha, issues abiertos) | |
