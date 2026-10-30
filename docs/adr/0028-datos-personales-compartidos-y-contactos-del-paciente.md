# ADR 0028: Datos personales del paciente compartidos en la plataforma y contactos múltiples

## Estado

Aceptado (#365). Reemplaza la parte de datos personales de #321. La parte clínica sigue en #364.

## Contexto

El paciente es global desde el principio (CU-07): una sola ficha por documento, compartida por todos los consultorios que lo atienden. El relevamiento de #313 concluyó que esa identidad global es aceptable, siempre que los datos personales y de contacto no se confundan con la historia clínica. Faltaban dos cosas. Por un lado, `POST /patients/lookup` le devolvía la ficha a cualquier consultorio sin límite ni registro. Por otro, cada paciente tenía un solo email y un solo teléfono, en columnas de `patients`, aunque es habitual tener varios (el de la madre de un chico, un teléfono del trabajo).

## Decisión

**Los datos personales y de contacto se comparten dentro de la plataforma** (nombre, documento, fecha de nacimiento, sexo, obra social y contactos), pero no fuera de ella. Un consultorio los encuentra solo por **documento exacto** (tipo y número), para autocompletar el alta. No hay listados ni búsqueda por nombre entre consultorios: `GET /patients` sigue limitado a los pacientes de la organización.

**La búsqueda tiene resguardos contra la recolección masiva:**
- Límite de 30 búsquedas cada 5 minutos por membresía (`throttle:patient-lookup`), y 429 al superarlo. El throttle corre antes de `organization`, así que la clave es el usuario. Como un usuario actúa con una sola membresía a la vez (`ResolveCurrentOrganization`), equivale a una por membresía.
- Cada búsqueda deja una fila de solo agregado en `patient_lookups` (organización, membresía, `patient_id` encontrado o nulo, fecha). Su único escritor es `LookUpPatientAction`. **El documento buscado no se guarda**, porque si no hay coincidencia puede ser de alguien que ni siquiera es paciente.

**Contactos en una tabla propia** (`patient_contacts`): `type` (`phone`, `email`, `whatsapp`), `value`, `label` libre y opcional («madre», «trabajo»), `position`, `created_by`. `value` se guarda normalizado: E.164 para teléfono y WhatsApp (con `libphonenumber`, leído como argentino salvo que traiga su `+` y código de país) y en minúsculas para el email. Un número argentino de WhatsApp sin el 9 de celular lo recibe, porque WhatsApp solo llega a un celular. Es único por paciente, tipo y valor, así que el mismo número escrito de dos formas es un solo contacto. El mismo número como teléfono y como WhatsApp son dos contactos. La API responde además `display`, la forma en que se lee (nacional si es argentino, internacional si no). `patients.email` y `patients.phone` dejan de existir.

**Quién escribe qué:**
- El formulario del consultorio (`PUT /patients/{id}`) es la lista completa: lo que conserva queda, en su orden, y lo que quita se borra. Si no manda `contacts`, no los toca.
- Un alta que reutiliza un paciente existente (`POST /patients`) y la reserva online **solo agregan** contactos: nunca modifican ni borran los existentes, como antes con los datos personales.

**Un contacto que agrega una reserva online anónima a un paciente que ya existía queda sin confirmar** (`needs_confirmation`), y **no recibe recordatorios** hasta que alguien del consultorio lo confirme, guardando al paciente con ese contacto en su formulario de edición. Un alta que reutiliza al paciente no lo confirma ni lo ofrece en el formulario: quien carga un alta no está revisando los contactos de esa persona. Sin esto, cualquiera que conozca un DNI podría sumar su correo a ese paciente con una reserva y recibir los recordatorios de todos sus turnos. Cada recordatorio trae el enlace a los detalles del turno, que muestran el profesional y la prestación, y eso puede revelar una especialidad (ADR 0018). Los contactos de la reserva que **crea** al paciente quedan confirmados: no hay a quién suplantar, igual que antes. El panel marca «Sin confirmar» en la ficha y lo explica en el formulario.

**Recordatorios a todos los emails confirmados**, un mail por dirección: un contacto no ve la dirección de otro. El recordatorio se programa al dar el turno si el paciente tiene algún email confirmado, y los destinatarios se leen al enviarlo. Un turno dado cuando el único email estaba sin confirmar no recibe recordatorio aunque después se confirme, y uno cuyos emails confirmados desaparecieron se descarta sin enviar.

La reserva online sigue pidiendo un correo y un teléfono, que viajan como lista de contactos (hasta 4). El formulario del consultorio maneja hasta 10, con tipo y etiqueta.

## Alternativas descartadas

- **Que la reserva online agregue contactos ya confirmados**, como dice el issue sin más detalle. Ampliaba una exposición que antes existía solo cuando el paciente no tenía email cargado. Marcarlos sin confirmar se puede relajar después cambiando una consulta, sin migrar datos.
- **Un solo mail con todos los destinatarios.** Le mostraría a cada contacto las direcciones de los demás, que pueden ser de otras personas.
- **Validar el teléfono con una expresión regular propia.** El plan de numeración argentino (0 y 15, códigos de área de 2 a 4 dígitos, el 9 de los celulares en E.164) no se resuelve bien sin la base de `libphonenumber`. Se usa la variante `-lite`, sin geocodificación ni operadoras.
- **Guardar el documento buscado en `patient_lookups`**, o su hash. Un DNI tiene unos 10⁸ valores posibles y su hash se revierte por fuerza bruta (#322).
- **Un límite por organización.** Un consultorio con varias recepcionistas lo agotaría entre todas. Uno por persona alcanza para cargar turnos y frena a un script.

## Consecuencias

- La política de privacidad (#317) tiene que informar que estos datos se comparten entre los consultorios de la plataforma.
- El código de acceso a la historia de #364 se envía a los contactos de tipo email. Si el envío se basa en los recordatorios, hereda la misma regla de confirmación.
- La verificación de contactos (mail o SMS) y los recordatorios por WhatsApp quedan para issues propios. Una verificación podría reemplazar la confirmación manual.
