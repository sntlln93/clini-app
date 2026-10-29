# ADR 0022: Registro de accesos a la historia clínica, con motivo fuera de turno

## Estado

Aceptado (#325, que absorbe #272). Desde #359 la ficha, el registro y la exportación muestran la medicación de todos los profesionales, como las notas: revierte la alternativa descartada «Mostrar en el registro lo que otro profesional hizo con su medicación».

## Contexto

La Ley 10.549 de La Rioja (art. 4 inc. 2) exige la trazabilidad de cada atención y de todos los usuarios que acceden, agregan, modifican o eliminan información, y el acceso excepcional con constancia del motivo (art. 6). Varias provincias exigen un registro de accesos: CABA, Buenos Aires, Santa Fe, Misiones, La Pampa, Chubut y Río Negro. Algunas, además, lo quieren visible para el paciente.

Hasta ahora la historia guardaba quién escribió cada versión (ADR 0019) y cada exportación (ADR 0021), pero no quién la leyó. La única auditoría era la de los operadores del dashboard (`admin_audit_logs`).

Quién lee no lo decide un rol: lee las notas de un paciente quien tiene o tuvo un turno con él en el consultorio, o le escribió una nota (`Patient::attendedBy`, #217). Esa relación no tiene vencimiento: un profesional que atendió a alguien hace dos años sigue pudiendo abrir su historia.

El panel, por su parte, pedía las notas de cada ficha sin saber si iba a recibir un 403, y dejaba un request fallido y un error de consola en cada ficha sin acceso (#272).

## Decisión

**Cada acceso queda en `clinical_access_logs`, de solo agregado.** Una fila por lectura de las notas o de la medicación indicada de un paciente, por nota escrita, enmendada o anulada, por medicación registrada, enmendada o anulada (ADR 0025), por acceso excepcional y por cada exportación que incluyó la historia del paciente. Guarda quién (la membresía), sobre qué paciente, qué (`action`), cuándo, y a qué turno, nota, medicación o exportación tocó. Tiene el mismo trigger que la historia (ADR 0019): ni la API ni una consola pueden editarla ni borrarla. La única excepción es la purga del seeder de fixtures, que la borra antes que las notas. `RecordClinicalAccessAction` es su único escritor. Cada escritura de la historia lo llama dentro de su propia transacción, así que el registro y la fila de acceso se guardan juntos o no se guarda ninguno. Una lectura rechazada (403 o 409) no deja fila, porque no mostró nada.

**Una lectura repetida no suma una fila.** Si el mismo profesional ya leyó lo mismo en los últimos **15 minutos** (`ClinicalAccess::READ_REPEAT_MINUTES`), la lectura nueva no suma fila. Lo mismo quiere decir la misma acción, el mismo paciente y el mismo turno, o la historia entera. Recargar la ficha, editar al paciente y volver, o pasar de página dejaban filas idénticas con la misma hora, y no decían nada que la primera no dijera. Las escrituras, los accesos excepcionales y las exportaciones dejan siempre su fila.

**Sin un turno propio cerca de hoy, la historia se abre con un motivo.** Se considera cerca un turno del propio profesional con ese paciente, en ese consultorio, que empiece entre 7 días antes y 7 días después de ahora. Un turno cancelado o reprogramado no cuenta, porque no trae una consulta. Un ausente sí cuenta.
- Sin ese turno, `GET /patients/{id}/clinical-notes`, `GET /patients/{id}/prescriptions` y la exportación de ese paciente responden 409 `clinical_access.reason_required`.
- El profesional declara el motivo con `POST /patients/{id}/exceptional-accesses`. Elige entre «preparar la consulta», «resultado de estudio», «urgencia» y «otro», y puede sumar un texto de hasta 500 caracteres. «Otro» exige el texto, porque solo no dice nada.
- El motivo queda en el registro y abre la historia a ese profesional, y a nadie más, durante **una hora**.
- Con un turno cerca no hay nada que abrir: declarar un motivo responde 409 `clinical_access.reason_not_required`. Así la lista del dueño solo tiene accesos excepcionales reales.

**El dueño ve los accesos excepcionales de su consultorio**, en `GET /exceptional-accesses` y en el panel (`/accesos-excepcionales`, desde Ajustes). Ve quién accedió, a qué paciente, cuándo y con qué motivo de la lista. No ve el texto del profesional, que puede llevar datos de salud, ni nada de la historia. Como la facturación (`SubscriptionPolicy`), lo decide el rol de dueño y no un permiso que también tendría un administrador.

**Quien lee la historia ve su registro de accesos**, en la ficha, debajo de la historia (`GET /patients/{id}/clinical-access-logs`, de a 10, el más reciente primero). Lo abre la misma relación y el mismo motivo que las notas. Muestra quién, qué, cuándo, el motivo elegido de la lista y sobre qué turno o exportación. Como la historia, muestra lo de todos los profesionales del consultorio, también lo que hicieron con la medicación que indicaron (#359). Nunca muestra el texto del motivo. Consultarlo no deja una fila: no muestra nada de la historia, y cada entrada a la ficha ya deja la lectura de las notas, porque el panel las vuelve a pedir al entrar en vez de mostrar las que tenía guardadas. La regla de las lecturas repetidas evita que eso duplique filas.

**La exportación lleva el registro** (ADR 0021). La de un paciente, y la de todos los atendidos para cada uno, incluye su registro en ese consultorio, del más antiguo al más reciente, con lo mismo que muestra la ficha: una lista más en el JSON (`access_log`) y una sección más en el PDF. La exportación misma deja su fila en el registro de cada paciente que incluye, apuntando a su fila de `clinical_record_exports`, antes de que se arme esa parte del documento. Así, la copia dice también cuándo y quién la generó. La de un paciente la guarda en la misma transacción que su encabezado. La de todos los atendidos la guarda a medida que el envío llega a cada grupo de pacientes: si el envío se corta, quedan registrados los que ya salieron.

**El panel sabe de antemano si la historia se abre** (#272). `GET /patients/{id}` suma `can_view_clinical_notes` (la misma política que el endpoint de notas) y `clinical_access_reason_required`. El listado de pacientes no los calcula. El panel solo pide las notas y la medicación cuando se van a responder. Si no se pueden ver, muestra «Solo pueden ver las notas clínicas los profesionales que tienen o tuvieron un turno con este paciente.». Si hace falta un motivo, lo pide en un diálogo. Un 403 sobre las notas vuelve a ser un error real.

**La medicación indicada tiene la misma política que las notas.** `PrescriptionPolicy::viewAnyForPatient` pasa a exigir la misma relación con el paciente (`ClinicalAccess::attends`). Antes alcanzaba con una membresía activa y la respuesta llegaba vacía. Desde #359 el contenido también es el de las notas: quien abre la historia ve la medicación de todos los autores, con su autor. Enmendar y anular siguen siendo solo del autor (`PrescriptionPolicy`).

**Los operadores de la plataforma no acceden al contenido clínico.** El dashboard no tiene ningún endpoint de notas, medicación, exportaciones ni accesos. Un ArchTest falla si el código de operadores (`Controllers`, `Actions`, `Resources`, `Requests` y `Data` de `Admin`) usa alguno de sus modelos.

## Alternativas descartadas

- **Responder 200 con una lista vacía a quien no puede ver las notas.** Borra la diferencia entre «no hay notas» y «no podés verlas», y revierte una decisión explícita de #217.
- **Mandar el motivo en cada lectura**, como parámetro del `GET`. El texto libre quedaría en la URL, que ya se usa para leer un solo registro, y en los logs de acceso del servidor. Con un acceso declarado una vez por `POST`, las lecturas siguen siendo `GET` sin datos y el loader del panel no cambia.
- **Una ventana más amplia (30 días) o un acceso excepcional que dure el día entero.** Exponen más sin dejar constancia. Ampliarlos después es cambiar dos constantes (`ClinicalAccess::WINDOW_DAYS`, `EXCEPTIONAL_ACCESS_MINUTES`) y su copia en el panel (`apps/panel/src/lib/clinical-access.ts`), sin migrar datos.
- **Mostrarle al dueño el texto del motivo.** Puede llevar datos de salud de un paciente cuyas notas el dueño no puede leer. El texto queda guardado, así que mostrarlo después es un cambio de interfaz.
- **Que el administrador también vea la lista.** Mismo criterio: es agregar el rol a la policy y a la entrada de Ajustes, que hoy se muestra solo al dueño.
- **Absorber `clinical_record_exports` en el registro de accesos**, como anticipaba el ADR 0021. Una exportación tiene alcance y formato propios, y la de todos los atendidos no tiene un paciente. Su tabla sigue siendo el encabezado de cada copia; el registro suma una fila por paciente que apunta a ella.
- **Deducir de `clinical_record_exports` qué pacientes incluyó la exportación de todos los atendidos.** La lista depende de los turnos y las notas que había en ese momento. Una fila por paciente lo deja escrito.
- **Mostrar en el registro lo que otro profesional hizo con su medicación.** Revelaría que existe una medicación que la ficha no muestra (CU-53). *Revertida por #359:* la ficha ya la muestra, así que el registro deja de recortarla (`ClinicalAccessLog::visibleTo` solo acota al consultorio).
- **Mostrar el texto del motivo en la ficha o en la exportación.** El mismo criterio que con el dueño: puede llevar datos de salud y la exportación puede salir del consultorio. Está guardado, así que mostrarlo después es un cambio de interfaz.
- **Registrar también cada consulta del registro.** Cada visita a la ficha ya deja la lectura de las notas; una fila más por mirar quién miró solo duplicaría el ruido.
- **Registrar cada lectura, aunque se repita.** Llena el registro de filas idénticas que no agregan nada y esconden lo que importa.
- **Agrupar las lecturas repetidas solo al mostrarlas.** El ruido seguiría en la exportación y en la base. Además, un plazo más corto para las lecturas repetidas conserva más detalle y se puede ajustar sin migrar datos.
- **Un plazo más largo para las lecturas repetidas (una hora o el día).** Pierde cuándo se volvió a abrir la historia en una consulta distinta del mismo día.
- **Pedir el motivo también para la exportación de todos los atendidos.** No admite un motivo por paciente. Queda registrada en `clinical_record_exports` y sigue el criterio del ADR 0021.
- **Pedir el motivo para leer las notas o la medicación de un turno propio** (`GET /appointments/{id}/clinical-notes`, `/prescriptions`). Solo devuelven lo que escribió el mismo profesional en ese turno, también desde #359: lo de otros autores se lee en la historia del paciente, con su motivo. Se registran igual.

## Consecuencias

- Ver la historia de un paciente sin un turno cercano suma un paso, que queda a la vista del dueño. Atender un turno de hoy o de esta semana no cambia.
- Cada lectura escribe una fila, salvo que repita una de los últimos 15 minutos (`ClinicalAccess::READ_REPEAT_MINUTES`). Si el volumen llega a pesar, se puede particionar por fecha o resumir sin perder el registro.
- **La copia que el profesional le entrega al paciente** (Ley 26.529, art. 14) ya dice quién accedió a su historia, que es lo que piden algunas provincias. Que el paciente la consulte por sí mismo queda para la respuesta de #315 y el pedido directo del paciente (#327).
- Una entrada a la ficha pasados los 15 minutos de una lectura igual suma filas al registro de ese paciente (la lectura de las notas y la de la medicación), y también lo hacen la agenda y las exportaciones. Por eso el panel pide el registro de nuevo en cada carga, en vez de descartarlo desde cada una.
- El tamaño de la ventana, la duración del acceso excepcional y la de las lecturas repetidas se cambian en `ClinicalAccess` (las dos primeras, también en su copia del panel); quién ve la lista, en `ClinicalAccessLogPolicy` y en la entrada de Ajustes; qué filas del registro se ven, en `ClinicalAccessLog::visibleTo`. Nada de eso migra datos.
- Un registro clínico nuevo que se lea o se escriba suma su `action` a `App\Enums\ClinicalAccessAction` y pasa por `RecordClinicalAccessAction`.
