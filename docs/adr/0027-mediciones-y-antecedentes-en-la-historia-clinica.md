# ADR 0027: Mediciones y antecedentes en la historia clínica, atados a un turno

## Estado

Aceptado (#361). Extiende el ADR 0019 (solo agregado), el ADR 0021 (exportación) y el ADR 0022 (registro de accesos) a dos registros nuevos.

## Contexto

La historia clínica tenía notas (con diagnósticos CIE-10) y medicación indicada. Faltaban datos estructurados: las **mediciones** de cada consulta (peso, talla, presión, temperatura…) y los **antecedentes** de la persona (grupo sanguíneo, alergias y antecedentes personales, familiares y quirúrgicos). El triage de #361 fijó el qué: registro propio y no dentro de la nota, de solo agregado, con autor, con el acceso de notas y medicación y dentro de la exportación. Quedaban por definir varias cosas: cómo se enmienda un grupo sanguíneo, a qué se ata un antecedente que es de la persona y no de una consulta, y en qué se distingue «ya no vigente» de una anulación.

## Decisión

**Todo registro clínico nuevo va atado a un turno propio**, mediciones y antecedentes por igual. El turno da el `patient_id` del lado del servidor, con la misma FK compuesta `(appointment_id, patient_id)` de #360. También da la organización y el profesional. Un antecedente es de la persona, pero se registra en una consulta: el turno dice dónde y cuándo se supo. Así, las reglas de acceso (`ClinicalAccess::attends`, la ventana de 7 días, el acceso excepcional), el trigger `appointments_clinical_patient_frozen` y la purga del seeder cubren los registros nuevos sin casos especiales. El panel registra en el turno propio de hoy, como la medicación.

**Mediciones** (`vital_signs`, `vital_sign_versions`, `vital_sign_annulments`):
- Once datos, todos opcionales pero al menos uno, con rangos plausibles: un valor fuera de rango responde 422. El IMC no se guarda: la API lo calcula con el peso y la talla de la misma versión.
- Una **enmienda** corrige la misma medición con una versión nueva, y `measured_at` no cambia. Una medición nueva es un punto nuevo de la serie.
- La **anulación** pide un motivo, como la de una nota. Saca la medición de la serie y del gráfico, pero la deja en la historia.

**Grupo sanguíneo** (`blood_type_records`): una fila por valor registrado, y el vigente es el último. Cambiarlo es registrar uno nuevo, con un motivo opcional, y los anteriores quedan con su autor. Repetir el valor vigente responde 409 `medical_history.blood_type_unchanged`. No tiene versiones ni anulación: el historial de valores ya es su historial de enmiendas.

**Alergias y antecedentes** van en una sola tabla (`medical_history_entries`), con su categoría: `allergy`, `personal`, `family` o `surgical`. Las versiones (`medical_history_entry_versions`) guardan la descripción, que en una alergia es la sustancia. Solo una alergia lleva reacción y severidad, y solo un antecedente lleva fecha aproximada, como texto libre («2015», «en la infancia»). La API rechaza al registrar lo que la categoría no lleva (422). Una enmienda no lee la entrada antes de autorizar, así que la Action descarta esos campos. La categoría no se enmienda.

**«Ya no vigente» es una baja, no una anulación** (`medical_history_entry_withdrawals`). Una alergia que se fue no es un error, así que el motivo es opcional. La baja no se deshace, y una entrada dada de baja ya no se enmienda (409 `medical_history.withdrawn`). El panel la muestra en gris («Ya no vigente»), no en el rojo de «Anulada».

**Quién escribe:** solo el profesional del turno registra, y solo el autor enmienda, anula o da de baja (`VitalSignPolicy`, `MedicalHistoryEntryPolicy`). Leer la historia no da derecho a modificarla. En todos los planes, como las notas: solo se exige la suscripción activa.

**Lectura, registro de accesos y exportación:** `GET /patients/{id}/vital-signs` y `GET /patients/{id}/medical-history` siguen la regla de lectura de las notas y la medicación, con todos los autores de la organización (#359). Cada lectura y cada escritura dejan su fila en `clinical_access_logs`, con acciones y columnas propias (`vital_sign_id`, `blood_type_record_id`, `medical_history_entry_id`). La exportación lleva las mediciones bajo su turno y los antecedentes junto a los datos del paciente, con cada versión, anulación y baja.

## Alternativas descartadas

- **Antecedentes sin turno, solo con el paciente.** Exigiría otra regla de acceso para escribir (¿quién puede, si no hay turno?) y dejaría fuera de la FK de #360 y del trigger de paciente congelado justo los datos más sensibles. Se puede relajar después sin migrar datos, porque el turno ya queda guardado.
- **Grupo sanguíneo con versiones y anulación, como una nota.** Solo enmendaría su autor, y un colega que tiene el resultado de un análisis nuevo no podría corregirlo. Registrar el valor nuevo cubre el caso y deja el historial completo.
- **Una tabla por alergias y otra por antecedentes.** Tienen el mismo ciclo de vida (versión, enmienda, baja) y solo difieren en dos campos. Si las alergias necesitan más estructura (por ejemplo, un catálogo de sustancias para #362), una columna nula se suma sin migrar datos.
- **Anular un antecedente con motivo obligatorio.** Confundiría «fue un error» con «ya no aplica». El motivo opcional de la baja cubre los dos casos.
- **Guardar el IMC.** Sería un dato derivado que puede quedar desalineado de su versión.
- **Tomar la talla de otra medición para el IMC.** Mezclaría consultas distintas sin que el profesional lo vea. El panel solo muestra el IMC cuando la misma medición tiene peso y talla.

## Consecuencias

- Un registro clínico nuevo agrega su tabla a `reject_clinical_appointment_patient_change()`, reutiliza `reject_clinical_record_change()` y se borra en la purga del seeder.
- Las alergias quedan listas para el aviso de #362, y las mediciones para las curvas de #363.
- Cuando el alcance pase de la organización al paciente (#364), estos registros siguen la misma regla que las notas y la medicación.
