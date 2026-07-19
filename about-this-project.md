# Proyecto Clini

## Visión del producto

El objetivo de Clini dejó de ser simplemente un **turnero online**.

La visión pasa a ser:

> Construir una plataforma de gestión médica modular, comenzando por un sistema de turnos de primer nivel para consultorios pequeños y profesionales independientes.

El MVP estará enfocado exclusivamente en resolver el problema de la gestión de turnos, pero la arquitectura deberá permitir crecer hacia funcionalidades como:

- Historia clínica.
- Facturación.
- Integraciones.
- Estadísticas.
- Gestión del consultorio.

La meta a largo plazo es competir con **Calu**, aunque el camino será incremental.

---

# Público objetivo

Primera etapa:

- Consultorios pequeños.
- Profesionales independientes.
- Entre 1 y 5 profesionales.

No se buscará competir inicialmente con clínicas u hospitales.

---

# Filosofía del producto

No competir por cantidad de funcionalidades.

Competir por:

- Simplicidad.
- Excelente UX.
- Rapidez.
- Automatización.
- Soporte cercano.

Se vende tiempo, no software.

---

# Roadmap

## MVP

- Agenda.
- Reserva online.
- Gestión de disponibilidad.
- Cancelaciones.
- Reprogramaciones.
- Carga manual.
- Recordatorios.

---

## Fase siguiente

Integración con Mercado Pago **para cobrar la suscripción del SaaS**.

Esta integración es prioritaria.

---

## Más adelante

Cobro de consultas mediante Mercado Pago.

Será completamente opcional para cada profesional.

---

## Futuro

- Historia clínica.
- Estadísticas.
- Integraciones.
- Google Calendar.
- API pública.
- Funcionalidades avanzadas.

---

# Arquitectura elegida

## Backend

- Laravel

## Frontend

- React
- TypeScript
- Inertia.js

Aplicación híbrida:

- Landing y páginas públicas → SSR o incluso estáticas cuando tenga sentido.
- Panel del profesional → CSR.

---

## UI

- TailwindCSS
- shadcn/ui

---

## Base de datos

PostgreSQL.

Una única base compartida.

Multi-tenancy mediante `organization_id`.

---

# Multi-tenancy

Modelo elegido:

```text
Organization

↓

Membership

↓

User
```

Características:

- Un profesional puede pertenecer a varios consultorios.
- Un consultorio puede tener varios profesionales.
- Cada profesional tiene una agenda por consultorio.

---

# Pacientes

Los pacientes serán entidades globales.

Esto deja abierta la posibilidad de evolucionar hacia funcionalidades más avanzadas en el futuro, aunque la historia clínica seguirá modelándose por organización hasta definir mejor los aspectos legales y de permisos.

---

# Infraestructura

## Desarrollo

Laravel Sail.

---

## Producción

- Docker
- Dockerfile propio
- Dokploy

No se utilizarán Nixpacks.

---

# Integración Continua (CI)

GitHub Actions.

Pipeline previsto:

- Lint
- TypeScript (`tsc --noEmit`)
- Larastan
- Rector
- Pint
- ESLint
- Prettier
- Tests
- Architecture Tests
- Playwright
- Build Docker
- Deploy

---

# Colas

Inicialmente:

```text
QUEUE_CONNECTION=database
```

Redis únicamente cuando exista una necesidad real.

---

# Caché

Se utilizará inicialmente el driver por defecto de Laravel.

No optimizar prematuramente.

---

# Archivos

Primera etapa:

- Disco local.

Más adelante:

- Buckets compatibles con S3.

---

# Observabilidad

Se planteó utilizar herramientas como:

- Laravel Pulse
- Laravel Nightwatch
- Uptime Kuma

El objetivo es disponer de:

- Logs
- Métricas
- Monitoreo
- Uptime

Con preferencia por soluciones gratuitas o de muy bajo costo.

---

# Notificaciones

Se acordó que todas las notificaciones deberán construirse sobre un sistema desacoplado basado en eventos.

Ejemplo:

```text
AppointmentBooked

↓

Notification

↓

Email

↓

Push

↓

WhatsApp

↓

SMS
```

Esto permitirá agregar nuevos canales sin modificar la lógica de negocio.

---

# Web Push Notifications

Conclusiones:

No reemplazan al email.

Sí son una excelente opción como canal complementario.

Especialmente útiles para:

## Profesionales

- Nuevo turno.
- Cancelación.
- Confirmación.
- Próxima consulta.
- Pago recibido.
- Vencimiento de la suscripción.

## Pacientes

- Confirmación del turno.
- Recordatorios.
- Reprogramaciones.
- Cancelaciones.

---

# SMS

Se discutió la posibilidad de construir un sistema propio utilizando dispositivos Android.

Conclusión:

Es técnicamente viable.

Sin embargo:

- Incrementa la complejidad operativa.
- Depende de hardware.
- Depende de las operadoras.
- Escala peor que otras alternativas.

No debería ser un pilar del sistema.

Podría implementarse únicamente como una solución opcional.

---

# Organización del proyecto

Se recomendó organizar el código por dominios de negocio.

Ejemplo:

```text
Domain/
Application/
Infrastructure/
Http/
```

Y no únicamente por tipo de archivo (`Models`, `Controllers`, `Services`, etc.).

---

# Calidad

Herramientas elegidas:

- Larastan
- Rector
- Pint
- ESLint
- Prettier
- TypeScript
- Pest
- Playwright

---

# ADR

Inicialmente se propusieron alrededor de veinte ADR.

Luego se concluyó que era excesivo para un proyecto mantenido por un único desarrollador.

La recomendación final fue mantener pocos documentos de arquitectura, más amplios y fáciles de mantener.

---

# Propuesta de documentación

En lugar de decenas de ADR pequeños, se propuso una estructura similar a:

```text
docs/

architecture/
    overview.md
    domain-model.md
    integrations.md
    infrastructure.md
    development.md

product/
    vision.md
    roadmap.md
    prd/

adr/
    (solo decisiones realmente importantes)
```

---

# Filosofía sobre los ADR

Los ADR no deben documentar tecnologías.

No tiene sentido escribir un ADR simplemente porque se utiliza PostgreSQL o React.

Sí tiene sentido documentar decisiones arquitectónicas como:

- Monolito modular.
- Multi-tenancy.
- Pacientes globales.
- Inertia en lugar de una API REST.
- Organización del dominio.

Los ADR deben responder:

> ¿Por qué tomamos esta decisión y qué alternativas descartamos?

No:

> ¿Qué tecnología usamos?

---

# Próximos pasos

## Arquitectura

Redactar los documentos de arquitectura.

Probablemente:

- Architecture Overview.
- Domain Model.
- Infrastructure.
- Integrations.
- Development Guide.

---

## PRD

Diseñar los módulos funcionales.

Comenzando por:

- Organizaciones.
- Usuarios.
- Roles.
- Agendas.
- Turnos.
- Pacientes.
- Disponibilidad.
- Prestaciones.

Definiendo las reglas de negocio antes de comenzar a implementar.

---

# Idea adicional

Crear un **Engineering Handbook**.

No es un ADR ni un PRD.

Es un documento vivo con convenciones de desarrollo específicas del proyecto.

Ejemplos:

- Convenciones para componentes de React.
- Cuándo crear un Action vs un Service.
- Cómo modelar eventos del dominio.
- Convenciones para DTOs.
- Organización de los tests.
- Uso de transacciones.
- Convenciones para migraciones.
- Estilo de commits.
- Flujo de Pull Requests.

Este documento servirá como guía técnica para mantener la consistencia del proyecto a medida que crezca y facilitará el trabajo tanto del desarrollador como de herramientas de IA.