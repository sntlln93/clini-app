# ADR 0025: Anulación de la medicación indicada, con motivo obligatorio

## Estado

Aceptado (#344). Revierte la alternativa que el ADR 0019 había descartado («Permitir anular la medicación indicada»).

## Contexto

La medicación indicada (CU-53) es de solo agregado (ADR 0019): se corrige con una enmienda, pero no había forma de decir que una indicación ya no vale. Enmendar los ítems no sirve, porque la indicación sigue figurando como vigente. Hay dos casos típicos: el tratamiento terminó o se suspendió, o se indicó por error (por ejemplo, al paciente o en el turno equivocado).

## Decisión

**El autor anula la medicación indicada** (`POST /prescriptions/{id}/annulment`) desde el turno en la agenda o desde la ficha del paciente, igual que anula una nota:
- **Solo pide el motivo**, obligatorio, de 3 a 500 caracteres, los mismos límites que la anulación de una nota. Sin motivo, la API responde 422. El motivo es el que explica en la historia por qué ya no vale, sea porque terminó o porque fue un error.
- Solo el autor anula (`PrescriptionPolicy::annul`), como solo él enmienda.
- Una medicación anulada ya no se enmienda ni se vuelve a anular: la API responde 409 `prescriptions.annulled`, decidido en la Action con la fila bloqueada.
- Sigue las mismas restricciones que registrar y enmendar: suscripción activa y plan con medicación indicada (`plan.feature:prescriptions`).

**La anulación es de solo agregado**, como el resto de la historia: una fila de `prescription_annulments` por medicación, con su autor, el motivo y la fecha. Su trigger reutiliza `reject_clinical_record_change()`, así que su migración se revierte antes que la de solo agregado, y la purga del seeder la borra antes que las versiones.

**Se muestra como una nota anulada.** En la agenda y en la ficha lleva la marca «Anulada», la fecha y el motivo, y sus ítems quedan detrás de un desplegable. La exportación (ADR 0021, JSON y PDF) la muestra completa, con su autor, la fecha y el motivo, encima de las versiones.

**Queda en el registro de accesos** (ADR 0022) como `prescription_annulled`, escrita por `RecordClinicalAccessAction` dentro de la transacción de la anulación. Como el resto del registro, la ve todo el que lee la historia del paciente (#359), igual que la medicación anulada. Hasta #359 era una de las acciones que cada profesional veía solo de su propia medicación.

## Alternativas descartadas

- **Seguir corrigiendo con enmiendas.** Una enmienda reemplaza los ítems pero deja la indicación vigente. Vaciarla tampoco se puede: una versión siempre tiene al menos un ítem.
- **Un tipo de anulación además del motivo** («ya no es necesaria» o «nunca lo fue»). El motivo ya lo dice, y un dato estructurado más es un dato clínico más que la historia expone sin que nada lo use. Si algún día hace falta distinguirlos (por ejemplo, para mostrarlos distinto), se suma una columna nula sin migrar datos.
- **Una fecha «vigente hasta».** Alcanza con la fecha de la anulación, por la misma razón.
- **Dejar anular sin el plan que incluye la medicación.** Registrar y enmendar ya lo exigen. Mantener la misma regla en las tres escrituras evita un caso especial. Se puede relajar sin migrar datos.

## Consecuencias

- El panel ofrece «Enmendar» y «Anular» en cada medicación vigente, en la agenda y en la ficha. Una anulada no ofrece ninguna acción.
- Una anulación no se deshace. Si se anuló por error, la medicación se vuelve a registrar.
- Mostrar los ítems de una anulada a la vista, o agregar un tipo o una fecha de fin, se puede hacer después sin migrar datos.
