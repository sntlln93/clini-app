# Componentes UI (shadcn) — estado de la auditoría

Este documento lleva el **estado actual** de los 22 componentes vendorizados en `apps/panel/src/components/ui/` respecto del registry de shadcn/ui. El *criterio* que decide qué divergencia se acepta y cuál se corrige vive en [ADR 0008](../adr/0008-criterio-de-divergencia-del-registry-de-shadcn.md) — este documento no lo repite, sólo aplica ese criterio y registra el resultado.

**Última auditoría**: 2026-07-29 (issue #110).

## Cómo re-correr la auditoría

Por componente, desde la raíz del repo:

```bash
docker compose exec --workdir /workspace/apps/panel panel npx shadcn@latest add <componente> --diff
```

Nunca `--overwrite`: toda corrección de drift real se aplica a mano con un editor, después de leer el diff, para no perder las customizaciones deliberadas de la tabla de abajo. `mcp__shadcn__view_items_in_registries` no sirve como referencia — resuelve contra `new-york-v4`/Radix, no contra `base-nova` (ver ADR 0008).

## Tabla de los 22 componentes

| Componente | Estado tras la auditoría | Divergencias respecto del registry |
|---|---|---|
| `alert-dialog` | Drift real corregido | `AlertDialogContent` con prop `size` y `focus-ring` (customización deliberada, ver detalle abajo); clases de `Header`/`Footer`/`Title`/`Description` actualizadas; nuevo subcomponente `AlertDialogMedia`. `AlertDialogAction`/`AlertDialogCancel` **no** se migraron a la composición con `<Button>` del registry (ver detalle abajo) |
| `avatar` | Sin divergencias | Sólo ruido de formato (orden de imports) |
| `badge` | Customización deliberada | `focus-ring` en lugar de `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` |
| `breadcrumb` | Drift real corregido | `Breadcrumb` gana passthrough de `className`; `break-words` → `wrap-break-word`; espaciados de `BreadcrumbItem`/`BreadcrumbList` ajustados; `BreadcrumbEllipsis` de `size-9` a `size-5`; iconos renombrados a `ChevronRightIcon`/`MoreHorizontalIcon` |
| `button` | Customización deliberada | `focus-ring` en lugar de `outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` |
| `checkbox` | Customización deliberada | Mismo patrón `focus-ring` que `button` |
| `dialog` | Customización deliberada | Mismo patrón `focus-ring` que `button` |
| `dropdown-menu` | Customización deliberada | `DropdownMenuTrigger` aplica `focus-ring` sólo cuando no recibe `render` (comentario en el propio archivo: un target de `render`, como `Button` o `SidebarMenuButton`, ya trae su propia receta de foco) |
| `form` | Sin divergencias | Idéntico al registry (`--diff` no reporta cambios) |
| `input` | Customización deliberada | Mismo patrón `focus-ring` que `button` |
| `label` | Sin divergencias | Sólo ruido de formato |
| `pagination` | Drift real corregido (parcial) | `PaginationContent` de `gap-1` a `gap-0.5`; `PaginationPrevious`/`PaginationNext` ganan `data-icon`, prop `text` (con default en español) y ocultamiento responsive del texto en mobile. **No** se adoptó el cambio del registry que convierte `PaginationLink` en ancla (`nativeButton={false}` + `render={<a/>}`): `DataTablePagination.tsx` (fuera de `ui/`) pasa `onClick`/`disabled` asumiendo semántica de botón, y la paginación de esa pantalla es #90 |
| `radio-group` | Drift real corregido | `RadioGroup` de `gap-3` a `w-full gap-2`; `RadioGroupItem` gana área de toque (`after:-inset-x-3 after:-inset-y-2`), fondo al marcarse (`data-checked:bg-primary`) y el indicador pasa de pseudo-elemento a `<span>` real |
| `select` | Customización deliberada | Mismo patrón `focus-ring` que `button` |
| `separator` | Sin divergencias | Sólo ruido de formato |
| `sheet` | Customización deliberada | Mismo patrón `focus-ring` que `button` |
| `sidebar` | Drift real corregido | `SidebarMenu` de `gap-1` a `gap-0.5`. Se descartó la directiva `"use client"` que agrega el registry: no tiene efecto en una SPA sin SSR y está prohibida en todo `src/**` (CLAUDE.md) |
| `skeleton` | Sin divergencias | Sólo ruido de formato |
| `sonner` | Customización deliberada + drift real corregido | Customización: `useTheme` propio (`@/hooks/use-theme`) en lugar de la dependencia `next-themes`, que el proyecto no usa. Drift corregido: faltaban los íconos por tipo de toast (`icons`), la variable `--border-radius` y `toastOptions.classNames` |
| `switch` | Customización deliberada | Mismo patrón `focus-ring` que `button` |
| `table` | Sin divergencias | Idéntico al registry (`--diff` no reporta cambios) |
| `tooltip` | Sin divergencias | Sólo ruido de formato (orden de exports). Se descartó la misma directiva `"use client"` que en `sidebar` |

## Detalle de cada customización deliberada

- **`focus-ring` (alert-dialog, badge, button, checkbox, dialog, input, select, sheet, switch)**: utilidad propia que reemplaza la repetición de `outline-none focus-visible:border-ring focus-visible:ring-[3px]/[3] focus-visible:ring-ring/50` en cada componente. Preexistente a esta auditoría, con test dedicado (`focus-visible.test.tsx`) y uso en los 9 componentes listados.
- **`dropdown-menu` — `focus-ring` condicional en `DropdownMenuTrigger`**: sólo se aplica cuando el trigger no recibe `render`. Documentado en un comentario en el propio archivo: un target de `render` (`Button`, `SidebarMenuButton`) ya trae su propio anillo de foco, y aplicar `focus-ring` también ahí lo duplicaría.
- **`sonner` — `useTheme` propio**: el proyecto no depende de `next-themes` (no está en `package.json`); en su lugar usa `@/hooks/use-theme`, con su propio proveedor (`src/features/theme/ThemeProvider.tsx`) y su propio toggle (`ThemeToggle.tsx`).
- **`avatar`, `select`, `switch` — prop `size` propio**; **`dropdown-menu` — prop `variant` propio**: preexistentes a esta auditoría, no tocados por el registry en este ciclo (sin diferencia reportada por `--diff` en esos props puntuales).
- **`alert-dialog` — `AlertDialogAction`/`AlertDialogCancel` no migrados a `<Button>`**: el registry reescribió ambos para componer un `<Button>` en lugar de envolver `AlertDialogPrimitive.Close`. Ese cambio elimina el cierre automático del diálogo al hacer click, comportamiento del que dependen `ConfirmDialog.tsx` (`src/components/`) y `AvailabilityWarningDialog.tsx` (`src/routes/_auth/agenda/-components/`). Adoptarlo habría roto todo diálogo de confirmación de la app sin tocar esos archivos, fuera del alcance de esta auditoría (ver ADR 0008).

## Composiciones incompletas detectadas

- **`sidebar` — `SidebarRail` no usado**: `sidebar.tsx` exporta `SidebarRail` (el handle de arrastre en el borde del sidebar en desktop) pero `PanelSidebar.tsx` (`src/features/panel-sidebar/`) no lo monta. La única forma de alternar el sidebar hoy es el botón `SidebarTrigger` en `PanelHeader`. Corrección contenida en `src/features/`, fuera del alcance de esta auditoría — queda para issue aparte.
- El resto de los componentes multi-parte (`alert-dialog`, `dialog`, `sheet`, `dropdown-menu`, `select`, `table`, `tooltip`) tienen composición completa: todas las partes usadas en `src/` respetan el agrupamiento esperado (por ejemplo, `SelectItem` siempre dentro de `SelectContent`; `Tooltip`/`Sidebar` con sus `Provider` montados una sola vez en `PanelLayout.tsx`).
- `DataTablePagination` y la falta de paginación en profesionales quedan excluidos: son #90.
