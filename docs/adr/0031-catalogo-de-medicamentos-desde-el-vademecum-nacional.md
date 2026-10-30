# ADR 0031: Catálogo de medicamentos como caché de la consulta pública del Vademécum Nacional

## Estado

Aceptado (#377). Reabre en parte #227: el scraping masivo sigue descartado; se agrega la consulta bajo demanda. Excepción explícita a que los catálogos globales los escriba la app de catálogos.

## Contexto

La medicación indicada es texto libre (#319). El aviso de alergias (#362, ADR 0030) compara texto, así que no reconoce un nombre comercial: «Migral» no dice nada de la dipirona que contiene.

#227 y #314 descartaron importar el vademécum. El dataset abierto de ANMAT tiene unas 60 filas de 2018, y el scraping masivo de la consulta en línea quedó descartado por fragilidad y por condiciones de uso.

La consulta pública del Vademécum Nacional de Medicamentos (`servicios.pami.org.ar/vademecum`) es una aplicación ZK sin API. Trae lo que hace falta: certificado, laboratorio, nombre comercial, forma farmacéutica, presentación y GTIN en el listado, y los ingredientes farmacéuticos activos (IFA) en el detalle. Su protocolo se verificó a mano: abrir el listado (sesión y desktop), mandar los eventos `onChange` y `onClick` a `/zkau`, hacer `onClick` en la lupa de una fila, recibir un `redirect` a `presentacion.zul` y leerla en la misma sesión. El detalle no tiene URL propia: lee el producto elegido de la sesión.

## Decisión

**Un catálogo propio que funciona como caché de lectura de esa consulta**, llenado bajo demanda a medida que los profesionales buscan, nunca por importación masiva:

- `medication_products` tiene un producto por GTIN, con el listado de ANMAT, la búsqueda que lo listó y, cuando llega, su detalle.
- `medication_ingredients` guarda los IFA del detalle. Cada uno tiene su `substance`: el nombre sin sal ni hidrato, plegado (`MedicationSubstance`). ANMAT escribe «DIPIRONA SODICA» en un producto y «DIPIRONA» en otro, y no llena «IFA (como)» de forma consistente.
- `medication_searches` registra el término plegado, si la respuesta vino completa y cuándo. Nunca registra quién buscó.

**Cobertura.** El catálogo responde solo cuando el término está cubierto:

- se buscó en los últimos 30 días (`MedicationSearch::COVERAGE_DAYS`);
- o lo contiene un término más corto, buscado en ese plazo, que vino completo (menos de una página de ANMAT, 10 filas).

Si no, consulta ANMAT por nombre comercial y, si esa página no se llenó, por nombre genérico, y **guarda todo lo listado**. Guardar solo lo elegido respondería búsquedas posteriores con una lista parcial sin decirlo.

**El detalle, sin guardar sesiones.** Al elegir un producto, la API rehace la búsqueda que lo listó, ubica la fila por GTIN, hace el clic y lee la página del detalle. Son cuatro pedidos, **una sola vez por producto**: los IFA quedan guardados.

**Adaptador reemplazable.** El catálogo pregunta a `App\Contracts\MedicationSource`, que hoy implementa `AnmatVademecumService`. Otra fuente es otro adaptador y otro binding, sin tocar Actions, controllers ni el panel: el vademécum del recetario de #314 o la app de catálogos.

**Falla abierta.** El servicio tiene timeout de 4 segundos. Cualquier falla lo deja sin consultar 5 minutos. Una fuente caída o apagada responde solo con lo que hay en la base, y el campo sigue siendo texto libre. Está apagado por defecto (`ANMAT_VADEMECUM_ENABLED`), así que tests, CI y e2e nunca lo consultan. Se prende por variable de entorno donde haga falta.

**Hacia ANMAT sale solo el término de búsqueda,** con un User-Agent que identifica a Clini. Nada del paciente ni del profesional. Los logs de una falla dicen qué paso falló, nunca el término.

**El ítem indicado guarda un snapshot.** Lleva `gtin` y las `substances` del producto, que el servidor copia del catálogo (`MedicationSnapshot`), nunca del pedido, como los diagnósticos CIE-10 (ADR 0020). Un cambio posterior del catálogo no reescribe la historia. El aviso de alergias compara también contra esas sustancias.

**Panel.** «Medicamento» sigue siendo texto libre:
- desde 5 caracteres, y solo después de que el profesional escribe, sugiere hasta 10 productos;
- elegir uno completa el nombre y la presentación, y muestra los principios activos;
- volver a escribir desvincula el producto.

## Alternativas descartadas

- **Scraping masivo del vademécum.** Son unos cuatro pedidos por producto, decenas de miles de productos y una sesión por recorrido. Es frágil y pesado para un servidor que no es nuestro (#227).
- **Guardar solo lo que se elige.** La base respondería con listas incompletas a quien busque después el mismo término.
- **Guardar la sesión ZK de la búsqueda para el detalle.** Hay que mantener estado entre pedidos, y la sesión vence. Rehacer la búsqueda cuesta lo mismo y pasa una vez por producto.
- **Que el panel hable directo con ANMAT.** El navegador de cada profesional dependería de un sitio de terceros, sin caché compartida ni manera de cortar si falla.
- **Esperar el vademécum del recetario (#314).** Sigue siendo el reemplazo previsto, pero depende de una decisión comercial. El adaptador permite cambiar de fuente sin migrar.

## Consecuencias

- Las familias de medicamentos y las alergias codificadas siguen en #376. Este catálogo le da el principio activo de cada producto.
- La consulta de ANMAT puede cambiar sin aviso: un cambio de estructura deja al catálogo con lo que ya tiene. Un chequeo programado que avise de eso queda como seguimiento.
- Clini escribe un catálogo global, pero solo a través del adaptador: sin CRUD ni pantalla, como especialidades, prestaciones y CIE-10.
- El pedido formal del vademécum completo a ANMAT (Ley 27.275) sigue valiendo: si llega, se importa por la misma tabla y la cobertura deja de hacer falta.
