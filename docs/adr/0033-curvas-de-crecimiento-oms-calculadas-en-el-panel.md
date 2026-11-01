# ADR 0033: Curvas de crecimiento de la OMS calculadas en el panel

## Estado

Aceptado (#363). Usa las mediciones del ADR 0027 y la regla de lectura del ADR 0029.

## Contexto

El gráfico de evolución de las mediciones (#361) mostraba el peso, la altura, el IMC y el perímetro cefálico por fecha. A un pediatra le sirve verlos contra las curvas de crecimiento de la OMS, con el percentil de cada medición. El triage de #363 fijó el qué:

- Curvas P3, P15, P50, P85 y P97, con la fuente y la versión citadas en el repositorio, sin servicios externos.
- Se muestran para todo menor de 19 años, sin importar la especialidad del profesional.
- Sin fecha de nacimiento o con sexo «no informado» no hay curvas, y se explica por qué.
- Las mediciones de otro profesional entran solo si se canjeó el código del paciente.

Quedaba por definir dónde se calcula el percentil, de qué archivos salen las tablas y qué pasa con las edades que la OMS no publica.

## Decisión

**El percentil se calcula en el panel y no se guarda.** Es un dato derivado de la medición, la fecha de nacimiento, el sexo y una tabla fija. La API no lo calcula ni lo devuelve, y nada lo persiste. Así no hay datos de salud nuevos en la base: si cambiara la tabla, la fecha de nacimiento o el sexo, no habría que migrar ni enmendar nada en la historia (ADR 0019). La regla de lectura queda como estaba: el gráfico dibuja exactamente lo que devuelve `GET /patients/{id}/vital-signs`, que ya filtra con `readableBy` (ADR 0029).

**Las tablas son las de la OMS, en JSON dentro del panel** (`apps/panel/src/lib/growth-standards/data/`):

- Hasta los 5 años, los patrones de crecimiento de 2006. De 5 a 19 años, la referencia de 2007.
- Se toman de los archivos de percentiles ampliados que publica la OMS en su sitio. El README de esa carpeta lista las URL, la fecha de descarga y el SHA-256 de cada archivo.
- No se usan los paquetes `anthro`/`anthroplus`, que están bajo GPL. Sus datos son los mismos, pero la fuente citada es la publicación de la OMS.
- Las tablas diarias de 0 a 5 años se muestrean: cada día de las dos primeras semanas, cada semana hasta los 6 meses y cada mes después. La interpolación lineal queda a menos de 0,012 DE de la tabla diaria, menos de medio punto de percentil, y suman unos 60 KB que solo carga la página del paciente.
- `extract.py` regenera los JSON a partir de los archivos de la OMS. Los tests comparan las curvas con los P3–P97 publicados.

**La edad es la de cada medición**, en días calendario desde la fecha de nacimiento hasta el día de la medición en la zona del consultorio (ADR 0016). Un paciente que hoy tiene 20 años conserva las curvas de lo que se le midió de adolescente; una medición posterior a los 19 años aparece en el gráfico sin percentil.

**Lo que la OMS no publica se explica, no se extrapola:**

- La OMS no publica el peso para la edad después de los 10 años, porque no separa la talla del peso en la pubertad; desde ahí el IMC para la edad sigue el crecimiento.
- El perímetro cefálico se publica solo hasta los 5 años.
- Un menor fuera de esas edades ve el motivo en lugar de las curvas.
- Sin fecha de nacimiento, el motivo se muestra siempre, porque no se sabe si el paciente es menor.
- Con sexo «no informado» o sin sexo cargado, el motivo se muestra solo si alguna medición caería dentro de las curvas.
- El gráfico por fecha de #361 sigue igual en todos estos casos.

**La talla se toma como la mide la OMS en cada edad:** acostado hasta los 2 años y de pie después. El salto de 0,7 cm en la mediana a los 731 días es el de los patrones.

## Alternativas descartadas

- **Calcular el percentil en la API y devolverlo con cada medición.** Obligaría a definir la regla de vida de un dato derivado en una historia de solo agregado (¿se recalcula si se corrige la fecha de nacimiento?). Además, solo el panel lo dibuja. Si hiciera falta en la exportación (PDF o JSON), se calcula ahí con el mismo módulo.
- **Tablas diarias completas.** Son unos 450 KB para una precisión que no cambia el percentil mostrado.
- **Corregir el puntaje z más allá de ±3 DE, como hace el software de la OMS para el peso y el IMC.** Ahí el percentil ya se muestra como «< P1» o «> P99», así que el resultado visible es el mismo.
- **Mostrarlo solo a profesionales de pediatría.** El triage lo descartó: las curvas dependen de la edad del paciente, no de la especialidad.

## Consecuencias

- La exportación de la historia (ADR 0021) sigue con los valores crudos, sin percentiles. Sumarlos es un cambio del panel, sin tocar la API.
- Fuera de alcance, como fijó el triage: la edad corregida para prematuros, las curvas para condiciones específicas y las alertas por percentiles extremos.
