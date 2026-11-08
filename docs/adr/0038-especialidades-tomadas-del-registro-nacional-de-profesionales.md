# ADR 0038: Especialidades tomadas del registro nacional de profesionales

## Estado

Aceptado (#387). Reemplaza, para las especialidades, el catálogo de la app externa y la credencial elegida libremente del ADR 0005 (las prestaciones siguen como allí). Cambia del ADR 0032 la especialidad de la matrícula, que deja de ser un texto, y el interruptor `NATIONAL_PROFESSIONAL_SEARCH_ENABLED`. La identidad (RENAPER) y el acceso oficial a REFEPS siguen en #379; el nombre del profesional, en #417; las métricas del catálogo, en #418; las caídas del registro, en #419.

## Contexto

Desde #380 un profesional tenía tres fuentes sobre sí mismo que no se hablaban: las especialidades que elegía libremente del catálogo (`user_specialties`, ADR 0005), las matrículas que valida el registro nacional (que también responde la especialidad de cada profesión, y que se guardaba como texto solo para mostrarla) y su nombre. Un psicólogo podía declarar «Cardiología», el consultorio se la habilitaba y el paciente la veía al reservar, aunque ninguna matrícula la respaldara. «Matrícula verificada» no decía nada de lo que el profesional mostraba.

La profesión es el título de grado más la matrícula que habilita a ejercer (Médico, Odontólogo, Psicólogo…; en Clini, `HealthProfession`). La especialidad es una formación de posgrado dentro de una profesión (Cardiología, Ortodoncia…). REFEPS responde, por cada profesión de la persona, a lo sumo una especialidad (`refepsEspecialidad`, que puede venir vacía).

## Decisión

**Clini es el único dueño de `specialties`, y solo el registro la llena.** Igual que el catálogo de medicamentos desde el Buscador Nacional de Medicamentos (ADR 0031): no hay pantalla ni endpoint para editarla, y la app externa del catálogo deja de escribirla. Cada fila tiene la profesión (`HealthProfession`) y el nombre tal como lo escribe REFEPS, y es única por profesión y nombre plegado (`folded_name`, `App\Support\FoldedText`): «PEDIATRIA» y «Pediatría» de Médico son la misma fila, que conserva cómo la escribió la primera respuesta. Cada respuesta del registro para un DNI (al declarar una matrícula, al cargar un DNI nuevo, al verificar a pedido y en la reverificación diaria) agrega las combinaciones de profesión y especialidad que trae y todavía no existen, también las de profesiones que el profesional no declaró; el único escritor es `App\Support\RegistrySpecialtyCatalog`, que corre dentro de `VerifyProfessionalLicensesAction`. Una profesión que el registro responde sin especialidad es una fila propia con la etiqueta de la profesión («Odontólogo»), así una matrícula verificada siempre respalda una fila. Una profesión que Clini no reconoce (fuera de `HealthProfession`) no entra. Nada borra ni edita una fila: las matrículas y los consultorios apuntan a ella (`restrictOnDelete`).

**La matrícula guarda la fila que respalda.** `professional_licenses.specialty` (texto) pasa a `specialty_id`, la fila de la especialidad que el registro responde para esa profesión, o la de la profesión sola. Ajustes › Matrículas la muestra, solo para leer, junto a cada matrícula verificada («Te habilita a atender como: Pediatría»).

**Las especialidades del profesional se derivan, no se eligen.** El nivel del profesional ya no es una tabla: son las filas que respaldan sus matrículas **verificadas** (`Specialty::backedFor($userId)`). Se descartan `user_specialties`, Ajustes › Mis especialidades, `GET /specialties` y `POST/DELETE /users/{id}/specialties`. Así no hay nada que sincronizar: una matrícula que deja de estar verificada, un DNI nuevo (que vuelve todas a «sin verificar») o una matrícula quitada dejan de respaldar en el mismo momento, sin otra escritura.

**La elección queda por consultorio.** `professional_specialties` sigue siendo con qué atiende el profesional en cada consultorio, y la eligen quienes la elegían (`catalog.manage`, o `catalog.manage.own` sobre la propia membresía). La API rechaza con 422 una especialidad que no respalde una matrícula verificada del profesional (`StoreProfessionalSpecialtyRequest`). `GET /memberships/{id}/backed-specialties` da las respaldadas, que es lo que necesita esa pantalla; lo leen quien elige y quien ve el listado de profesionales.

**Perder el respaldo no borra ni bloquea.** La FK compuesta de `professional_specialties` hacia `user_specialties` (que borraba en cascada) se reemplaza por una FK simple a `specialties`. Una especialidad habilitada en un consultorio que ya no respalda ninguna matrícula verificada sigue habilitada: la agenda, la reserva y la historia clínica no cambian. Se puede quitar, pero no volver a elegir hasta que una matrícula la respalde.

**Quién ve la marca «sin respaldo de matrícula».** Quienes pueden ver el listado de profesionales (`memberships.view`): `GET /memberships` dice `backed` por especialidad, y la marcan las tarjetas de /profesionales y Ajustes › Profesionales. Es una excepción acotada al ADR 0032: se expone solo la marca derivada; el DNI, el número, la provincia y el estado de cada matrícula siguen siendo solo de su dueño. El paciente no la ve: la página de reservas no lleva `backed` (y la especialidad nunca sale hacia terceros, ADR 0018).

**Siempre hay un registro.** `PROFESSIONAL_REGISTRY` elige el adaptador de `ProfessionalRegistry`: `national_search` (el Buscador Nacional de Profesionales de la Salud), el valor por defecto y el de producción, y más adelante `refeps` (#379); y `fake` (`FakeProfessionalRegistry`), que responde sin salir de Clini a los DNIs inventados del fixture del seeder y «nadie» a cualquier otro. Producción rechaza `fake` al resolverlo, como rechaza la clave pública de desarrollo del cifrado clínico. Dev y e2e usan `fake`; Pest corre dos veces, con `fake` y con `national_search` sobre las páginas grabadas. Ya no hay un estado «registro apagado»: lo que queda es la pausa de 5 minutos después de una falla. Qué pasa con una caída larga o un cambio de formato es #419.

**El fixture deja de traer un catálogo escrito a mano.** `ProfessionalRegistrySeeder` lee la respuesta del adaptador `fake` directamente (no el registro configurado, porque el seeder también corre sobre la imagen de producción en el server de demo), llena el catálogo con ella y carga las matrículas de los profesionales sembrados como las verificaría el registro. Los DNIs inventados (`99000001`, `99000002`, más allá de los emitidos) se cargan solo fuera de producción: en el server de demo la reverificación diaria los mandaría al registro real.

### Decisiones tomadas en la implementación

- **La derivación es una consulta, no una tabla.** El triage hablaba del nivel del profesional (`user_specialties`) derivado de las matrículas; mantener una tabla derivada obligaba a reescribirla en cada verificación, cambio de DNI, matrícula quitada y borrado de cuenta, con el riesgo de que quede desfasada. Se calcula sobre `professional_licenses` (verificadas, con `specialty_id`). #418 cuenta «profesionales que la tienen respaldada» con la misma consulta.
- **Las especialidades respaldadas se piden por membresía**, no por usuario: la pantalla que las usa es la del consultorio, y así la autorización es la de ese consultorio (quien elige, o `memberships.view`), sin abrirlas a `catalog.view` (recepción).
- **El interruptor «Atiendo pacientes en este consultorio»** (#286), que vivía en Mis especialidades, pasa a Ajustes › Matrículas, que ahora ven también quienes pueden activarlo (`memberships.manage`). Atender empieza por cargar las matrículas.
- **Lo que guarda la matrícula que no coincide.** Si el registro tiene la matrícula pero no la da por habilitada, la fila de su especialidad se guarda igual (como antes el texto), pero no respalda nada: solo cuentan las verificadas.

## Alternativas descartadas

- **Comparar lo declarado con el registro** (la propuesta original del issue): mantener la elección libre y marcar las que no coinciden. Obligaba a una tabla de correspondencias entre los nombres de REFEPS y un catálogo ajeno, y seguía permitiendo ofrecer una especialidad sin respaldo.
- **La correspondencia en el catálogo externo** (un código REFEPS por especialidad): dependía de otra aplicación para algo que el registro ya responde.
- **Borrar o bloquear lo habilitado al perder el respaldo.** Una matrícula puede figurar como no habilitada por un problema del registro; bloquear la agenda o la reserva por eso castiga al consultorio y al paciente. Si la receta electrónica lo necesita, lo decide #314 sobre el estado guardado.
- **Mostrar la marca al paciente.** Expone algo derivado de la matrícula, que es del profesional, a quien no la necesita para reservar.
- **SIU/SIPES o CONEAU como fuente de la profesión.** Son catálogos de carreras y títulos, no registros de personas.
- **Mantener un registro «apagado».** Dejaba al catálogo vacío y a nadie con especialidades: sin registro no hay de dónde tomarlas.

## Consecuencias

- Un profesional sin DNI o sin matrículas verificadas no tiene especialidades para ofrecer, y el consultorio lo ve («Sus especialidades salen de las matrículas que carga en Ajustes › Matrículas»). Con el registro caído, las verificadas siguen respaldando y las nuevas esperan.
- Las especialidades llevan los nombres de REFEPS («Medicina General y/o Medicina de Familia»), que son los que ve el paciente al reservar.
- El catálogo solo tiene las profesiones y especialidades de los profesionales que pasaron por Clini. No es un problema: solo se reserva con los profesionales que existen.
- En el server de demo los profesionales sembrados tienen matrículas verificadas sin DNI, y la reverificación no los consulta.
- Un `.env` local de antes de este cambio no tiene `PROFESSIONAL_REGISTRY` y usa `national_search`: hay que agregar `PROFESSIONAL_REGISTRY=fake` (está en `.env.example`).
