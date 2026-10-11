# Reportes del panel

Sección «Reportes» del panel (#242): ocupación, ausentismo, reservas por origen y pacientes nuevos, por profesional y por semana o mes. Es una función del plan **Centro** (`PlanFeature::Reports`, ADR 0014).

## API

`GET /api/v1/reports`, en el grupo de rutas de la clínica, con el middleware `plan.feature:reports`. Un plan sin reportes responde 409 `plans.feature_unavailable`.

| Parámetro | Valor por defecto | Regla |
|---|---|---|
| `from`, `to` | `to` es hoy y `from` es el primer día del mes de dos meses antes (tres meses calendario), en la zona horaria de la organización | `Y-m-d`, `to >= from`, hasta 366 días |
| `granularity` | `month` | `week` (de lunes a domingo) o `month`. La primera y la última se cortan al período |
| `membership_id` | toda la organización | Un profesional de la organización. Si no existe o no es profesional, responde 422 |

La respuesta (`data`) trae:
- `period`;
- `professionals`: una fila por profesional para todo el período;
- `series`: un elemento por semana o mes, que suma a todos los profesionales del alcance;
- `origin`: los totales por origen;
- `new_patients`: `null` cuando el reporte es de un solo profesional.

La implementación está en `ComputeOrganizationReportAction`.

## Definiciones

Todo se cuenta por la fecha del turno, en la zona horaria de la organización.

- **Ocupación** = minutos con turnos dentro del horario publicado ÷ minutos publicados.
  - El horario publicado es el mismo que ofrece la reserva online (`ComputePublishedScheduleAction`): franjas semanales más excepciones `extra`, menos excepciones `blocked` (las del profesional y las de toda la organización), y nada en los feriados.
  - Los turnos que cuentan son los vigentes, es decir, sin `cancelled` ni `rescheduled`. Un `no_show` ocupó el horario, así que cuenta.
  - El tiempo con turnos fuera del horario publicado no suma, así que la ocupación nunca pasa del 100%.
  - Las franjas semanales no tienen historial: los períodos pasados usan las franjas de hoy. Las excepciones y los feriados sí tienen fecha.
- **Ausentismo** = `no_show` ÷ (`arrived` + `completed` + `no_show`).
  - Es la misma regla que usan las estadísticas del dashboard.
  - Los turnos pasados que nadie marcó (`scheduled`, `confirmed`) quedan fuera, para no bajar la tasa por falta de carga.
- **Reservas por origen** (`online` / `manual`): todos los turnos menos el original de una reprogramación. El turno nuevo conserva el origen y es el que cuenta. Un turno cancelado fue una reserva igual, así que cuenta.
- **Pacientes nuevos**: vínculos `organization_patient` creados en el período, por mes. Es la misma fuente que usa el dashboard para una organización.
  - Ese vínculo no tiene profesional, así que solo se muestra con el alcance de toda la organización.
- **Profesionales del reporte**: los activos, más cualquier otro que tenga turnos en el período, para que la historia de quien ya no atiende no desaparezca.

## Permisos

| Permiso | Roles | Alcance |
|---|---|---|
| `reports.view` | dueño, administración | Toda la organización, o un profesional en particular |
| `reports.view.own` | profesional | Solo su propio reporte |

- Recepción (`staff`) no tiene acceso.
- Un profesional que pide toda la organización o a otro profesional recibe 403 (`MembershipPolicy::viewReports`).
- En el panel, el loader siempre pide el reporte propio para quien solo tiene `reports.view.own`.

## Panel

- La ruta es `routes/_auth/reportes/`.
- Los filtros (desde, hasta, agrupar, profesional) viven en la URL.
- En un plan sin reportes, el loader no llama a la API y muestra `PlanFeatureNote`.
- Los gráficos usan el `chart` de shadcn (recharts) con los tokens `--chart-1` y `--chart-2`. Cada gráfico tiene su tabla de datos («Ver datos en tabla»).

## Fuera de alcance

- Exportar a Excel o PDF, y reportes financieros (#242).
- Replicar los reportes en el dashboard de operadores, abarcando todas las organizaciones (issue propio).
