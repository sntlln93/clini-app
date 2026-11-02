# ADR 0031: Catálogo de medicamentos como caché del Buscador Nacional de Medicamentos

## Estado

Aceptado (#377). Reabre en parte #227: el scraping masivo sigue descartado; se agrega la consulta bajo demanda. Excepción explícita a que los catálogos globales los escriba la app de catálogos.

## Contexto

La medicación indicada es texto libre (#319). El aviso de alergias (#362, ADR 0030) compara texto, así que no reconoce un nombre comercial: «Migral» no dice nada de la ergotamina que contiene.

#227 y #314 descartaron importar el vademécum. El dataset abierto de ANMAT tiene unas 60 filas de 2018, y el scraping masivo quedó descartado por fragilidad y por condiciones de uso.

El **Buscador Nacional de Medicamentos** del Ministerio de Salud (`argentina.gob.ar/precios-de-medicamentos`) lo listan la guía de la CUIR v3 como recurso para las plataformas y la Disp. DNSISA 1/2025 (art. 5), que exige su link en cada receta. Su página usa un endpoint JSON (probado el 31/10/2026):

- `POST https://cnpm.msal.gov.ar/api/vademecum` con `{"searchdata": "<término>"}` devuelve todas las filas, sin paginar. Con menos de 3 letras responde 500.
- Busca una subcadena contigua, sin mayúsculas ni tildes, en el nombre, la droga, el laboratorio y el troquel: «ctron» encuentra Actron, «actron plus» no encuentra nada. Por eso un término que contiene a otro devuelve un subconjunto de lo que devolvió el más corto.
- Cada fila trae GTIN, nombre, presentación, forma, vía, laboratorio, troquel, SNOMED, la droga (`DROGA` y su código), la acción terapéutica, la condición de expendio (`TIPO_DE_VENTA`), la marca de controlado (`D_MARCA_CONTROLADO`), la baja, la vigencia, la fecha de actualización y el precio.
- **No está documentado.** Lo usa la página oficial; la API documentada se pide en #379.

## Decisión

**Un catálogo propio que funciona como caché de lectura del Buscador**, llenado bajo demanda a medida que los profesionales buscan, nunca por importación masiva:

- `medication_products` tiene un producto por GTIN (normalizado a 14 dígitos) con todos esos campos menos el precio.
- `medication_ingredients` guarda las sustancias de la droga, con su texto original y su `substance` escrita completa.
- `medication_searches` registra el término y cuándo se consultó. Nunca registra quién buscó.

**Cobertura.** Como la respuesta viene completa, un término está cubierto cuando él, o uno más corto contenido en él, se consultó hace menos de 30 días (`MedicationSearch::COVERAGE_DAYS`, `scopeCovering`). Si no, la búsqueda consulta el Buscador y **guarda todo lo que devuelve**. La búsqueda local compara solo el nombre y la droga, campos en los que el Buscador también busca.

El término se registra y se consulta igual (`MedicationSearch::key()`): en minúsculas, sin tildes en las vocales y con los espacios colapsados, porque el relevamiento mostró que el Buscador no distingue mayúsculas ni tildes («cafeina» y «cafeína» devuelven lo mismo). No se probó si distingue «ñ» de «n», así que la clave la conserva: «niño» y «nino» se consultan por separado y ninguno cubre lo que solo el otro encontraría. La cobertura queda exacta sea cual sea la respuesta. El mínimo de 5 caracteres se cuenta sobre ese mismo término, con los espacios ya colapsados.

**Se guarda todo, se sugieren solo medicamentos.** El catálogo guarda los productos dados de baja y los que no son medicamentos (accesorios, tiras reactivas, suplementos, cosméticos), porque descartar parte de una respuesta haría que la cobertura respondiera después con menos. Las sugerencias los excluyen. La lista de lo que no es un medicamento es una sola constante, `MedicationProduct::NON_DRUG_MARKERS`, que compara la droga y la acción terapéutica. Deja afuera a propósito acciones dudosas, como «Cuidado de heridas» o «Lubricante ocular», porque incluyen medicamentos.

**La droga viene abreviada o cortada.** `App\Support\MedicationComposition` separa `DROGA` por «+» y deja cada sustancia en minúsculas, con sus tildes y sin sal ni hidrato: así la muestra el panel, y el aviso de alergias la pliega para comparar. Expande solo las abreviaturas de una tabla explícita (`pseudoef.`, `clorfeniram.`, `vit.`…) y las formas invertidas («clavulánico,ác.» es «ácido clavulánico», «metformina,clorh.» es metformina, «sodio,bicarbonato» es «bicarbonato de sodio»). Una lista de vitaminas como «vit.b1 b6 b12» son tres sustancias, para que una alergia a la vitamina B12 la encuentre. Una abreviatura desconocida queda como está. Cuando la lista termina en «asoc.» (Migral es «ergotamina+cafeína+asoc.», sin la dipirona), el producto queda marcado `composition_incomplete`: nunca se completa adivinando. La resolución completa por SNOMED queda para #376.

**Los controlados se marcan, no se bloquean.** La condición de expendio y la marca de controlado (nula para «NO CONTROLADO») quedan en el producto y en el ítem indicado, y el panel las muestra. Bloquear o exigir un circuito es de la receta (#314).

**Adaptador reemplazable.** El catálogo pregunta a `App\Contracts\MedicationSource` (`available()` y `search()`), que hoy implementa `NationalMedicationSearchService`. Una API documentada (#379) u otra fuente es otro adaptador y otro binding, sin tocar Actions, controllers ni el panel.

**Falla abierta.** El servicio tiene un timeout de 4 segundos. Una falla de conexión, un estado que no es 2xx o una respuesta que no es una lista JSON lo pausan 5 minutos. La búsqueda atrapa `medications.source_unavailable` y responde con lo que hay en la base, así que el campo sigue siendo texto libre. Está apagado por defecto (`NATIONAL_MEDICATION_SEARCH_ENABLED`), y `phpunit.xml` y el servicio `e2e` lo fijan apagado, así que los tests y el e2e nunca lo consultan aunque el `.env` local lo prenda. Los tests usan respuestas grabadas (`tests/Fixtures/NationalMedicationSearch`).

**Hacia afuera sale solo el término de búsqueda,** con un User-Agent que identifica a Clini. Nada del paciente ni del profesional. Los logs de una falla dicen qué paso falló, nunca el término.

**El ítem indicado guarda un snapshot.** Lleva el `gtin`, el `snomed`, las `substances`, si la fuente cortó la composición (`composition_incomplete`), la condición de expendio y la marca de controlado del producto. El servidor los copia del catálogo (`MedicationSnapshot`), nunca del pedido, como los diagnósticos CIE-10 (ADR 0020). Un cambio posterior del catálogo no reescribe la historia. Una enmienda que mantiene un producto conserva la copia de la versión que enmienda, nunca la actual del catálogo, como un diagnóstico que se mantiene: repetir los mismos ítems sigue siendo una enmienda sin cambios. El aviso de alergias compara también contra esas sustancias. Al enmendarlo, el panel muestra sus sustancias como al elegirlo: con «y otros que el Buscador no detalla» si la composición estaba cortada.

**Panel.** «Medicamento» sigue siendo texto libre:
- desde 5 caracteres sugiere hasta 10 productos;
- elegir uno completa el ítem con lo que trae la sugerencia, sin un segundo pedido;
- el campo lleva una ayuda que pide elegir una sugerencia o escribir el principio activo (Ley 25.649).

**Sustancias para las alergias (#383).** La «Sustancia» de una alergia también es texto libre, y desde 5 caracteres sugiere hasta 10 principios activos del catálogo (`GET /medication-substances`): las `substances` de los productos sugeribles que contienen el término plegado, una por forma plegada y primero las que empiezan con él. Llena el catálogo igual que la búsqueda de medicamentos (`FillMedicationCatalogAction`, con la misma cobertura, la misma pausa y el mismo límite `medication-search`), pero no depende del plan, porque las alergias están en todos. Elegida, la sustancia se guarda como texto tal como la nombra el catálogo, sin una marca de origen ni una columna nueva en la versión de la alergia: el aviso no la leería, porque ya busca la sustancia plegada dentro de las `substances` del producto elegido, y la columna nula que prevé el ADR 0027 queda libre para el código SNOMED de #376. Por la misma razón el aviso no cambia: una comparación exacta contra `substances` perdería coincidencias que hoy avisan, y las alergias escritas a mano siguen avisando igual.

## Alternativas descartadas

- **La consulta ZK de ANMAT** (`servicios.pami.org.ar/vademecum`, la primera versión de esta rama). No tiene API: hacía falta una sesión, cuatro pedidos para el detalle de cada producto y un parseo de HTML frágil. Además paginaba de a 10 filas, así que la cobertura dependía de saber si una respuesta vino completa.
- **El dataset abierto de ANMAT.** Tiene unas 60 filas de 2018 (#227).
- **Scraping masivo del Buscador.** Es pesado para un servidor que no es nuestro, y su endpoint no está documentado.
- **Guardar solo lo que se elige, o solo los medicamentos vigentes.** La base respondería con listas incompletas a quien busque después el mismo término.
- **Bloquear los controlados en la medicación indicada.** La medicación indicada no es una receta. El circuito de cada condición de expendio es de #314.
- **Que el panel hable directo con el Buscador.** Tiene CORS abierto, pero el navegador de cada profesional dependería de un sitio de terceros, sin caché compartida ni manera de cortar si falla.

## Consecuencias

- El endpoint puede cambiar o cerrarse sin aviso. Un cambio deja al catálogo con lo que ya tiene. El reemplazo previsto es la API documentada (#379), con su propio adaptador.
- El Buscador cubre los productos con precio, es decir, los comercializados. Un producto que solo lista ANMAT no aparece, y se indica como texto libre.
- Las familias de medicamentos, las alergias codificadas y la composición completa por SNOMED siguen en #376. Este catálogo les deja el SNOMED y las sustancias de cada producto.
- Una abreviatura nueva de la droga queda sin expandir hasta que se agrega a la tabla, y su sustancia no coincide con la alergia escrita completa.
- Clini escribe un catálogo global, pero solo a través del adaptador: sin CRUD ni pantalla, como especialidades, prestaciones y CIE-10.
