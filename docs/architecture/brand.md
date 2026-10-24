# Marca: logo, favicon e íconos

Todo elemento gráfico de la marca sale de un solo lugar: el paquete del workspace **`packages/brand` (`@clini/brand`)**, más `config/brand.php` para los mails de la API. Ningún componente, HTML ni vista de Blade escribe una ruta de marca a mano. Ver [ADR 0017](../adr/0017-marca-en-un-paquete-del-workspace-con-manifiesto.md).

```
packages/brand/
├── brand.config.ts   # el manifiesto: nombre, colores y el archivo de cada elemento
├── index.ts          # brand, brandAssetUrl(), brandHeadLinks(), webManifest()
├── vite.ts           # plugin de Vite: publica assets/ en /brand/ e inyecta los <link> en index.html
└── assets/           # los archivos; hoy, todos placeholders (*.placeholder.*)
```

## Cómo se publica

- El plugin `cliniBrand()` (en el `vite.config.ts` de panel, dashboard y landing) sirve cada archivo que nombra el manifiesto en **`/brand/<archivo>`** (solo esos: un archivo suelto en `assets/` no se publica): en dev con un middleware y en el build emitiéndolo junto al bundle del navegador. También genera `/brand/manifest.webmanifest` (nombre de la app e íconos de PWA, sin `display`: no convierte la app en una PWA standalone).
- **Panel y dashboard**: el plugin agrega al `<head>` de `index.html` los links de `brandHeadLinks()`: favicon ICO y SVG, ícono de Apple touch y web manifest. El sidebar muestra el isotipo con `BrandMark` (`src/components/BrandMark.tsx`) junto a `brand.name`.
- **Landing**: no tiene `index.html`; `__root.tsx` arma los mismos links con `brandHeadLinks()` y los `<meta>` con `brandMeta()` (`src/lib/brand-head.ts`): `theme-color` y `og:image`. `og:image` tiene que ser una URL absoluta, así que solo se declara si el build tiene `VITE_SITE_URL` (el origen público de la landing). `BrandMark` muestra el isotipo junto a `brand.wordmark`.
- **Mails (API)**: `config/brand.php` tiene el nombre (`BRAND_NAME`, default `Clini`) y la URL pública del logo (`BRAND_MAIL_LOGO_URL`). Sin esa variable, la URL es el `mailLogo` que publica el panel: `<primer origen de FRONTEND_URL>/brand/logotype-mail.placeholder.png`. Los mails propios lo muestran con `emails/partials/brand-header.blade.php`. Las notificaciones (suscripción, límite de turnos) usan el layout de Laravel, publicado en `resources/views/vendor/mail` y `vendor/notifications` para mostrar el logo y firmar con `brand.name` en lugar de `APP_NAME`. El logo lleva siempre `alt` con el nombre de la marca, con estilo de texto, para que se lea aunque el cliente bloquee las imágenes.

## Archivos y formatos

Para reemplazar un placeholder hay que respetar el formato y las proporciones de esta tabla. Los SVG tienen que ser autocontenidos: sin fuentes externas, con el texto convertido a trazos, porque un `<img>` no carga fuentes.

| Entrada del manifiesto | Archivo actual | Formato | Dimensiones | Dónde se usa |
|---|---|---|---|---|
| `isotype.light` | `isotype.placeholder.svg` | SVG | cuadrado, `viewBox` 32×32; se muestra a 32×32 px | sidebar de panel y dashboard, header de la landing (tema claro) |
| `isotype.dark` | `isotype-dark.placeholder.svg` | SVG | ídem | lo mismo, en tema oscuro |
| `logotype.light` | `logotype.placeholder.svg` | SVG | 32 de alto, ancho libre (hoy ≈80×32) | el membrete del PDF de la historia clínica, que arma el panel (ADR 0023); las apps usan isotipo + nombre en texto |
| `logotype.dark` | `logotype-dark.placeholder.svg` | SVG | ídem | disponible para las apps; hoy ninguna lo muestra (el PDF usa siempre el claro) |
| `favicon.svg` | `favicon.placeholder.svg` | SVG | cuadrado, `viewBox` 32×32 | favicon de las tres apps. Lleva un `@media (prefers-color-scheme: dark)` interno para leerse sobre pestañas claras y oscuras; revisarlo a 16 y 32 px |
| `favicon.ico` | `favicon.placeholder.ico` | ICO | 16, 32 y 48 px en el mismo archivo | favicon para navegadores sin soporte de SVG |
| `appleTouchIcon` | `apple-touch-icon.placeholder.png` | PNG opaco | 180×180 px, a sangre (iOS redondea las esquinas) | acceso directo en iOS |
| `pwaIcons` | `icon-192.placeholder.png`, `icon-512.placeholder.png` | PNG opaco | 192×192 y 512×512 px, a sangre | web manifest (Android, acceso directo) |
| `ogImage` | `og-image.placeholder.png` | PNG | 1200×630 px (el `width`/`height` de la entrada tiene que coincidir) | `og:image` de la landing |
| `mailLogo` | `logotype-mail.placeholder.png` | PNG (los clientes de mail no muestran SVG) | 96 px de alto, ancho libre (hoy 202×96, el logotipo con margen); se muestra a 32 px de alto | encabezado de todos los mails. Con fondo opaco (el placeholder: blanco con esquinas redondeadas), porque Apple Mail y Outlook en modo oscuro pintan el mail sobre casi negro y el verde azulado sin fondo no llega a 3:1. Un logo transparente solo sirve si se lee sobre fondo claro y oscuro |

El nombre (`name`, `wordmark`) y los colores (`themeColor`, `backgroundColor`) también salen del manifiesto. `themeColor` es el `--primary` claro de `@clini/theme`.

## Reemplazar un elemento

1. Copiar el archivo nuevo a `packages/brand/assets/`, con el formato y las dimensiones de la tabla.
2. Si cambió el nombre del archivo, actualizar su entrada en `brand.config.ts` y borrar el viejo. Si es el `mailLogo`, actualizar también el default de `apps/api/config/brand.php`, o definir `BRAND_MAIL_LOGO_URL`.
3. Ningún componente cambia. Los tests lo verifican: `brand-package.test.ts` (panel) comprueba que el manifiesto nombre exactamente los archivos de `assets/` (un archivo viejo que quedó sin borrar falla), que el tamaño real de los PNG con dimensiones fijas (`ogImage`, `pwaIcons`, `appleTouchIcon`) coincida con el declarado, que el build los emita y que el default de `config/brand.php` apunte al `mailLogo`. `brand-paths.test.ts` (en cada app) y `BrandMailHeaderTest.php` fallan si aparece una ruta de marca escrita a mano.

Mientras la marca sea provisoria, cada archivo lleva `.placeholder.` en el nombre, y los SVG llevan además un comentario `PLACEHOLDER (#236)`. `brand-package.test.ts` exige ese sufijo en cada archivo del manifiesto: cuando llegue el diseño definitivo, ese test se borra o se invierte junto con los placeholders.
