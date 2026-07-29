# ADR 0007: Fetching con loaders de TanStack Router

## Estado

Aceptado.

## Contexto

El panel fetchea datos con hooks co-locados (`use-patient.ts`, `use-patients.ts`, `use-appointments.ts`, `use-availabilities.ts`, `use-memberships.ts`, etc.) invocados desde los componentes de página, y ningún loader de ruta trae datos. Los loaders son la ventaja principal de TanStack Router frente a alternativas más simples: sin usarlos, elegir ese router en particular no se justifica. La segunda ventaja que hoy se desperdicia es el tipado de punta a punta: con loaders, la respuesta, los search params y los route params llegan tipados al componente sin guardas manuales.

El patrón ya existe en el repo, aplicado a una sola lectura: `requireSession` (`src/lib/auth-guards.ts`) resuelve la sesión con `queryClient.ensureQueryData(sessionQueryOptions)` desde `beforeLoad`, usando el `queryClient` del contexto del router. Falta extenderlo a las lecturas de página.

## Decisión

Las lecturas de página se hacen en el `loader` de la ruta, no con `useQuery` invocado desde el componente.

- **TanStack Query no se reemplaza, se usa por dentro.** El loader resuelve con `context.queryClient.ensureQueryData(queryOptions)`, el mismo patrón que `requireSession`. Cacheo y mutations siguen siendo responsabilidad de TanStack Query; el loader solo garantiza que el dato está en caché antes de que el componente se monte. Los `queryOptions` de cada lectura se exportan desde el hook co-locado existente (`-hooks/use-*.ts`); no se crea una capa nueva. La invalidación, en cambio, necesita un paso adicional para lecturas de página — ver el punto siguiente.
- **`router.invalidate()` junto a `invalidateQueries` para mutations que no navegan.** Una vez que una lectura vive solo en el loader, no queda ningún `useQuery` observador montado en esa página: `queryClient.invalidateQueries` marca la query como stale, pero sin un observador activo no dispara un refetch, y el router tampoco vuelve a correr el loader de un match ya montado solo porque la query subyacente cambió de estado. Por eso, toda mutation cuyo éxito deja al usuario en la misma página cuyo dato vino de un loader debe llamar `router.invalidate()` en su `onSuccess`, además de `invalidateQueries` (que sigue haciendo falta para otros observadores fuera del alcance de este patrón, p. ej. lecturas disparadas por interacción). Si la mutation navega a otra ruta en su lugar, el loader de destino ya se ejecuta al llegar y no hace falta nada extra. Esta fue la causa de una regresión detectada en `/agenda` durante la migración: crear o reprogramar un turno sin salir de la página dejaba la agenda visible desactualizada hasta que el usuario navegaba y volvía.
- **Qué se descarta**: un `useQuery` invocado directamente desde un componente de página para su lectura principal. Ese patrón deja el componente resolviendo sus propios estados de loading/error/`undefined`, que es exactamente lo que un loader tipado evita.
- **Qué queda fuera del patrón** (no migra, no es un caso que el ADR decida a favor o en contra, directamente no aplica):
  - Mutations: los loaders no manejan escrituras.
  - Lecturas disparadas por interacción y no por navegación — por ejemplo `use-patient-lookup` (buscar un paciente por documento) o `use-availability-warning`. Estas siguen usando `useQuery` desde el componente porque no hay una navegación de ruta que las dispare.
- **Convivencia con `pendingComponent`, skeletons y `errorComponent`**: cada ruta migrada declara `pendingComponent` (reutilizando el skeleton existente del módulo, p. ej. `TableSkeleton`) para el estado de carga, y `errorComponent` para el estado de error de la lectura de página. `QueryErrorState` deja de usarse para lecturas de página — ese rol pasa al `errorComponent` de la ruta — pero el componente en sí no se elimina: sigue siendo el estado de error correcto para lecturas disparadas por interacción, que no pasan por un loader.
- **Estado de request vs. estado de UI**:
  - **Estado de request** — todo lo que parametriza una lectura de página: búsqueda y paginación (`q`/`page` en pacientes), fecha y vista (`date`/`view` en agenda), entidad seleccionada (profesional en disponibilidad) — se declara con `validateSearch` (zod) y llega al loader por `loaderDeps`. Vive en la URL: recargar o compartir el link reproduce la misma vista.
  - **Estado de UI puro** — apertura de un diálogo, una confirmación pendiente como `confirmingId` en `MySpecialtiesSection` — sigue en `useState`. No migra a la URL.
- **Tipado de punta a punta**: el loader declara el tipo que devuelve y la página lo consume con `Route.useLoaderData()`. Para lecturas de página no quedan `data | undefined`, `?? []` ni guardas `data && …`. Los route params numéricos (`/pacientes/$id/editar`, `/profesionales/$id/editar`) se parsean en la definición de la ruta con `params.parse`, no con `Number(id)` dentro del componente.

## Alternativas descartadas

- **Seguir fetcheando con `useQuery` desde el componente, solo prefetcheando en el loader**: mantiene los guardas de `undefined`/loading/error en cada componente y no resuelve el problema de tipado — el loader existiría solo para acelerar la carga, no para tipar ni para simplificar el componente. No se adopta.
- **Reemplazar TanStack Query por el cache propio del router**: pierde invalidación declarativa por query key y el manejo de mutations que ya existe; no hay razón para renunciar a eso, el loader solo necesita pedirle el dato al mismo `queryClient`.

## Consecuencias

- Ocho módulos migran sus lecturas de página a loaders en este mismo issue, uno por commit: `/pacientes`, `/pacientes/nuevo`, `/pacientes/$id/editar`, `/profesionales`, `/profesionales/$id/editar`, `/agenda`, `/disponibilidad`, `/ajustes`.
- Un módulo nuevo con lecturas de página debe resolverlas con loader desde el principio, no arrancar con `useQuery` en el componente y migrar después.
- **Orden respecto de #87**: este issue va primero. Con loaders, un error de lectura llega nativamente al `errorComponent` de la ruta, así que dos partes de lo que #87 especificaba se construirían para tirarlas: la reescritura de `QueryErrorState` sobre `AppError` y el escalado al boundary con `throwOnError` en queries. Lo que sobrevive intacto a esta migración y sigue siendo alcance de #87: el contrato de errores del backend completo, el manejo de errores de mutations, y el mapa `código → campo` de los formularios. Por eso #87 queda bloqueado por este issue.
