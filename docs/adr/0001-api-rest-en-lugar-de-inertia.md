# ADR 0001: API REST en lugar de Inertia.js

## Estado

Aceptado.

## Contexto

La decisión original del proyecto (repo anterior) era usar Inertia.js: una aplicación híbrida donde Laravel sirve las vistas React directamente, con landing/páginas públicas en SSR/estático y el panel en CSR.

Al iniciar este repositorio se decidió separar completamente el backend del frontend.

## Decisión

Laravel funciona exclusivamente como API REST (`routes/api.php`, sin `routes/web.php`). El panel es una SPA React independiente (Vite) que consume esa API vía HTTP, desplegada como aplicación separada.

## Alternativas descartadas

- **Inertia.js**: acopla el ciclo de release de backend y frontend, y complica desplegar el panel y una futura landing como aplicaciones independientes con su propio Dockerfile en Dokploy.

## Consecuencias

- El panel y la API se versionan, buildean y despliegan por separado (un Dockerfile por app).
- Requiere resolver autenticación cross-origin entre SPA y API (pendiente de definir: Sanctum SPA vs. tokens).
- Facilita agregar más frontends (landing, futuras apps) sin tocar el backend.
