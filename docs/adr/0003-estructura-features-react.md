# ADR 0003: Estructura de `apps/panel`

## Estado

Aceptado.

## Contexto

`apps/panel` usa TanStack Router (file-based) en vez de Inertia — no hay convención de `resources/js/pages/` que heredar. La estructura sigue el patrón de organización de componentes de `../fototobares` (ver ADR 0001), adaptado a la convención de rutas propia de TanStack Router.

## Decisión

```text
src/
├── routes/<module>/     # entrypoints de TanStack Router
│   ├── index.tsx          # list
│   ├── nuevo.tsx           # create
│   ├── $id.tsx              # show
│   ├── $id.editar.tsx        # edit
│   └── -components/, -hooks/, -tests/   # co-locado, excluido del route tree por el prefijo "-"
├── components/
│   ├── ui/                # primitivas shadcn/ui, agnósticas de dominio
│   └── ...                 # componentes atómicos compartidos, sin awareness de dominio/layout
├── features/             # componentes compuestos compartidos, con awareness de dominio/layout
├── layouts/
├── hooks/                # hooks globales
├── lib/                  # helpers TS puros, enums, cliente `api` (axios)
└── types/
```

- Módulos no-CRUD usan un único `index.tsx` en `routes/`.
- Componentes presentacionales; lógica de negocio, mutaciones de estado y llamadas a la API viven en hooks (`useSomething.ts`).
- Límites de tamaño: 250 líneas por archivo, 150 por componente.
- Un solo stylesheet: `src/index.css`, utilidades de Tailwind dentro de los componentes.

## Consecuencias

- `eslint.config.js` enforza los límites de tamaño y los import boundaries (`components/ui/` y `components/` no pueden importar de `routes/`, `features/` ni `layouts/`).
- Agregar un módulo nuevo es: una carpeta en `routes/`, componentes/hooks co-locados en `-components/`/`-hooks/`, y solo promover a `features/` cuando el componente se comparte entre módulos.
