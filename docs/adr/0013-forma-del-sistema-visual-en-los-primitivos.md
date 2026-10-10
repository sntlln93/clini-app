# ADR 0013: Forma del sistema visual en los primitivos

## Estado

Aceptado.

## Contexto

El panel y el dashboard tienen que verse como la landing (#255). Los colores, la fuente, los radios y las sombras ya son compartidos: viven en `@clini/theme` (ADR 0012). Lo que no comparten es la **forma** de los dos componentes más repetidos:

- en la landing, los botones son píldoras (`CtaLink.tsx` agrega `rounded-full`) y las tarjetas principales son `rounded-3xl border bg-card shadow-card` con `p-6` (`RolesSection.tsx`, `PlanCard.tsx`);
- en el panel y el dashboard, `Button` y `Card` son los del registry de shadcn (`base-nova`): botón `rounded-lg`, con radios todavía menores en los tamaños chicos, y tarjeta `rounded-xl` con un `ring-1 ring-foreground/10` y 16 px de padding.

La landing resuelve la forma con clases en el punto de uso. En las SPA hay cientos de `Button` y `Card`.

## Decisión

La forma del sistema visual se aplica en `button.tsx` y `card.tsx` de `apps/panel/src/components/ui/` y `apps/dashboard/src/components/ui/`, como **customización deliberada y documentada** (categoría 2 del ADR 0008):

- **`button`**: la base pasa de `rounded-lg` a `rounded-full`, y se quitan los `rounded-[min(var(--radius-md),Npx)]` de los tamaños `xs`, `sm`, `icon-xs` e `icon-sm`, así todo tamaño es una píldora. Dentro de un grupo de botones se conserva `in-data-[slot=button-group]:rounded-lg`.
- **`card`**: `rounded-xl … ring-1 ring-foreground/10` pasa a `rounded-3xl border shadow-card`; `--card-spacing` pasa de `--spacing(4)` a `--spacing(6)` (24 px) y, en el tamaño `sm`, de `--spacing(3)` a `--spacing(4)`. Los redondeos de la imagen inicial y final, de `CardHeader` y de `CardFooter` acompañan con `-3xl`. `CardTitle` se queda con `font-medium`, que ya coincide con los títulos de la landing.

Los valores (colores, escala de radios, `--shadow-card`) siguen en `@clini/theme` (ADR 0012); los primitivos solo eligen qué token usar.

## Alternativas descartadas

- **Clases en cada punto de uso**, como `CtaLink` en la landing: no escala a cientos de `Button` y `Card`, cada pantalla nueva tendría que recordarlo y las pantallas terminarían con formas distintas.
- **Cambiar la escala de radios en `packages/theme`** (por ejemplo, que `--radius` valga más): alteraría también la landing y toda utilidad `rounded-*` de las tres apps (inputs, selects, popovers, badges), no solo botones y tarjetas.
- **Un override por `data-slot` en el CSS del paquete** (`[data-slot=button] { border-radius: … }`): pelea con las capas de Tailwind (una clase en el punto de uso ya no ganaría sin `!`), y la forma real del componente deja de leerse en su archivo.

## Consecuencias

- Una re-auditoría con `npx shadcn@latest add button --diff` / `card --diff` va a mostrar estas líneas: son divergencia esperada, registrada en [`docs/architecture/componentes-ui.md`](../architecture/componentes-ui.md), no drift a corregir.
- `button.tsx` y `card.tsx` deben quedar idénticos entre panel y dashboard; un cambio en uno se copia al otro en el mismo commit.
- La landing conserva su propio `button` sin modificar: sus píldoras siguen saliendo de `CtaLink`.
- Una pantalla que necesite otra forma o padding lo pide con `className` en el punto de uso; las tarjetas que ya anulan el padding (`px-0`, `py-0`) siguen funcionando igual.
