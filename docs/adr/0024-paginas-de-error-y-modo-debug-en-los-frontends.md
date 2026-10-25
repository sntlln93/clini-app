# ADR 0024: Páginas de error y modo debug en los frontends

## Estado

Aceptado.

## Contexto

Antes de #304, ninguna app definía una página de error propia por encima de los `RouteErrorState` de cada módulo ([ADR 0009](0009-contrato-de-errores-de-dominio.md)). Todo lo que esos recuadros no atrapaban (el guard de sesión de `_auth`, un layout, una página sin `errorComponent`, la landing entera) caía al `ErrorComponent` por defecto de TanStack Router: un «Something went wrong!» en inglés, sin estilos ni marca, con un botón que muestra `error.message` también en producción. ADR 0009 decía que ese caso era una pantalla en blanco; no lo era.

Además, `mapToAppError` descartaba el status de todo lo que no fuera 401/403/419/422/429: un 404, un 500 y un 503 eran el mismo «error inesperado» con un «Reintentar» que no podía funcionar. El guard de sesión convertía cualquier falla de `GET /me` (API caída, sin conexión, 500) en un redirect al login, así que una caída se veía como un cierre de sesión. Y la API respondía `{"message":"Server Error"}` a todo 500 aun con `APP_DEBUG=true`, mientras que a un 404 sí le agregaba la traza.

## Decisión

1. **Una página por situación, en cada app.** El panel y el dashboard comparten `src/features/error-page/` (idéntico salvo `error-page-config.ts`, que lleva los textos, la acción de inicio y la ayuda de cada app); la página elige su variante (400, 401, 403, 404, 408, 419, 429, 500, 503 y sin conexión) por el `AppError`, que ahora conserva el status (`BusinessError.status`, `UnexpectedError.status`). La raíz tiene `errorComponent` (`RootErrorState`, a pantalla completa) y los módulos siguen con `RouteErrorState` dentro del chrome. La landing usa `defaultErrorComponent`/`defaultNotFoundComponent` con su propio header y footer. Las páginas del paciente (`/reservar`, `/turno`) conservan las suyas ([ADR 0018](0018-datos-minimos-en-lo-que-sale-hacia-el-paciente.md)).
2. **Las ilustraciones son SVG en línea pintados con los tokens del tema** (`fill-glow`, `fill-card`, `stroke-foreground`, `fill-primary`…), así siguen el modo claro y el oscuro sin archivos por tema. Son componentes, así que se copian por app como el resto ([ADR 0012](0012-tokens-de-diseno-en-un-paquete-del-workspace.md): el paquete de tema comparte tokens, nunca componentes).
3. **El modo debug del frontend es un build arg, `VITE_APP_DEBUG`**; sin definir, sólo lo activa el servidor de desarrollo, así que una imagen de producción nunca lo muestra salvo que se lo pidan. Como Laravel, el detalle exacto (excepción, mensaje, archivo, solicitud y traza, de la API o del propio JS) reemplaza sólo la página de un error inesperado; un 404 o un 403 siguen siendo su página.
4. **La API devuelve el detalle de un 500 sólo con `APP_DEBUG`**, y sin `APP_DEBUG` un 404 de un modelo no nombra la clase ni el id.
5. **El guard de sesión sólo manda al login ante una respuesta sobre la sesión** (401, 403, una regla de negocio); una falla de red o un 5xx sube a la página de error de la raíz.

## Alternativas descartadas

- **Leer el `APP_DEBUG` de la API en tiempo de ejecución** (p. ej. un campo en `/ping`): expone públicamente si el servidor está en debug y ata el frontend a una llamada más antes de poder mostrar un error. El debug del frontend se decide al construir la imagen, como el resto de sus `VITE_*`.
- **Mostrar el detalle debajo de la página amigable en debug, para todo error**: el issue pide el error exacto en lugar de la página, y mostrarlo también en un 404 o un 403 confunde un error que el usuario resuelve con uno de código. Se sigue el criterio de Laravel.
- **Un paquete del workspace con los componentes de error**: contradice ADR 0012 y obliga a resolver las diferencias de cada app (home, logout, ayuda) con props; el costo de mantener dos copias idénticas ya lo paga el resto de `src/components/`.
- **Mantener el redirect al login ante cualquier falla de `/me`**: esconde las caídas detrás del formulario de login, que después falla de nuevo al enviarlo.

## Consecuencias

- Reemplaza la consecuencia de ADR 0009 de que `__root.tsx` no tiene `errorComponent`: lo tiene, y `QueryErrorState` desaparece en favor de `ErrorPage`.
- `RETRYABLE_KINDS` pasa a ser `isTransient`: un 404 o un 400 sin sobre ya no se reintenta; un 408, un 5xx y la falta de respuesta sí.
- Activar `APP_DEBUG` en la API expone en el navegador el mensaje de una `QueryException`, con sus bindings (datos personales): nunca en el servidor de demo ni en producción.
- Un cambio de la página se hace en las dos copias de `features/error-page/`; sólo `error-page-config.ts` difiere.
