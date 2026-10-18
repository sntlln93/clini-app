# ADR 0017: Marca en un paquete del workspace, con manifiesto

## Estado

Aceptado. Amplía el [ADR 0012](0012-tokens-de-diseno-en-un-paquete-del-workspace.md).

## Contexto

Clini todavía no tiene logo definitivo (#236). Panel y dashboard servían el favicon de la plantilla de Vite, el panel además un sprite de íconos de la plantilla sin uso, la landing dibujaba un isotipo provisorio en código, y los mails no tenían logo: las notificaciones de suscripción mostraban el nombre de `APP_NAME` (en dev, «Laravel») y firmaban «Regards, Laravel». Se decidió no esperar el diseño: implementar todo con placeholders, de modo que reemplazar la marca después sea cambiar archivos y una configuración, sin tocar componentes.

## Decisión

- Los archivos de marca viven en un paquete del workspace, **`packages/brand` (`@clini/brand`)**, junto a un **manifiesto en TypeScript** (`brand.config.ts`) con el nombre, los colores y el archivo de cada elemento (isotipo y logotipo en claro y oscuro, favicon SVG e ICO, ícono de Apple touch, íconos de PWA, `og:image` y logo para mails). Es el único lugar que nombra un archivo de marca.
- El paquete trae un **plugin de Vite** (`@clini/brand/vite`) que publica `assets/` en `/brand/` (middleware en dev, `emitFile` en el build del navegador), genera el web manifest de cada app e inyecta los `<link>` del `<head>` en `index.html`. La landing, sin `index.html`, arma los mismos links desde `brandHeadLinks()` en su ruta raíz.
- Los componentes que muestran la marca (`BrandMark` y el header del sidebar o de la landing) siguen siendo **de cada app**. Leen el manifiesto, pero no se comparten.
- La API no lee el manifiesto: **`config/brand.php`** tiene el nombre y la URL pública del logo para mails. Su default es el archivo que publica el panel (el primer origen de `FRONTEND_URL`), y `BRAND_MAIL_LOGO_URL` lo reemplaza. Un test del panel verifica que ese default nombre el `mailLogo` del manifiesto.
- Los mails propios incluyen un partial de encabezado. Para las notificaciones de Laravel se publican solo las vistas que nombran la marca (`vendor/mail/html/{header,layout,message}`, `vendor/mail/text/message` y `vendor/notifications/email`), con `brand.name` en lugar de `APP_NAME` y los textos fijos en español.
- `og:image` necesita una URL absoluta: la landing la arma con un build arg nuevo y **opcional**, `VITE_SITE_URL`. Sin él, no declara `og:image`.

Esto amplía el ADR 0012: los paquetes del workspace pueden compartir **datos y herramientas de build en TypeScript** (un manifiesto, un plugin de Vite). La regla de no compartir **componentes** sigue igual.

## Alternativas descartadas

- **Copiar los archivos al `public/` de cada app** (a mano o con un paso previo al build): son tres copias que divergen, o archivos generados dentro del árbol de cada app que hay que ignorar en git y regenerar antes de `vite dev`. El plugin sirve y emite desde la única copia, sin escribir en las apps.
- **Manifiesto en JSON**: en teoría lo podría leer también PHP, pero la API no ve el paquete (ni el contenedor de Sail ni su imagen lo montan), así que igual necesitaría su propia configuración. Y las apps necesitan, junto al dato, helpers (URLs, links del `<head>`, web manifest) con tipos literales, que un `.ts` con `as const` da sin otra pieza.
- **Que la API sirva su propia copia del logo de mails**: duplica un archivo de marca fuera del paquete. El panel ya es público y es el origen de los links de los mails.
- **Isotipo como componente SVG en línea**: es lo que había en la landing. Cambiar la marca obligaría a tocar componentes, y no sirve para favicon, `og:image` ni mails.
- **SVG en los mails**: Gmail y Outlook no lo muestran; el logo de mails es un PNG.

## Consecuencias

- Las tres apps dependen de `@clini/brand`. Los Dockerfiles ya copian `packages/` completo, y los contenedores de dev lo montan.
- El código TypeScript del paquete lo chequean el `tsc` de cada app (lo importan `vite.config.ts` y `src/`) y el ESLint y el Prettier de la raíz (`npm run lint:check` y `format:check` cubren `packages/**/*.ts`). El paquete no tiene runner de tests propio: lo cubre `apps/panel/src/tests/brand-package.test.ts`.
- Cada app tiene un `brand-paths.test.ts` que falla si aparece una ruta de marca escrita a mano en `src/`, `index.html` o `public/`. En la API, `BrandMailHeaderTest.php` hace lo mismo sobre `app/` y `resources/views`.
- Reemplazar la marca es reemplazar archivos de `packages/brand/assets/` y, si cambia algún nombre, su entrada en el manifiesto (y el default de `config/brand.php` para el logo de mails). Ver [Marca](../architecture/brand.md).
