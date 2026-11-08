# ADR 0037: Registros de la historia clínica fuera de un turno

## Estado

Aceptado (#382). Cambia la regla de #360 y del ADR 0019 según la cual un registro clínico se hace siempre sobre un turno propio.

## Contexto

Hasta ahora cada registro de la historia (notas, medicación indicada, mediciones, grupo sanguíneo, alergias y antecedentes) colgaba de un turno propio del profesional, y la ficha del paciente solo ofrecía agregarlos con un turno de hoy. Algunos registros no nacen de una consulta: un resultado de laboratorio que llega días después, una alergia que el paciente avisa por teléfono, una indicación ajustada después de la consulta o un antecedente que se carga al pasar la historia a Clini. Para cargarlos había que inventar un turno.

## Decisión

**Quien atiende al paciente agrega registros sin turno**, desde su ficha, por rutas del paciente: `POST /patients/{id}/clinical-notes`, `…/prescriptions`, `…/vital-signs`, `…/blood-types` y `…/medical-history-entries`. El formulario de medicación lee las alergias vigentes con `GET /patients/{id}/allergies`.
- **La base para escribir es la misma que para leer:** `ClinicalAccess::attends` en la organización actual (policy `createForPatient`) y, además, un turno propio dentro de `ClinicalAccess::WINDOW_DAYS` o un acceso excepcional abierto. Si falta eso, la API responde 409 `clinical_access.reason_required` (`ClinicalAccess::ensureOpenToWrite`, en cada Action, antes de cualquier otra regla: en la medicación, antes del aviso de alergias). Quien nunca atendió al paciente recibe 403, aunque declare un acceso excepcional. Ningún rol escribe por sí mismo.
- **El turno es contexto, no la base.** Con un turno propio hoy, la ficha sigue registrando sobre ese turno, como antes. Sin él, registra fuera de un turno. Una base futura, como la interconsulta, se suma a la regla sin tocar el esquema.
- **El paciente sale de la ruta y la organización, de la membresía actual**, nunca del pedido. La fecha es la de carga (`created_at`, `issued_at`, `measured_at`). La fecha de un estudio, si importa, va en el texto.
- **Los planes y la suscripción no cambian:** la medicación sigue detrás de `plan.feature:prescriptions` y toda escritura, detrás de `subscription.active`. El aviso de alergias (ADR 0030) y la regla de lectura (ADR 0029, `readableBy` y código del paciente) se aplican igual.

**La marca es el turno nulo.** `appointment_id` pasa a aceptar nulo en `clinical_notes`, `prescriptions`, `vital_signs`, `blood_type_records` y `medical_history_entries`, en las migraciones que crean cada tabla (se editan en el lugar hasta salir a producción). La columna se conserva: arma la vista por turno de la agenda y la agrupación de la exportación. La fila de `clinical_access_logs` del alta copia ese nulo, así que la marca queda en el registro y en el log sin acciones nuevas en `ClinicalAccessAction`.
- **Integridad:** las FK compuestas `(appointment_id, patient_id)` y `(appointment_id, organization_id)` se mantienen. Postgres no las controla mientras `appointment_id` es nulo (`MATCH SIMPLE`), y `organization_id`, `patient_id` y `(membership_id, organization_id)` siguen con sus propias FK. En un registro hecho en un turno siguen garantizando que el paciente es el del turno (#360). El trigger `appointments_clinical_patient_frozen` no cambia.

**Dónde se ve:**
- **Historia del panel:** « · Fuera de un turno» junto a la fecha de cada registro.
- **Registro de accesos:** el alta sin turno se lee, por ejemplo, «Escribió una nota · Fuera de un turno». Las lecturas, las exportaciones y las enmiendas sin turno no llevan la marca.
- **Exportación:** la JSON trae un grupo propio, `outside_appointments` (notas, medicación y mediciones), y antecedentes con `appointment_id` nulo. El PDF agrega la sección «Fuera de un turno» después de los turnos (no aparece si no hay nada) y marca los antecedentes.

## Alternativas descartadas

- **Sacar la columna `appointment_id`.** Se pierde la vista por turno, la agrupación de la exportación y la marca sin agregar nada nuevo.
- **Acciones nuevas en el log** (`note_written_outside_appointment`, etc.). Duplican cada acción de alta, y el turno nulo ya dice lo mismo.
- **Dejar escribir con `attends` solo, sin ventana ni acceso excepcional.** Escribir en la historia sin un turno cerca expone tanto como leerla. La regla más estricta, igual a la de lectura, se puede relajar después sin migrar datos.
- **Dejar elegir la fecha del registro.** Sería un dato clínico más, con su propia validación, y abriría la puerta a fechar registros hacia atrás. Queda fuera de alcance. Si hace falta, se suma una columna nula.
- **Marcar también las enmiendas y anulaciones sin turno.** Ya funcionaban sin turno: quedan como hoy (#382, fuera de alcance).

## Consecuencias

- La ficha ofrece «Agregar», «Registrar» o «Cambiar» en cada bloque de la historia mientras está abierta y la práctica puede escribir. El texto «cuando tengas un turno con este paciente hoy» desaparece.
- Enmendar un registro hecho fuera de un turno usa los mismos diálogos de la agenda, con un turno nulo: no listan nada por turno y la enmienda va a la ruta del registro.
- Un registro nuevo de la historia sigue el mismo patrón: su tabla acepta `appointment_id` nulo, y su alta tiene la ruta del paciente y la llamada a `ensureOpenToWrite`.
