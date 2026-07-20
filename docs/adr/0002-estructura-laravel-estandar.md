# ADR 0002: Estructura de `apps/api`

## Estado

Aceptado.

## Contexto

`about-this-project.md` (el issue de planificación original) proponía capas al estilo DDD (`Domain/`, `Application/`, `Infrastructure/`, `Http/`). Nunca se implementó — el código real ya sigue la estructura estándar de Laravel.

## Decisión

`apps/api` sigue la estructura estándar de Laravel:

```text
app/
├── Http/
│   ├── Controllers/
│   ├── Requests/
│   └── Resources/
├── Models/
├── Actions/     # lógica de negocio de responsabilidad única
├── Services/    # adapters de APIs/SDKs de terceros
├── Enums/
└── Providers/
```

`Actions/` y `Services/` son un patrón idiomático de la comunidad Laravel para mantener los controllers finos, no una capa de dominio separada.

## Consecuencias

`tests/Arch/ArchTest.php` enforza esta estructura: `App\Actions` y `App\Services` no pueden depender de `App\Http`.
