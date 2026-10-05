# ADR 0012: Tokens de diseño en un paquete del workspace

## Estado

Aceptado.

## Contexto

El sistema visual de Clini (paleta verde azulado y menta, Outfit, radios, sombras, colores de estado del turno, modo oscuro) tiene que valer para todos los frontends: panel, dashboard y landing. Cada app tenía su propio `src/index.css` con su copia de las variables. Con tres copias, cambiar un color obliga a tocar tres archivos y nada avisa si una queda distinta (#252).

Los componentes de shadcn/ui ya están copiados en cada app: el CLI los escribe dentro de la app según su `components.json`, el ADR 0008 define cuándo se apartan del registry y la regla es no parchearlos. Esos componentes no tienen colores propios: usan los tokens (`bg-primary`, `rounded-lg`).

## Decisión

Los tokens de diseño viven en un paquete del workspace de npm, **`packages/theme` (`@clini/theme`)**, privado y nunca publicado. Contiene **solo CSS**, en un único archivo, `theme.css`:

- las variables de claro (`:root`) y oscuro (`.dark`) y su mapeo a Tailwind (`@theme inline`), incluidos los colores de estado del turno;
- la variante `dark`;
- la fuente Outfit, como dependencia del paquete (`@fontsource-variable/outfit`);
- los estilos base y las utilidades comunes: `focus-ring`, el colapso de animaciones con `prefers-reduced-motion` y el mínimo de 44 px para controles táctiles.

Cada app lo declara como dependencia (`"@clini/theme": "*"`) y lo importa desde su `src/index.css`, después de Tailwind y del CSS de shadcn:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';
@import '@clini/theme/theme.css';
```

Lo que es propio de una app se declara en su `index.css`, debajo del import: por ejemplo, el fondo con degradés y el `scroll-padding` de la landing, o la paleta de gráficos del dashboard.

Los componentes **no** se comparten: los primitivos de shadcn siguen copiados en cada app y toman los tokens a través de sus utilidades, así que cambian solos con el tema. La lógica en TypeScript (por ejemplo, los textos de los estados) tampoco va al paquete.

La landing es la primera app migrada (#252); panel y dashboard se migran en #234.

## Alternativas descartadas

- **Copiar el CSS a mano en cada app**: es lo que había. Tres copias que divergen sin que ninguna verificación lo detecte.
- **Un archivo importado por ruta relativa fuera de la app** (`@import '../../../packages/theme.css'`): no requiere tocar el workspace, pero cada contenedor de dev monta solo su app, y cada Dockerfile copia solo la suya. La ruta relativa tendría que funcionar en los tres entornos (host, contenedor, imagen) y la fuente seguiría siendo dependencia de cada app. Un paquete resuelve por `node_modules`, como cualquier otra dependencia, y declara sus propias dependencias.
- **Un paquete de componentes compartidos**: el CLI de shadcn escribe dentro de cada app y el ADR 0008 depende de poder comparar cada primitivo con el registry. Un paquete de componentes rompería ese flujo y obligaría a versionar y compilar TypeScript compartido, para resolver un problema que los tokens ya resuelven.

## Consecuencias

- `packages/*` es parte de `workspaces` en el `package.json` raíz. Los contenedores de dev montan `packages/` completo (lectura y escritura, como la app), y los Dockerfiles lo copian antes del `npm ci`. Los `Dockerfile.dockerignore` no lo excluyen (sí excluyen `packages/*/node_modules`).
- El paquete no se lista aparte en la instalación filtrada: `npm install|ci --workspace=apps/<app>` lo enlaza y le instala sus dependencias porque es dependencia de la app. Eso vale para el scope `frontends` de `.github/actions/setup-node`, para cada contenedor y para cada Dockerfile.
- En dev, Vite resuelve el paquete por el symlink de `node_modules` hasta su ruta real (`/workspace/packages/theme`) y la vigila: un cambio en `theme.css` llega por HMR a las apps que lo importan.
- El plugin de ESLint `tailwind-canonical-classes` (`cssPath: ./src/index.css`) y el `tailwindStylesheet` de Prettier resuelven el `@import` del paquete: los dos cargan el `index.css` con el resolvedor de Tailwind, que sigue `node_modules` y el campo `exports`. Verificado: ESLint sugiere `bg-mint` en lugar de `bg-[var(--color-mint)]`, y Prettier ordena `text-status-online-wash` como clase conocida.
- Ninguna configuración de Prettier de las apps cubre `packages/`. El CSS del paquete lo formatea el Prettier de la raíz (`npm run format` / `format:check`, incluidos en el job `e2e` de CI), y `run-forensics` lo corre cuando cambia algo en `packages/`.
- Un cambio en `packages/**` puede afectar a cualquier frontend, así que `run-forensics` verifica las tres apps.
- El mínimo táctil de 44 px aplica a `<button>`, `<a>` e `<input>` solo dentro de `#root`, el nodo donde se montan las SPA. La landing se renderiza en el servidor y no tiene `#root`, así que esa parte de la regla no la alcanza (solo los selectores por `data-slot`, que hoy no usa).
- Tailwind ya no escanea el archivo del tema como fuente de clases (está fuera de la app). No cambia nada mientras el paquete no tenga markup, y no debería tenerlo.
