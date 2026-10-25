# ADR 0025: Anulación de la medicación indicada, con tipo y motivo obligatorio

## Estado

Aceptado (#344). Revierte la alternativa que el ADR 0019 había descartado («Permitir anular la medicación indicada»).

## Contexto

La medicación indicada (CU-53) es de solo agregado (ADR 0019): se corrige con una enmienda, pero no había forma de decir que una indicación ya no vale. Enmendar los ítems no sirve, porque la indicación sigue figurando como vigente. El profesional necesita distinguir dos casos:
- **Ya no es necesaria:** el tratamiento terminó o se suspendió. Valió hasta ese momento.
- **Nunca lo fue:** se indicó por error, por ejemplo al paciente o en el turno equivocado.

## Decisión

**El autor anula la medicación indicada** (`POST /prescriptions/{id}/annulment`) desde el turno en la agenda o desde la ficha del paciente, igual que anula una nota:
- Elige el tipo (`kind`: `no_longer_needed` o `never_needed`, `App\Enums\PrescriptionAnnulmentKind`) y escribe un motivo obligatorio de 3 a 500 caracteres, los mismos límites que la anulación de una nota. Sin alguno de los dos, la API responde 422.
- Solo el autor anula (`PrescriptionPolicy::annul`), como solo él enmienda.
- Una medicación anulada ya no se enmienda ni se vuelve a anular: la API responde 409 `prescriptions.annulled`, decidido en la Action con la fila bloqueada.
- Sigue las mismas restricciones que registrar y enmendar: suscripción activa y plan con medicación indicada (`plan.feature:prescriptions`).

**La anulación es de solo agregado**, como el resto de la historia: una fila de `prescription_annulments` por medicación, con su autor, el tipo, el motivo y la fecha. Su trigger reutiliza `reject_clinical_record_change()`, así que su migración se revierte antes que la de solo agregado, y la purga del seeder la borra antes que las versiones.

**Queda en el registro de accesos** (ADR 0022) como `prescription_annulled`, escrita por `RecordClinicalAccessAction` dentro de la transacción de la anulación.

**La exportación** (ADR 0021, JSON y PDF) muestra cada anulación con su autor, la fecha, el tipo y el motivo, encima de las versiones.

### Decisiones que el issue dejó para triage

- **Los dos tipos se muestran distinto.** Las dos llevan la marca «Anulada», el tipo, la fecha y el motivo. Si «nunca fue necesaria», los ítems van detrás de un desplegable, como el texto de una nota anulada, porque nunca valieron. Si «ya no es necesaria», los ítems quedan a la vista, porque son el tratamiento que el paciente recibió. En la exportación se muestran completas las dos, con su tipo: es el documento de la historia, no una vista de trabajo.
- **«Ya no es necesaria» no guarda una fecha propia.** Alcanza con la fecha de la anulación. Es lo más conservador: no agrega un dato clínico más ni una regla para validarlo. Si hace falta, sumar una columna nula después no obliga a migrar datos.
- **El registro de accesos no muestra la anulación a otros profesionales.** `prescription_annulled` es una de las acciones que cada profesional ve solo de su propia medicación (`ClinicalAccessAction::ownPrescriptionActions`, usada por `ClinicalAccessLog::visibleTo`). Si la medicación de otro no se ve (CU-53), tampoco su anulación.

## Alternativas descartadas

- **Seguir corrigiendo con enmiendas.** Una enmienda reemplaza los ítems pero deja la indicación vigente. Vaciarla tampoco se puede: una versión siempre tiene al menos un ítem.
- **Un solo tipo de anulación.** No distingue un tratamiento que terminó de uno indicado por error, que es justo lo que la historia tiene que explicar.
- **Ocultar los ítems también cuando ya no es necesaria.** Esconde el tratamiento real que recibió el paciente. Mostrar u ocultar es un cambio de interfaz, así que se puede cambiar después sin migrar datos.
- **Dejar anular sin el plan que incluye la medicación.** Registrar y enmendar ya lo exigen. Mantener la misma regla en las tres escrituras evita un caso especial. Se puede relajar sin migrar datos.
- **Una fecha «vigente hasta» para «ya no es necesaria».** Ver arriba.

## Consecuencias

- El panel ofrece «Enmendar» y «Anular» en cada medicación vigente, en la agenda y en la ficha. Una anulada no ofrece ninguna acción.
- Una anulación no se deshace. Si se anuló por error, la medicación se vuelve a registrar.
- Mostrar igual los dos tipos, ocultar también los ítems de la que ya no es necesaria o agregar una fecha de fin se puede hacer después sin migrar datos.
