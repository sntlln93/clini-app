# ADR 0002: Estructura de `apps/api`

## Estado

Aceptado.

## Contexto

`about-this-project.md` (el issue de planificación original) proponía capas al estilo DDD (`Domain/`, `Application/`, `Infrastructure/`, `Http/`). Nunca se implementó — el código real ya sigue la estructura estándar de Laravel.

## Decisión

`apps/api` sigue la estructura estándar de Laravel:

```text
app/
├── Contracts/          # interfaces Action y Data
├── Http/
│   ├── Controllers/<Módulo>/   # Controller.php es el único archivo permitido directamente bajo Controllers/
│   ├── Requests/<Módulo>/
│   └── Resources/<Módulo>/
├── Models/               # se mantiene plano, sin subdirectorios por módulo
├── Actions/<Módulo>/     # lógica de negocio de responsabilidad única
├── Services/<Módulo>/    # adapters de APIs/SDKs de terceros
├── Data/<Módulo>/        # DTOs
├── Enums/                # se mantiene plano, sin subdirectorios por módulo
└── Providers/
```

`Actions/` y `Services/` son un patrón idiomático de la comunidad Laravel para mantener los controllers finos, no una capa de dominio separada. Cada `Action` expone un único método `handle()` e implementa `App\Contracts\Action`; cada `Service` implementa su propia interfaz de dominio en `App\Contracts` (nunca una interfaz marcador común). Los DTOs viven en `App\Data\<Módulo>`, son `final readonly` e implementan `App\Contracts\Data`.

`Actions/`, `Services/`, `Data/`, `Http/Requests/`, `Http/Resources/` y `Http/Controllers/` se agrupan por módulo (por ejemplo `Actions/Auth/`, `Http/Controllers/Auth/`): ningún archivo `.php` puede estar directamente bajo esas seis raíces, salvo `Http/Controllers/Controller.php`. `Models/` y `Enums/` se mantienen planos.

## Consecuencias

`tests/Arch/ArchTest.php` enforza esta estructura: `App\Actions` y `App\Services` no pueden depender de `App\Http`.
