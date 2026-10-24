# ADR 0023: Los PDF y los archivos descargables se arman en el frontend

## Estado

Aceptado (#325). Reemplaza la parte del ADR 0021 que generaba el PDF en el servidor.

## Contexto

La exportación de la historia clínica (ADR 0021) armaba el PDF en la API con dompdf, a partir de una vista Blade, y devolvía tanto el PDF como el JSON como archivos adjuntos (`Content-Disposition: attachment`). Probándolo aparecieron límites del renderer:
- `counter(pages)` no funciona en dompdf, así que el pie decía «Página 1 de 0».
- Un membrete con el logo obligaba a que la API tuviera su propia copia de un archivo de marca, porque dompdf corre sin acceso a la red. El ADR 0017 descartó esa copia.

El panel ya tiene la marca (`@clini/brand`), la zona horaria del consultorio, las etiquetas de cada estado y la redacción del registro de accesos. Por eso el documento puede armarse ahí, con los mismos datos que la API ya devuelve.

## Decisión

**La API no genera PDF ni archivos descargables.** Devuelve datos (JSON), y el panel arma el archivo en el navegador y lo descarga. La única excepción son los adjuntos de un mail o algo equivalente, que la API arma porque nadie más los puede armar. Hoy es solo el `.ics` del recordatorio (`app/Mail`).

- `GET /patients/{id}/clinical-record?format=pdf|json` devuelve el JSON de la historia, sin adjunto. `format` sigue siendo obligatorio y queda en el registro de la exportación (ADR 0021), porque dice qué archivo se va a armar.
- `GET /clinical-record/attended-patients` sigue enviando su JSON de a 50 pacientes, también sin adjunto. El panel lo guarda tal como llega.
- **El PDF lo arma pdfmake en el panel** (`src/lib/clinical-record-pdf/`):
  - El membrete de cada página lleva el logotipo del manifiesto (`logotype.light`), que el panel sirve desde su propio origen. Si no se puede leer, muestra el nombre de la marca.
  - El pie numera «Página n de N» con el total real.
  - Un título nunca queda solo al final de una página.
  - pdfmake y sus fuentes pesan unos 2 MB y se cargan en un chunk aparte, solo cuando alguien pide un PDF.
- Un ArchTest falla si algo de `app/` o `routes/`, fuera de `app/Mail`, responde con un adjunto (`Content-Disposition`, `attachment;`, `download()`, `streamDownload()`), o si `composer.json` vuelve a pedir una biblioteca de PDF.

## Alternativas descartadas

- **Seguir con dompdf y numerar las páginas desde PHP** (`page_script`). Arregla el pie, pero deja el membrete atado a una copia del logo en la API y mantiene una biblioteca y una vista Blade que duplican lo que el panel ya sabe mostrar.
- **Un navegador headless en el servidor** (Browsershot o Chromium). Agrega Chromium a la imagen de producción y un proceso pesado por cada exportación.
- **Imprimir desde el navegador**, que el ADR 0021 ya había descartado. El resultado depende del navegador, y no sale un archivo igual para todos.

## Consecuencias

- La API ya no tiene dompdf, ni el contrato `PdfRenderer`, ni la vista `clinical-records/patient.blade.php`.
- El PDF solo existe en el navegador que lo pidió. Lo que el servidor registra no cambia: la fila de `clinical_record_exports` con su formato, y una fila por paciente en su registro de accesos (ADR 0022).
- Un PDF nuevo se arma igual: un constructor puro de la definición de pdfmake, testeable sin generar el archivo, y una función que carga pdfmake y lo renderiza.
- Si algún día un PDF tiene que salir por mail, entra en la excepción y se arma en la API.
- pdfmake queda fijado en una versión exacta (`0.3.11`). Subirlo es un cambio deliberado.
