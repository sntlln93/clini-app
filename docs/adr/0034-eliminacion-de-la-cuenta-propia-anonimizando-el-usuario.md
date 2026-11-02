# ADR 0034: La cuenta propia se elimina anonimizando al usuario, con 7 días para arrepentirse

## Estado

Aceptado (#384).

## Contexto

La Ley 25.326 (art. 16) le da a cada usuario del consultorio el derecho a pedir la supresión de sus datos. Hasta ahora no había cómo hacerlo desde el panel. Borrar la fila de `users` no es posible ni deseable:

- `memberships.user_id` es `restrictOnDelete`, y cada registro clínico apunta a su autor por la membresía (`membership_id`), que se lee con `withTrashed()` aunque la membresía esté desactivada.
- La historia clínica es de solo agregado (ADR 0019) y la ley obliga a conservarla diez años con la identificación de quien la firmó (Ley 26.529, art. 18). La misma Ley 25.326 (art. 16.5) exceptúa de la supresión lo que hay que conservar por obligación legal.
- Los registros de acceso y auditoría (`clinical_access_logs`, `clinical_record_exports`, `patient_lookups`, `admin_audit_logs`) también son de solo agregado.

## Decisión

**Se anonimiza la fila, no se borra.** Al completarse la eliminación (`CompleteAccountDeletionAction`, desde `accounts:complete-deletions`, cada hora):

- El email pasa a `cuenta-eliminada:<id>`: único y sin `@`, así que la regla `email` de cada formulario que escribe uno (registro, invitación, login) lo rechaza. Nadie puede tomarlo antes (una dirección `.invalid` sí pasaba esa regla y habría trabado la eliminación con el índice único) y ningún mail llega a esa dirección. La dirección original queda libre para registrarse de nuevo.
- Se borran la contraseña (se reemplaza por un hash aleatorio), el remember token, la verificación del email, el segundo factor y sus códigos, el DNI, el motivo de bloqueo, las matrículas, las especialidades del usuario (y por cascada las de cada consultorio), los links públicos (`memberships.slug`), las invitaciones pendientes a esa dirección y los tokens de restablecimiento. En las invitaciones aceptadas, la dirección pasa a la anónima.
- **El nombre se conserva solo si la persona es autora de algún registro clínico** (notas, medicación, mediciones, grupo sanguíneo, antecedentes, sus versiones y anulaciones, bajo cualquiera de sus membresías). Si no, pasa a «Usuario eliminado».
- Los registros de acceso y auditoría se conservan. `clinical_access_logs`, `clinical_record_exports` y `patient_lookups` guardan ids. `admin_audit_logs` guardaba además el email del usuario en `metadata.subject_label` (bloqueo, desbloqueo y verificación manual del email): esa etiqueta pasa a la dirección anónima. El motivo que escribió el operador se conserva, porque es su justificación de lo que hizo.
- Queda una fila en `account_deletions` (solo agregado: id del usuario y fecha), que no guarda ningún dato personal.
- No hay campo de foto de usuario hoy. Si se agrega uno, va en la lista de lo que se borra.

**Hay 7 días de gracia, y volver a ingresar los cancela.** Al pedirla (`POST /me/account-deletion`, con la contraseña y el segundo factor si está activo):

- Se desactivan todas las membresías con la misma lógica que `DeactivateMembershipAction` (incluido `SyncSubscriptionAmountJob`), así no entran turnos nuevos durante la gracia. La solicitud guarda cuáles desactivó y en qué estado estaban (`account_deletion_request_memberships`).
- Se cierran todas las sesiones. Las otras sesiones se cierran recalculando el hash de la misma contraseña (`logoutOtherDevices`), que Sanctum detecta en `AuthenticateSession`. La columna `sessions.user_id` no sirve para esto (ADR 0010).
- Se manda un mail con la fecha y cómo cancelarla.

Cualquier login completo del guard `web` la cancela (`CancelAccountDeletionOnLogin`, que escucha el evento `Login`). Eso incluye el segundo paso del 2FA y los logins de la invitación y de la verificación del email. Se reactivan exactamente las membresías que la solicitud desactivó, con sus roles y su estado anterior. Las que ya estaban desactivadas antes siguen así, y un link público que otro tomó en esos días vuelve vacío. Una membresía de profesional cuyo consultorio ocupó en esos días el último lugar que su plan permite no vuelve: pasarse del límite dejaría al consultorio entero sin poder escribir (409 `plans.professional_limit_exceeded`), y un solo usuario no tiene que poder causar eso. Cada cancelación manda un mail, porque varios caminos de ingreso (la invitación, la verificación del email) no tienen dónde mostrarlo, y porque avisa si quien ingresó no fue el titular.

Un segundo pedido de la misma cuenta mientras hay uno pendiente responde ese mismo pedido. Un login cuya contraseña se verificó justo mientras se completaba la eliminación no abre sesión: responde 401.

**Lo que bloquea el pedido se resuelve antes, no se resuelve solo.** Se responde 409 si la persona es la última dueña o admin activa de algún consultorio (`account.deletion_last_active_admin`) o si tiene turnos por atender como profesional (`account.deletion_future_appointments`: agendados, confirmados o con el paciente presente, que todavía no terminaron). Cada código trae los consultorios en el contexto, para que el panel diga dónde resolverlo. No se cancelan turnos ni se transfiere un consultorio automáticamente. Si al vencer el plazo una membresía volvió a estar activa y choca con un bloqueo, la eliminación no corre: la solicitud se anula, las membresías vuelven y se avisa por mail.

## Alternativas descartadas

- **Borrar la fila de `users`.** Rompería la autoría de la historia clínica, que la ley obliga a conservar identificada, y los registros de solo agregado que apuntan a la membresía.
- **Anonimizar siempre el nombre.** Dejaría registros clínicos sin la identificación del profesional que los firmó. Conservarlo solo para quien escribió en una historia es lo mínimo que exige la ley.
- **Borrar al instante.** Un pedido hecho por error, o desde una sesión ajena, sería irreversible. Una gracia corta, que se cancela solo con ingresar, se puede acortar después sin migrar datos.
- **Cancelar los turnos o transferir el consultorio automáticamente.** Le cambiaría la agenda a pacientes y colegas sin que nadie lo decida. Es el mismo criterio que el aviso de #286.
- **Cerrar las sesiones borrando filas de `sessions` por `user_id`.** ADR 0010: esa columna es informativa y puede ser la de un operador.

## Consecuencias

- La supresión de los datos de un paciente es otro tema (sus datos son compartidos, ADR 0028), y también lo son transferir o dar de baja un consultorio y la retención (#329).
- El equipo de Clini no elimina cuentas ni cancela solicitudes desde el dashboard. Un operador ve la cuenta anonimizada como cualquier otra.
- Todo camino nuevo que inicie la sesión de un clínico con `login()` cancela la solicitud solo, por el evento. Uno que no use `login()` tiene que llamar a `CancelAccountDeletionAction`.
