# ADR 0020: Diagnóstico CIE-10 de un catálogo externo, copiado en cada versión de la nota

## Estado

Aceptado (#324).

## Contexto

El diagnóstico era texto libre dentro de la nota clínica. La Ley 26.529 (art. 15, texto de la Ley 26.812) menciona la nomenclatura de la OMS, y un código estructurado sirve para la exportación de la historia (#326), para los reportes y para una futura interoperabilidad.

La nota es de solo agregado (ADR 0019): cada corrección es una versión nueva y un trigger rechaza todo `UPDATE` o `DELETE`. Los catálogos de referencia (especialidades, prestaciones) son globales, de solo lectura acá, y los administra una app externa.

## Decisión

**El catálogo CIE-10 es un dato de referencia global (`icd10_codes`), de solo lectura en Clini.** Lo carga y lo mantiene la app externa de catálogos, igual que las especialidades. Clini no tiene CRUD: solo `GET /api/v1/icd10-codes?q=`, que busca por el comienzo del código (con o sin punto) o por parte de la descripción, sin distinguir mayúsculas ni acentos, y devuelve hasta 20 resultados. Una búsqueda vacía no devuelve nada, porque el catálogo tiene miles de códigos. Un código dado de baja se borra con borrado suave: deja de ofrecerse, pero los diagnósticos que lo usan lo siguen apuntando.

Este repo no distribuye el catálogo. El seeder trae solo 16 códigos comunes para dev, test y la demo. La fuente del catálogo completo (la CIE-10 en castellano de la OPS o la lista de la DEIS) y su licencia de uso se resuelven al cargarlo en la app de catálogos, no acá.

**Los diagnósticos son parte de la versión de la nota.** `clinical_note_diagnoses` cuelga de `clinical_note_versions`, igual que los ítems de la medicación cuelgan de su versión. Una nota tiene de 0 a 10 diagnósticos, en el orden en que el profesional los cargó, sin repetir. El texto libre sigue: el código lo acompaña, no lo reemplaza.

**Cada diagnóstico copia el código y la descripción del catálogo** al escribirse, además de apuntarlo (`icd10_code_id`). Lo que se ve en la historia es lo que el profesional eligió, aunque el catálogo después cambie la descripción o dé de baja el código.

**Cambiar los diagnósticos es una enmienda.** La enmienda manda la lista completa (`icd10_code_ids`). Si no la manda, la versión nueva conserva los diagnósticos vigentes, así que corregir solo el texto nunca los pierde. Una enmienda que repite el texto y los diagnósticos responde 409 (`clinical_notes.amendment_unchanged`), y cambiar solo el orden cuenta como cambio. Un código dado de baja puede quedar en una enmienda si la versión vigente ya lo tenía, pero no se puede agregar.

**La tabla está protegida por el mismo trigger de solo agregado** que el resto de la historia clínica, con la misma excepción para la purga del seeder.

## Alternativas descartadas

- **Seguir solo con texto libre.** No se puede exportar ni contar de forma confiable.
- **Apuntar solo al catálogo, sin copiar código y descripción.** Un cambio en la app de catálogos reescribiría lo que muestra una nota ya firmada, justo lo que la historia de solo agregado evita.
- **Guardar los códigos en una columna JSON de la versión.** Pierde la clave foránea al catálogo y obliga a parsear para reportar.
- **Diagnósticos de la nota y no de la versión.** Cambiarlos obligaría a editar o borrar filas, que el trigger prohíbe, y la historia no mostraría qué diagnóstico tenía cada versión.
- **Importar la CIE-10 completa en este repo.** Duplica lo que hace la app de catálogos y nos obliga a resolver acá la licencia de redistribución.
- **SNOMED CT** (el estándar de las recetas, Res. 2214/2025). Queda para más adelante, con su propio issue.

## Consecuencias

- La exportación de la historia (#326) incluye los diagnósticos de cada versión con su código y su descripción tal como se escribieron.
- En producción el selector no encuentra nada hasta que la app de catálogos cargue la CIE-10. El texto libre sigue funcionando igual.
- Una baja o un cambio en el catálogo nunca altera la historia. Corregir un diagnóstico mal elegido es una enmienda.
- Migrar los diagnósticos que hoy están en el texto libre no se hace: el texto queda como se escribió.
