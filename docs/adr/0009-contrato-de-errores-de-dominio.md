# ADR 0009: Contrato de errores de dominio

## Estado

Aceptado.

## Contexto

Antes de este issue (#87), `app/Exceptions/` no existía: no había ninguna jerarquía de errores que estandarizar. Las reglas de negocio del backend lanzaban `Illuminate\Validation\ValidationException::withMessages()` ancladas a un campo (7 sitios en `app/Actions/**`), reutilizando el 422 de validación de entrada para representar conflictos de negocio — el panel mostraba esos mensajes inline en los formularios porque `extractFormErrors` sólo entendía 419 y 422. De los 7 `abort()` repartidos entre controllers y middleware, sólo 3 representaban errores de dominio reales; los otros 4 eran aserciones defensivas sobre estados que el framework ya vuelve inalcanzables (`auth:sanctum`, route model binding), y quedan fuera de este ADR.

En el panel, ninguna ruta definía `errorComponent`: un error inesperado de render dejaba una pantalla en blanco, y `QueryErrorState` hardcodeaba el mensaje del 403 asumiendo que sólo se renderizaba para pacientes, aunque también aparecía en agenda, ajustes, disponibilidad y profesionales.

## Decisión

Se introduce `App\Contracts\DomainError` (interfaz que extiende `Throwable`, con `errorCode(): ErrorCode`, `httpStatus(): int`, `logContext(): array` y `publicContext(): array`) y la base abstracta `App\Exceptions\DomainException`. Las excepciones concretas son `final`, viven en `app/Exceptions/<Module>/` y devuelven un código de `App\Enums\ErrorCode` (formato `<módulo>.<regla>`). Un único `render` callback en `bootstrap/app.php`, registrado sobre la interfaz `DomainError` (nunca sobre la clase base), serializa cualquier error de dominio al envelope `{"error":{"code","message","context"}}` y loguea con `logContext()` — ningún controller ni Action arma una respuesta de error. El panel espeja el contrato con un `AppError` tipado (unión de clases que extienden `Error`, discriminadas por `kind`) y resuelve la copy en español por código desde un catálogo propio.

Dentro de esa decisión general hay tres puntos que, sin una razón escrita, se re-litigarían con una alternativa más barata:

1. **409 para reglas de negocio, no un 422 aditivo.** Las reglas de negocio devuelven 409 Conflict; el 422 queda reservado exclusivamente para validación de entrada de FormRequests. Se descartó a sabiendas la alternativa más barata — mantener el 422 existente y sólo agregarle un `code` — porque no separa "entrada mal formada" de "regla de negocio incumplida", que es el problema que este issue existe para resolver.
2. **`logContext()` separado de `publicContext()`, no un único `context()`.** `logContext()` es rico y nunca se serializa en la respuesta; `publicContext()` devuelve `[]` por defecto y exponer un dato exige justificación explícita en el propio método. Colapsar ambos en un solo `context()` serializado es más simple, pero pacientes y organizaciones son entidades separadas de forma deliberada (los pacientes son globales, no por organización) y un identificador de una ficha o de una invitación filtrado en la respuesta de error sería una fuga cross-tenant silenciosa.
3. **Dos formatos de respuesta, no uno normalizado.** El envelope de dominio y la forma nativa de validación de Laravel conviven sin cambios en esta última. Normalizar el 422 dentro del envelope habría roto 44 `assertJsonValidationErrors` repartidos en 13 archivos de test, sin ningún beneficio para el usuario: un error de validación ya está anclado a un campo y no necesita código.

## Alternativas descartadas

- **Contrato aditivo sobre 422** (agregar `code` sin cambiar el status): ver punto 1 arriba.
- **Un único `context()` serializado** en vez de `logContext()`/`publicContext()`: ver punto 2 arriba.
- **Normalizar el 422 dentro del envelope de dominio**: ver punto 3 arriba.
- **`app/Domain/` como jerarquía paralela** para las excepciones: contradice la estructura Laravel estándar de [ADR 0002](0002-estructura-laravel-estandar.md); en su lugar, `Exceptions` se suma como séptimo namespace modularizado (`app/Exceptions/<Module>/`), con el mismo patrón que `Actions/`, `Services/`, `Data/`, `Http/Requests/`, `Http/Resources/` y `Http/Controllers/`.
- **Codegen para la paridad del catálogo del panel**: con 9 códigos, un generador (archivo generado, paso de CI, fricción de "¿lo corriste?") cobra una infraestructura que un test de paridad de 20 líneas ya cierra. El parser se extrae a un módulo reutilizable como upgrade path explícito; empieza a pagar con ~30 códigos o si el enum churnea seguido.
- **Error boundaries de React montados a mano**: se usa `errorComponent` de TanStack Router en su lugar — ya es parte del router en uso, sin agregar una segunda abstracción de boundary. Tres niveles (`RouteErrorState` por módulo), no uno por ruta ni uno por componente.

## Consecuencias

- Nunca se lanza una excepción genérica (`Exception`, `RuntimeException`, `\DomainException` de SPL) para un flujo de negocio esperado — se enforcea con `CLAUDE.md` y con `tests/Arch/ArchTest.php` (excepciones de dominio convencionales, `App\Actions` sin `ValidationException`, y un scan de contenido que lista `abort()`/excepciones genéricas fuera de los puntos defensivos permitidos). Esta regla no es una decisión con alternativa descartada — es la consecuencia directa de las tres decisiones de arriba — por eso vive acá y no en la sección de Decisión.
- Un código público (`ErrorCode`) es un contrato estable: renombrarlo obliga a actualizar el enum del panel en el mismo cambio, y el test de paridad (`apps/panel/src/lib/error-code-parity.test.ts`) lo garantiza.
- El panel centraliza todo el conocimiento de axios/status HTTP en `src/lib/api-errors.ts` (`mapToAppError`); todo lo demás — `extractFormErrors`, `notifyError`, `QueryErrorState`, el `retry` de `query-client.ts` — trabaja sobre `AppError`, nunca sobre la respuesta cruda.
- Las mutations manejan errores de negocio en su propio `onError`/`catch`; la escalada a un boundary de ruta se decide sólo en el loader (lecturas de página, [ADR 0007](0007-fetching-con-loaders-de-tanstack-router.md)) o explícitamente. Lanzar dentro de un `onError` de mutation no escala: `@tanstack/query-core` 5.101.2 envuelve cada invocación en un `try/catch` que sólo produce un unhandled rejection.
- `__root.tsx`, `_auth.tsx` y `_public.tsx` siguen sin `errorComponent`/`notFoundComponent` propio: cada ruta de módulo compone su propia UI de recuperación a través de `RouteErrorState`.
- Queda una migración pendiente, fuera de este ADR: normalizar el 422 dentro del envelope no se descarta para siempre, sólo mientras el costo (44 aserciones de test) siga sin beneficio medible para el usuario.
