# ADR 0021: Exportación de la historia clínica: la genera quien atendió, con lo que ya puede leer, y no se guarda

## Estado

Aceptado (#326).

## Contexto

La Ley 26.529 (art. 14) da al paciente derecho a una copia de su historia clínica en 48 horas, y la Ley 10.549 de La Rioja (art. 3) le da acceso inmediato. Un consultorio que deja Clini tiene que conservar la historia 10 años (art. 18) y necesita llevársela (#329).

Hoy nadie del consultorio lee toda la historia. Cada profesional lee las notas de los pacientes que atendió, de cualquier autor (#217), y solo su propia medicación indicada (CU-53). El dueño representa al consultorio, que es el depositario de la historia, pero no lee notas. Quién del consultorio puede sacar la historia completa es una de las preguntas abiertas al abogado (#315).

Tampoco hay registro de accesos clínicos todavía (#325, que espera las respuestas de #315). Llegó después, en el ADR 0022.

## Decisión

**Exporta solo el profesional que atendió al paciente.** Usa la misma relación que abre las notas: tener o haber tenido un turno con él en el consultorio, o haberle escrito una nota (`Patient::attendedBy`). Nunca decide un rol: el dueño, un administrador o el personal sin esa relación reciben 403 al pedir la de un paciente, y una exportación vacía al pedir la de sus atendidos. Una exportación del consultorio entero por el dueño espera la respuesta de #315.

**Una exportación contiene exactamente lo que quien la genera ya puede leer, y nada de otro consultorio:**
- la identidad del paciente, sin teléfono ni mail, que no son parte de la historia;
- sus turnos en ese consultorio, con profesional, prestación, estado y motivo;
- las notas clínicas de todos los profesionales del consultorio, con cada versión, enmienda, diagnóstico CIE-10 (copiado como se escribió, ADR 0020) y anulación, cada una con su autor, fecha y hora;
- solo la medicación indicada por quien exporta, con sus versiones.

El autor de un acto se conserva aunque después se dé de baja su membresía, que es un borrado suave. Lo mismo vale para el profesional y la prestación de un turno.

**Dos alcances:**
- **Un paciente**, desde su ficha: PDF para leer o imprimir y JSON con los mismos datos estructurados. Los dos llevan un encabezado con quién la generó, dónde, cuándo y qué deja afuera. También aclaran que el documento no es una receta (CU-53).
- **Todos los pacientes que atendió quien exporta**, desde Ajustes: un solo JSON. En un consultorio unipersonal es la historia completa. En uno con varios profesionales, la unión de las exportaciones de cada uno cubre todas las notas y toda la medicación mientras sus autores sigan activos: cada acto tiene un autor que atendió a ese paciente. **No la cubre cuando un autor fue dado de baja**, porque ya no puede entrar a exportar: su medicación indicada, y las notas de un paciente que nadie más atendió, quedan sin nadie que las exporte. Eso lo resuelve la exportación del consultorio entero, que espera #315.

**Se genera en el momento y no se guarda.** El PDF lo arma dompdf en el servidor: es PHP puro, así que la imagen de producción no necesita extensiones nuevas. Corre sin acceso a la red ni al disco, sobre HTML que sale de una vista Blade propia. La exportación de todos los pacientes se transmite como un JSON en streaming, de a 50 pacientes, así que su tamaño nunca está entero en memoria. Ningún archivo queda en el servidor ni en el almacenamiento de objetos. Las respuestas llevan `Cache-Control: no-store`, y el nombre del archivo solo lleva el id del paciente, porque queda en el historial de descargas.

**Cada exportación queda registrada antes de generarse**, en `clinical_record_exports`: organización, membresía, paciente (nulo para todos los atendidos), alcance, formato y fecha. Es de solo agregado, con el mismo trigger que la historia (ADR 0019). El registro de accesos (#325, ADR 0022) no la absorbió: la exportación tiene alcance y formato propios. Suma una fila por cada paciente incluido, que apunta a esta. La exportación de un paciente sin un turno cercano pide el mismo motivo que leer su historia.

**Exportar es una lectura:** sigue disponible con la suscripción vencida (sin `subscription.active`) y en cualquier plan, para que un consultorio siempre pueda llevarse su historia. Tiene un límite de 10 por minuto por usuario.

## Alternativas descartadas

- **Que el dueño exporte todo el consultorio.** Expone notas que hoy el dueño no puede leer, y depende de una respuesta legal (#315). Habilitarlo después es agregar un permiso, sin migrar datos.
- **Incluir la medicación de los otros profesionales.** CU-53 dice que solo la ve quien la indicó, ni siquiera desde la ficha. La exportación no abre lo que la pantalla no muestra.
- **Generar la exportación del consultorio en segundo plano**, como un ZIP con un PDF por paciente, guardado para descargar después. Necesita `ext-zip`, que la imagen de producción no tiene, y guardar la historia completa en el almacenamiento de objetos (Cloudflare R2), cuya transferencia internacional está en consulta (#318). Si hace falta, va en su propio issue.
- **Imprimir desde el navegador** (una vista imprimible en el panel). No sirve para muchos pacientes, y el resultado depende del navegador.
- **Un PDF de todos los pacientes en el momento.** dompdf es lento y usa mucha memoria con documentos grandes, y chocaría con los límites de tiempo de PHP-FPM y nginx.

## Consecuencias

- El paciente recibe su copia a través del profesional que lo atendió. Un pedido directo del paciente es #327, y quién lo aprueba depende de #315.
- Hasta que exista la exportación del consultorio entero, la historia escrita por un profesional dado de baja solo sale en parte (sus notas, a través de quien atendió al mismo paciente). Antes de una baja, conviene que el profesional exporte la suya.
- Cuando #315 responda, ampliar quién exporta es cambiar la policy (`ClinicalRecordExportPolicy`) y, si corresponde, el contenido. Los datos no se migran.
- La baja de un consultorio (#329) puede ofrecer esta exportación a cada profesional, pero no la reemplaza: la devolución o la custodia se definen ahí.
- La exportación incluye el registro de accesos del paciente (#325, ADR 0022): una lista más del JSON (`access_log`) y una sección más del PDF.
