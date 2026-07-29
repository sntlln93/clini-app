# ADR 0008: Criterio de divergencia respecto del registry de shadcn

## Estado

Aceptado.

## Contexto

`apps/panel/src/components/ui/` contiene 22 componentes vendorizados desde el registry de shadcn/ui (más `focus-visible.test.tsx` y `form.test.tsx`, que son tests locales sin contraparte en el registry y quedan fuera de este criterio). Al vendorizar el código en lugar de instalarlo como dependencia, cada componente puede divergir silenciosamente del registry con el tiempo: el publisher actualiza sus componentes, y nada avisa cuando el archivo local queda desactualizado.

El proyecto necesitaba, por un lado, una auditoría puntual (issue #110) que comparara los 22 componentes contra el registry y corrigiera lo que encontrara, y por otro, un criterio explícito para no tener que re-litigar caso por caso qué divergencias son aceptables y cuáles no.

Un hallazgo relevante de esa auditoría (ver #98) es que `mcp__shadcn__view_items_in_registries` no sirve como referencia para este trabajo: resuelve los componentes contra la variante `new-york-v4`/Radix del registry, no contra `base-nova` (el estilo real del proyecto, sin Radix — `apps/panel/components.json` declara `"style": "base-nova"` y no hay `radix-ui` en `package.json` ni en `node_modules`). Pedir `@shadcn/button` por esa vía devuelve `Dependencies: radix-ui`, una respuesta que ya delata la variante incorrecta. La herramienta correcta es el CLI vía contenedor (`docker compose exec --workdir /workspace/apps/panel panel npx shadcn@latest add <componente> --diff`), que sí resuelve `base-nova` correctamente.

## Decisión

**Criterio de admisión de una divergencia**: se acepta sólo si cae en una de estas dos categorías; todo lo demás es drift y se corrige.

1. **Ruido de formato del publisher**: el registry publica con su propio Prettier (2 espacios, comillas dobles, otro ancho de línea). Si al normalizar espacios y comillas ambas versiones dicen lo mismo, es ruido y se ignora — el Prettier de este proyecto es el que manda sobre el propio código.
2. **Customización deliberada y documentada**: una diferencia semántica que corresponde a un patrón ya establecido del proyecto, con su motivo verificable (un test, un uso real en `src/`, o un comentario en el propio archivo que lo explique). Ejemplos ya vigentes antes de esta auditoría: la utilidad `focus-ring` en lugar de repetir `outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` en cada componente; los props propios `size` en `avatar`/`select`/`switch` y `variant` en `dropdown-menu`; el hook propio `useTheme` (`@/hooks/use-theme`) en `sonner.tsx` en lugar de la dependencia `next-themes` que no forma parte del proyecto.

Todo lo que no encaje en ninguna de las dos categorías es **drift real** y se corrige aplicando el registry como fuente de verdad — incluido el drift con impacto visual: no se reclasifica como "customización deliberada" sólo porque cambie el aspecto de la pantalla. La única excepción es cuando adoptar el cambio del registry rompería un contrato de comportamiento del que dependen archivos fuera de `ui/` (por ejemplo, `alert-dialog.tsx`: el registry reescribió `AlertDialogAction`/`AlertDialogCancel` para componer un `<Button>` en lugar de envolver `AlertDialogPrimitive.Close`, lo que elimina el cierre automático del diálogo al hacer click — comportamiento del que dependen `ConfirmDialog.tsx` y `AvailabilityWarningDialog.tsx`. Adoptarlo a ciegas habría roto todo diálogo de confirmación de la app sin tocar esos archivos, que quedan fuera del alcance de esta auditoría). Estos casos se documentan como divergencia deliberada con su motivo, igual que las customizaciones preexistentes.

Toda corrección de drift real se aplica a mano con `Edit`, después de leer el diff — nunca con `--overwrite`, ni siquiera para un solo archivo, porque un overwrite no distingue entre drift y customización deliberada y borraría esta última.

## Alternativas descartadas

- **Overwrite masivo de los 22 componentes**: habría borrado las customizaciones deliberadas documentadas arriba (y varias más no descubiertas hasta auditar caso por caso).
- **Migrar de Base UI a Radix** para poder usar `view_items_in_registries` como referencia fiable: fuera de alcance — es integridad respecto del registry, no una decisión de esta auditoría, y el proyecto ya migró deliberadamente a Base UI.
- **Congelar los componentes** (no volver a auditar contra el registry): deja que el drift se acumule indefinidamente sin ningún mecanismo de detección.
- **Dejar las divergencias sin documentar**: sin un registro explícito de qué es customización y por qué, cada futura auditoría tendría que re-descubrir el mismo criterio desde cero, y el riesgo de que alguien "corrija" una customización deliberada tratándola como drift crece con cada vendorización nueva.

## Consecuencias

- El estado actual de los 22 componentes (tabla, veredicto y detalle de cada customización) vive en un documento aparte que se actualiza en cada re-auditoría: [`docs/architecture/componentes-ui.md`](../architecture/componentes-ui.md). Este ADR no lleva tabla — sólo el criterio.
- Re-auditar en el futuro implica repetir el mismo comando del CLI por componente y aplicar este mismo criterio de clasificación; el procedimiento concreto está en el doc de arquitectura, no acá.
- El quirk de `view_items_in_registries` con `new-york-v4`/Radix (#98) queda documentado como restricción permanente de la herramienta, no como algo a resolver.
