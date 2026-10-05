# ADR 0011: Landing con SSR en TanStack Start

## Estado

Aceptado.

## Contexto

Clini necesita un sitio público (`apps/landing`) que cuente el producto, muestre los planes y lleve al registro y al login del panel (#247). A diferencia del panel y el dashboard, es una página que tiene que encontrarse y compartirse: los buscadores y las vistas previas de links (WhatsApp, redes) leen el HTML que devuelve el servidor, y una SPA de Vite devuelve un `<div id="root">` vacío hasta que corre el JavaScript.

El ADR 0001 ya anticipaba una landing desplegable por separado, con SSR o estática. Había que elegir cómo, sin salir del stack de los otros frontends (React 19, TanStack Router, Tailwind 4 + shadcn/ui, Vite 8).

## Decisión

La landing se renderiza en el servidor con **TanStack Start** (el framework de TanStack Router con SSR, sobre Vite), y se despliega con **Nitro** como servidor Node (`node .output/server/index.mjs`).

- Mismas rutas por archivos, mismos componentes y la misma configuración de ESLint, Prettier y Vitest que panel y dashboard. Las rutas viven en `src/routes/`, con los componentes en `-components/` (ADR 0003).
- El `<head>` (título, description, Open Graph, favicon y el script que aplica el tema antes de pintar) lo arma la ruta raíz (`head()` + `shellComponent`). No hay `index.html`.
- La landing no habla con la API: no tiene sesión, loaders ni TanStack Query. Solo enlaza al panel (`VITE_PANEL_URL`, build arg).
- El tema es claro por defecto y no sigue al sistema operativo. El oscuro es una elección explícita, guardada en `localStorage`.

## Alternativas descartadas

- **SPA de Vite como panel y dashboard**: el HTML inicial no tiene contenido. Los buscadores que ejecutan JavaScript lo terminan viendo, pero las vistas previas de links no, y el primer render llega más tarde.
- **SPA con prerender a HTML estático en el build**: resolvería el contenido inicial con nginx, pero obliga a armar el prerender a mano sobre el router. Además, cualquier página futura que dependa del request (un formulario de contacto o un precio por región) tendría que cambiar de modelo. Con TanStack Start, el prerender estático se puede activar más adelante sin cambiar de framework.
- **Next.js o Astro**: dan SSR y SSG de forma nativa, pero suman un segundo router, otras convenciones y otra configuración de build a un monorepo donde todo lo demás es TanStack + Vite.

## Consecuencias

- La imagen de producción de la landing es un servidor Node (`node:24-bookworm-slim`, puerto 3000), no nginx. Nitro empaqueta sus dependencias en `.output`, así que la imagen final no lleva `node_modules`.
- `@tanstack/react-start` fija una versión exacta de `@tanstack/react-router`. Como el workspace comparte el lockfile, actualizar Start puede mover el router de panel y dashboard. Hay que correr sus verificaciones en la misma actualización.
- Nitro 3 se publica como beta (`3.0.x-beta` es su etiqueta `latest`), así que está fijado a una versión exacta.
- El texto de la landing tiene una regla propia: solo describe funciones que existen en el código desplegado. La sección de planes es la excepción conocida mientras los planes no existan (#237 y siguientes).
