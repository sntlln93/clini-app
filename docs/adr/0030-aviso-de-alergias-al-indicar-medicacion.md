# ADR 0030: Aviso de alergias al indicar medicación

## Estado

Aceptado (#362). Usa las alergias del ADR 0027. Precisa una consecuencia del ADR 0029: el aviso dice que hay una alergia de otro profesional que coincide, sin decir cuál.

## Contexto

Las alergias del paciente son parte de la historia clínica (#361), pero indicar medicación no las tenía en cuenta. La medicación y las alergias son texto libre: no hay catálogo de medicamentos ni de sustancias (#314). El triage de #362 fijó lo siguiente:

- El formulario muestra arriba las alergias vigentes que el profesional puede leer.
- La coincidencia es por texto, sin mayúsculas ni tildes.
- El aviso no bloquea: «Indicar igual» guarda la indicación y deja una fila propia en el registro de accesos.
- La indicación guarda qué alergias se le mostraron.
- Una alergia de otro profesional, sin el código del paciente (#364), avisa **sin el detalle**.

Quedaba por definir dónde se decide la coincidencia, cómo se confirma lo que se mostró y dónde se guarda.

## Decisión

**La coincidencia la decide la API, al guardar** (`ScreenMedicationForAllergiesAction`, antes de la Action que registra o enmienda):

- Una alergia coincide cuando su sustancia (la descripción de su última versión) aparece en el medicamento o en la presentación de algún ítem.
- Las dos se comparan plegadas: sin mayúsculas, sin tildes ni diéresis, con `ñ` como `n` y los espacios repetidos como uno (`App\Support\FoldedText`, el mismo mapa que la búsqueda CIE-10).
- Una alergia vigente es una que no se dio de baja. Solo cuentan las de la organización, como el resto de la historia.
- El panel no compara nada: una sola regla, en un solo lugar, y la única que puede tener en cuenta lo que el profesional no lee.

**Una enmienda se revisa igual que un registro nuevo**, porque indica de nuevo la lista completa de ítems.

**Cuenta toda alergia vigente, pero el detalle sigue la regla de lectura.** Una alergia que el profesional no ve podría dañar al paciente, así que todas cuentan. El detalle (sustancia, reacción y severidad) va en el aviso solo si el profesional la leería en la ficha:

- tiene que ser propia o estar abierta con el código del paciente (`readableBy`);
- y no tiene que hacer falta un acceso excepcional (`ClinicalAccess::requiresReason`).

Si el aviso muestra algún detalle, queda una lectura de los antecedentes en el registro de accesos, como en la ficha (ADR 0022). Las demás coincidencias van solo con su id. En ese caso el panel dice «El paciente tiene una alergia registrada que coincide con esta medicación. Pedile el código para verla.», o que abra la historia con un acceso excepcional, si es eso lo que falta.

**La confirmación es por id:**

- Sin confirmar, la API responde 409 `prescriptions.allergy_warning` con las alergias que muestra, los ids de las que no muestra y si falta un acceso excepcional.
- «Indicar igual» reenvía la medicación con esos ids en `confirmed_allergy_ids`.
- Si al guardar coincide una alergia que no está entre los confirmados (porque se registró en el medio o porque cambió la medicación), vuelve a avisar. Así lo guardado es exactamente lo que se mostró.
- El panel descarta el aviso si el profesional cambia los ítems, para que «Indicar igual» nunca confirme otra cosa.

**Lo confirmado se guarda por versión** (`prescription_allergy_warnings`), de solo agregado como la historia (ADR 0019). Lleva una fila por alergia con:

- la versión de la medicación;
- la fila del registro de accesos de la confirmación (acción `allergy_warning_overridden`, con la medicación y el turno);
- la alergia y la versión de la alergia que coincidió;
- si se mostró su detalle.

La fila de la confirmación se suma a la de `prescription_issued` o `prescription_amended`, en la misma transacción. La medicación y la exportación dicen, por versión, si se indicó pese a un aviso (`allergy_warning_overridden`), nunca qué alergia, que quien lee puede no ver.

**Las alergias vigentes de arriba del formulario** salen de `GET /appointments/{id}/allergies`:

- Solo para el profesional del turno.
- Es una lectura de los antecedentes con la misma regla que la ficha: pide el acceso excepcional sin un turno cercano y deja su fila, que se pliega con la de la ficha dentro de los 15 minutos.
- Trae solo las alergias vigentes que el profesional lee, no el resto de los antecedentes, que el formulario no usa.

## Alternativas descartadas

- **Comparar en el panel.** Duplicaría la regla en TypeScript y no podría avisar de lo que el profesional no lee.
- **Un endpoint que pregunte si una medicación coincide, antes de guardar.** Sería un oráculo: probando sustancias, cualquier profesional del turno averiguaría las alergias ocultas sin guardar nada. Al guardar, en cambio, la consulta es la indicación real y la confirmación queda registrada.
- **Confirmar con un booleano.** No garantiza que lo guardado sea lo que se mostró: una alergia registrada entre el aviso y la confirmación quedaría confirmada sin haberse visto.
- **Ocultar del todo las alergias de otro profesional sin código.** Es lo que pedía la letra del ADR 0029. El triage eligió avisar sin detalle, porque una indicación con una alergia conocida puede dañar al paciente. El aviso revela solo que existe una coincidencia con lo que se está indicando. Pasa al guardar y en un turno propio, y se puede volver más estricto sin migrar datos.
- **Guardar lo confirmado en la medicación y no en la versión.** Una enmienda cambia los ítems, y con ellos lo que coincide, como los diagnósticos de una nota (ADR 0020).
- **Una columna JSON en el registro de accesos.** El registro apunta a un registro por columna. Una tabla propia guarda varias alergias con claves foráneas y sin texto clínico.
- **Bloquear la indicación.** El triage la dejó como aviso: hay motivos clínicos para indicar igual (una desensibilización, una alergia mal cargada).

## Consecuencias

- Las familias de medicamentos (penicilina frente a amoxicilina) y las interacciones necesitan el catálogo de #314. Con texto libre, «Penicilina» sí coincide con «Bencilpenicilina», pero no con «Amoxicilina».
- Abrir el formulario de medicación lee las alergias del paciente, así que deja una lectura de los antecedentes en el registro de accesos.
- Un registro clínico nuevo con texto que deba compararse sin tildes usa `FoldedText`.
