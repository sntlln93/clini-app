# ADR 0018: Datos mínimos en lo que le llega al paciente por un tercero

## Estado

Aceptado (#320).

## Contexto

El recordatorio por mail sale por Resend, un proveedor en EE. UU., que no es un país adecuado para la Ley 25.326. El mail nombraba al paciente, al profesional, la prestación, el consultorio, el día y la hora. El adjunto `turno.ics` y el link «Agregar a Google Calendar» llevaban al profesional y la prestación en la descripción. El link de Google manda todo eso a Google en la query, y el `.ics` termina en el calendario que use el paciente. La confirmación de la reserva online arma el mismo evento en el navegador (`calendar-event.ts`).

El profesional y la prestación pueden revelar la especialidad, y la especialidad de un turno es un dato de salud (art. 2). La salud mental (Ley 26.657) y el VIH y las ITS (Ley 27.675) tienen además confidencialidad reforzada.

## Decisión

**Lo que le llega al paciente a través de un tercero (proveedor de mail, proveedor de calendario) lleva solo el consultorio, el día, la hora y la dirección del consultorio.** Nunca el profesional, la prestación, la especialidad, ni nada clínico. Tampoco el nombre del paciente en el cuerpo del mail: ya va en la dirección de destino, y el cuerpo no lo necesita.

**Los detalles quedan detrás de un link a una página del panel, `/turno/<token>`.** La página muestra el día y la hora en la zona del consultorio, el profesional, la prestación y la dirección. La API los sirve en `GET /api/v1/booking/appointments/{token}` (público).
- **El token es el id del turno cifrado con `APP_KEY`** (`AppointmentDetailsLink`, con un prefijo de propósito), en base64url. No se guarda nada, no hace falta migrar y el id no queda a la vista.
- **Si el link muestra algo o no se decide en cada lectura**, con el turno: solo mientras no haya terminado, no esté cancelado ni reprogramado y su organización no esté suspendida (la misma regla que la página de reservas). Un token con la forma esperada que no se descifra recibe la misma respuesta (404 `booking.appointment_unavailable`), así que un link falsificado no se distingue de uno vencido. Un link cortado por debajo de 40 caracteres no llega a la ruta y recibe el 404 genérico.
- **La respuesta nunca incluye al paciente.** Usa la misma forma que la confirmación de la reserva.

**Los eventos de calendario no llevan el link a los detalles.** Ponerlo en la descripción le daría a Google, o a quien sincronice el calendario, una credencial para ver al profesional y la prestación.

**Cualquier canal nuevo hacia el paciente sigue el mismo criterio**: la sincronización con Google Calendar (#298), y SMS o WhatsApp si se implementan.

## Alternativas descartadas

- **Un token aleatorio guardado en `appointments`.** Permite revocar un link suelto, pero suma una columna, hace falta un token por cada turno que ya existe y el seeder deja de ser literal. Revocar ya se resuelve con el estado del turno.
- **Una URL firmada de Laravel** (`URL::temporarySignedRoute`). Expone el id del turno en la URL, que dice cuántos turnos tiene un consultorio, y obliga a fijar el vencimiento al emitir el link.
- **Mantener el profesional y sacar solo la prestación.** El profesional también revela la especialidad: en un consultorio chico, cada profesional suele tener una sola.

## Consecuencias

- Rotar `APP_KEY` invalida los links de los recordatorios ya enviados. La página dice que el link ya no muestra el turno, y el paciente puede consultar al consultorio.
- El nombre del consultorio sigue viajando, y a veces revela la especialidad por sí mismo («Salud Mental Norte»). Un «nombre para recordatorios» configurable queda para un issue aparte: necesita una columna y un campo en Ajustes.
- Relajar el criterio más adelante (por ejemplo, volver a nombrar al profesional) es un cambio de plantilla sin migración de datos.
