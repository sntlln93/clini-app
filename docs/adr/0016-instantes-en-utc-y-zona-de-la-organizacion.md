# ADR 0016: Instantes en UTC y zona horaria de la organización en el frontend

## Estado

Aceptado. Reemplaza la decisión 1 de #230 (cargar y mostrar los turnos en la zona del navegador).

## Contexto

Un bloqueo o una franja extra cargados desde Disponibilidad quedaban corridos por el offset de la zona horaria (−3 h en Argentina, #265):
- el `<input type="datetime-local">` devuelve la hora de reloj sin offset (`2026-10-12T09:00`);
- el panel la mandaba tal cual;
- la API la parseaba con `Carbon::parse` en la zona de la app (UTC) y guardaba 09:00 UTC, que en Buenos Aires son las 06:00.

La regla `date` de los `FormRequest` acepta cualquier cosa que entienda `strtotime`, así que nada frenaba un instante ambiguo.

Revisando el resto aparecieron otros dos huecos, ninguno visible todavía porque los clientes mandan `Z`:
- **Laravel no convierte la zona al escribir.** Tanto al bindear un `Carbon` en una consulta (`Connection::prepareBindings`) como al asignarlo a un atributo con cast `datetime` (`HasAttributes::fromDateTime`), formatea su hora de reloj tal cual. Un `Carbon` en la zona de la organización, o uno parseado de un string con `-03:00`, queda corrido por su offset. `ListAvailableSlotsAction` ya tenía ese bug: acotaba los turnos ocupados con la medianoche local, así que un turno a las 22:00 del último día del rango no bloqueaba su horario.
- **El panel mezclaba dos zonas.** «Hoy» salía de `organizations.timezone`, pero las horas se mostraban y se cargaban en la del navegador. Un profesional que abre el panel desde otra zona veía los turnos de su consultorio corridos.

## Decisión

**La base guarda instantes en UTC, en columnas `timestamp with time zone`.** Todas las columnas de fecha y hora de las migraciones usan `dateTimeTz`, `timestampsTz` o `softDeletesTz`. Es `dateTimeTz` y no `timestampTz` porque generan el mismo DDL en Postgres, y Larastan no reconoce `timestampTz` (tipa la columna como `mixed`). La conexión `pgsql` fija la sesión en UTC (`'timezone' => 'UTC'`), porque Laravel bindea las fechas sin offset y Postgres las lee en la zona de la sesión.

**Las horas de reloj quedan fuera.** Las franjas semanales (`availabilities.start_time`/`end_time`) son horas sin zona, siempre en la del consultorio, y siguen siendo `time`.

**La API recibe instantes en ISO 8601 con offset explícito**, y responde 422 a cualquier otro formato. Lo valida `App\Rules\Iso8601Instant` en cada campo que es un instante: `start_at`/`end_at` de turnos, reservas online y excepciones, y `from`/`to` de agenda y sala de espera. Los campos que son fechas de calendario (`from`/`to` de la búsqueda de horarios, reportes y estadísticas) usan `date_format:Y-m-d`.

**El backend opera en UTC.** Todo instante recibido se pasa a UTC al parsearlo (`->utc()` o `->setTimezone('UTC')`), y todo `Carbon` construido en otra zona se convierte antes de bindearlo o escribirlo. Para agrupar por día local en SQL, la consulta convierte la columna con `col AT TIME ZONE ?`.

**El frontend convierte con la zona de la organización, nunca con la del navegador.**
- **Panel:** usa Luxon a través de `src/lib/datetime.ts`, el único módulo que importa `luxon`. Ese módulo configura `es-AR`, `throwOnInvalid` y la zona por defecto. El `beforeLoad` de `_auth` fija la zona por defecto con `setPracticeTimeZone(session.organization.timezone)` antes de que corra cualquier loader protegido. A partir de ahí, todo `DateTime` que el panel parsea, construye o formatea está en la hora del consultorio. Los instantes viajan a la API con `toInstant()` (ISO en UTC), y los `datetime-local` se convierten en las dos direcciones (`toDateTimeInputValue`/`fromDateTimeInputValue`).
- **Página pública de reservas:** está fuera de `_auth`, así que no usa la zona por defecto. Recibe la zona de su organización y la aplica explícitamente con `setZone(timezone)`.
- **Dashboard:** no tiene una organización propia, así que fija la zona por defecto en la zona de reporte (`REPORTING_TIMEZONE`, la misma que `ADMIN_REPORTING_TIMEZONE` en la API).
- **El registro** es el único lugar que lee la zona del navegador (`browserTimeZone()`), para proponerla como la del consultorio nuevo.

**Sin fechas nativas.** En `src/**` de panel y dashboard, ESLint rechaza `new Date`, `Date.now()`/`Date.UTC`/`Date.parse`, `Intl.DateTimeFormat` y `toLocaleDateString`/`toLocaleTimeString`, además de importar `luxon` fuera de `src/lib/datetime.ts`. Los tests pueden usar `Date` para los timers falsos (`vi.setSystemTime`).

**Lo que corre antes que `beforeLoad` no conoce la zona en la primera carga.** `validateSearch` y `loaderDeps` corren al resolver las rutas, antes del `beforeLoad` de `_auth`.
- Por eso la agenda resuelve «hoy» en el loader y no en `loaderDeps`.
- La validación del rango de Reportes en la URL puede usar la zona del navegador en la primera carga. Es solo una tolerancia, porque la API valida el rango de nuevo en la zona del consultorio.

## Alternativas descartadas

- **La zona del navegador** (la decisión 1 de #230): es la de quien mira, no la del consultorio. La reserva online, la disponibilidad semanal y los reportes ya trabajaban en la zona de la organización. Para un usuario en Argentina las dos coinciden, pero un profesional de viaje veía la agenda corrida.
- **Day.js con el plugin `timezone`:** pesa menos que Luxon, pero la zona es un plugin encima de un objeto pensado para la hora local, y tiene errores conocidos en `startOf`/`tz()` alrededor de los cambios de horario. Luxon trae las zonas IANA de fábrica y es inmutable.
- **`Intl.DateTimeFormat` con `timeZone` en cada llamada:** sirve para mostrar, pero no para la aritmética (inicio del día, semana, sumar días). Además depende de que nadie se olvide el parámetro, que es justamente cómo se coló el bug.
- **Que Eloquent bindee con offset** (un `$dateFormat` con `P` en los modelos): con `timestamptz`, Postgres convertiría solo, pero el formato cambia en todos los modelos, en las consultas crudas y en los tests a la vez. Normalizar a UTC en la entrada es local y explícito.
- **Migrar los datos existentes:** no hay tráfico real todavía, así que alcanzó con editar las migraciones y correr `migrate:fresh --seed`.
