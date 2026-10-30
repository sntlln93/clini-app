# ADR 0029: La historia clínica es del paciente: lo de otro profesional se lee con su código

## Estado

Aceptado (#364). Reemplaza la parte clínica de #321 y cambia la regla de lectura de #359 (ADR 0022, ADR 0025, ADR 0027). La lectura entre organizaciones queda para un issue propio (ver Consecuencias).

## Contexto

Hasta ahora la historia clínica era de cada organización: todo profesional que atendía al paciente en el consultorio (`ClinicalAccess::attends`, con la ventana de 7 días o un acceso excepcional) leía las notas, la medicación, las mediciones y los antecedentes de todos los profesionales del consultorio (#359). El relevamiento de #313 concluyó que compartir datos clínicos entre profesionales requiere la autorización del paciente (Ley 26.529, Ley 25.326 art. 11). Hacía falta un modelo en el que el paciente decida quién lee lo que escribió otro profesional, sin exigirle una cuenta en la plataforma.

## Decisión

**La historia clínica es del paciente.** Un profesional lee y escribe sus propios registros sin código, con la regla de siempre (`attends`, ventana o acceso excepcional). Para leer lo que escribió **otro** profesional (notas, medicación, mediciones, grupo sanguíneo y antecedentes) necesita el código que el paciente le comparte. Vale también dentro de la misma organización: ser colegas no autoriza.

**El código es de un turno.** Al dar un turno a un paciente con registros de otro profesional del consultorio, se emite un código para ese turno (`patient_access_codes`, uno por turno) y se manda por mail a los emails confirmados del paciente, los mismos de los recordatorios (ADR 0028). También se ve en `/turno/<token>` mientras no se canjeó, y la recepción puede reenviarlo a uno de esos emails si el paciente lo pide, sin verlo nunca. Si el turno se dio antes de que existiera la historia, reenviarlo lo emite.

- 8 caracteres de un alfabeto de 30 sin los que se confunden (0/O, 1/I/L, U): unos 39 bits. Se muestra como `ABCD-2345` y se acepta en minúsculas, con o sin guion y con espacios.
- Se guarda cifrado con `APP_KEY` (cast `encrypted`), porque `/turno/<token>` lo muestra de nuevo. Un hash no lo permitiría.
- Lo canjea **solo el profesional del turno** (`POST /patients/{id}/access-code-redemptions`), una sola vez, con el turno sin cancelar ni reprogramar y antes de que termine su ventana (inicio del turno + `ClinicalAccess::WINDOW_DAYS`). Un código equivocado, ajeno, ya usado o vencido responden lo mismo: 409 `clinical_access.code_invalid`.
- El canje tiene un límite de 5 intentos por minuto por usuario (`throttle:access-code-redemption`), y cada intento se compara solo contra los códigos de los turnos propios con ese paciente. El reenvío tiene el mismo límite (`throttle:access-code-delivery`), para que no se pueda usar para inundar el correo de alguien.

**El acceso es la fila canjeada y dura lo que la ventana del turno.** Es de la membresía sobre ese paciente, y sigue sujeto a `attends`: sin turno cerca de hoy no lee aunque haya canjeado antes. Cuando la ventana termina, lo de otros profesionales vuelve a quedar fuera hasta el próximo turno y su código. Cada modelo clínico lo aplica con el scope `readableBy($membershipId)` (`ReadableThroughAccessCode`), que usan las lecturas de la ficha, la exportación (que contiene exactamente lo que quien exporta puede leer, ADR 0021) y el control de «grupo sanguíneo sin cambios», que de otro modo revelaría el valor de otro profesional con un 409.

**Qué sabe el profesional sin código.** `GET /patients/{id}` dice `clinical_records_hidden` cuando otro profesional del consultorio escribió algo y no hay un código canjeado vigente, y el panel muestra el campo para ingresar el código. Revela que existen registros de otros, no cuáles ni qué dicen; dentro del consultorio, los turnos de otros profesionales con el paciente ya se veían en su historial de turnos.

**El mail del código** lleva solo el consultorio, el día, la hora y el código (ADR 0018): nunca el profesional, la prestación ni nada clínico.

**Todo queda en el registro de accesos** (ADR 0022), con acciones propias: `access_code_issued` y `access_code_sent` (a nombre del profesional del turno, para quien es el código), `access_code_resent` (a nombre de quien lo reenvió) y `access_code_redeemed`. Ninguna fila lleva el código.

## Alternativas descartadas

- **Leer lo de otro consultorio con el código desde ya.** Es el objetivo del modelo, pero suma a la ficha registros de organizaciones que hoy nunca se cruzan (la exportación, el registro de accesos y los autores llevan la organización implícita). Lo más conservador era empezar dentro del consultorio: extenderlo es cambiar el scope, sin migrar datos, porque el código ya es del paciente y del profesional.
- **Un acceso que no vence.** El código autoriza para un turno; que el acceso dure más que su ventana sería autorizar consultas que el paciente no vio venir. Que dure más se puede relajar después cambiando una consulta.
- **Que cualquier profesional del consultorio canjee cualquier código del paciente.** El paciente comparte el código con quien lo atiende en ese turno. Ligarlo al profesional del turno evita que el código de un turno abra la historia a otro, y achica a quién se le puede intentar adivinar.
- **Emitir el código para todo turno.** Un paciente nuevo, o uno que solo vio a ese profesional, recibiría un mail que no abre nada. Se emite cuando hay algo que abrir, o cuando el paciente lo pide.
- **Guardar solo un hash del código.** Impediría mostrarlo en `/turno/<token>`, que es la única vía para un paciente sin email.
- **Mostrarle el código a la recepción para que lo dicte.** Lo conocería alguien que no atiende al paciente. El reenvío lo manda sin mostrarlo.

## Consecuencias

- Cambia la regla de #359: quien lee la historia ya no lee automáticamente la de sus colegas. CLAUDE.md, CU-45, CU-53, CU-54 y CU-55 lo dicen.
- La lectura entre organizaciones con el código, y la historia que sigue al paciente entre consultorios, quedan para un issue propio.
- #362 (aviso de alergias) y #363 (curvas de crecimiento) usan lo de otros profesionales solo si se canjeó el código, con `readableBy`.
- Un paciente sin email confirmado ve el código en `/turno/<token>`, pero ese link le llega por el recordatorio, que también va por email. Hasta que haya SMS o WhatsApp (fuera de alcance), la recepción le agrega un email en su ficha y reenvía el código.
- El seeder borra los códigos de las organizaciones de prueba antes que los turnos. No es un registro clínico: el canje lo actualiza, así que no lleva el trigger de solo agregado.
