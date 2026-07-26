# ADR 0005: Catálogo global de especialidades/prestaciones, especialidad en dos niveles

## Estado

Aceptado.

## Contexto

El schema original modelaba `specialties` y `services` como catálogos **por organización**
(`organization_id`, `unique(organization_id, name)`), con ABM implícito desde cada consultorio,
y la especialidad como un atributo del profesional **a un solo nivel**: directamente sobre la
membresía (`professional_specialties`), sin distinguir entre "está habilitado para" y "lo
ejerce en este consultorio". `services` además cargaba `duration_minutes`/`price_cents`/`currency`
en el propio catálogo.

`docs/product/checklist-schema.md` (sección D) y `docs/product/casos-de-uso.md` (CU-15, CU-43)
documentaban esa decisión. El issue #21 la invierte: el negocio real es que especialidades y
prestaciones son un **catálogo de referencia gestionado por una app externa** (fuera de Clini),
no algo que cada organización da de alta por su cuenta; y que un profesional puede tener una
especialidad como **credencial** (p. ej. un título habilitante) sin necesariamente ejercerla en
todos los consultorios donde trabaja.

## Decisión

1. **Catálogo global, de solo lectura desde Clini.** `specialties` y `services` pierden
   `organization_id`; `name` es único a nivel global. No existe ningún endpoint de escritura
   (`POST`/`PUT`/`PATCH`/`DELETE`) para ninguna de las dos tablas — solo `GET /specialties` y
   `GET /services`. Un `CatalogSeeder` idempotente (`firstOrCreate` por `name`) los puebla
   únicamente para dev/test; en producción el catálogo queda vacío hasta que la app externa lo
   sincronice (fuera del alcance de este issue).
2. **Especialidad en dos niveles.** `user_specialties` (`user_id`, `specialty_id`) es la
   credencial global del profesional: viaja con la persona, no con la organización, y solo la
   edita el propio usuario (identity check, no `catalog.manage`). `professional_specialties`
   sigue siendo lo que el profesional ejerce **en una organización concreta**, pero ahora está
   restringido a ser un **subconjunto** de su credencial — garantizado a nivel de base de datos
   con una FK compuesta `(user_id, specialty_id) → user_specialties(user_id, specialty_id)`,
   además de la FK compuesta existente `(membership_id, organization_id) → memberships(id,
   organization_id)`. Intentar asignar una especialidad fuera de la credencial es un 422 a nivel
   de aplicación (`StoreProfessionalSpecialtyRequest`), nunca un 500 por violación de FK.
3. **`duration_minutes`/`price_cents` viven en la asignación, no en el catálogo.**
   `professional_services` (la asignación profesional↔prestación) gana esas columnas, más
   `currency` (fija en `ARS`, nunca expuesta por la API). `services` queda con únicamente `name`.
4. **Las prestaciones no cuelgan de una especialidad.** No se modela relación alguna entre
   `services` y `specialties`; son catálogos independientes.
5. **Permisos**: nuevo `catalog.manage.own`, sumado al preset de `professional` (para gestionar
   su propia membresía en `professional_specialties`/`professional_services`); `owner`/`admin`
   siguen teniendo `catalog.manage` (org-wide); `staff` conserva solo `catalog.view`.
   `user_specialties` no usa esos permisos en absoluto: es un identity check puro, no
   org-scoped.

## Alternativas descartadas

- **Catálogo editable por organización (statu quo)**: obliga a cada consultorio a mantener su
  propia lista de especialidades/prestaciones, lo que impide una fuente de verdad compartida
  entre organizaciones y complica una futura sincronización con sistemas externos (colegios
  profesionales, nomencladores). Se descarta porque el negocio real es un catálogo de
  referencia compartido, no configuración por tenant.
- **Especialidad a un solo nivel** (mantener `professional_specialties` sin `user_specialties`):
  más simple, pero no puede expresar "el profesional está habilitado para X pero no la ejerce
  acá" ni prevenir a nivel de base que se le asigne una especialidad que no tiene como
  credencial. Se descarta porque la garantía de subconjunto es justamente el punto central del
  cambio.
- **`duration_minutes`/`price_cents` en el catálogo** (mantenerlos en `services`): asume que
  toda organización cobra y dura lo mismo por la misma prestación, lo cual es falso — cada
  profesional/organización define su propia duración y precio para la misma prestación
  catalogada. Se descarta a favor de moverlos a la asignación.
- **Servicios colgando de una especialidad**: agregaría una relación `services.specialty_id`
  que el negocio no pidió y que acoplaría dos catálogos independientes sin necesidad.

## Consecuencias

- El catálogo queda **vacío en producción** hasta que exista la app externa que lo gestione y
  sincronice — una consecuencia aceptada, no un hueco: el seeder que lo puebla es explícitamente
  solo para dev/test.
- Cualquier flujo que dependa de `services`/`specialties` teniendo datos (reserva online,
  agenda) queda bloqueado hasta que el catálogo tenga contenido real — fuera del alcance de este
  issue (ver #24, #26).
- Revocar una especialidad de `user_specialties` (des-asignar la credencial) hace cascada sobre
  `professional_specialties` vía la FK compuesta `(user_id, specialty_id)`: el profesional deja
  de figurar como practicante de esa especialidad en toda organización donde la ejercía. Este
  comportamiento es intencional y está documentado/testeado (`tests/Feature/Models/ModelSchemaTest.php`).
- Borrar un `Specialty`/`Service` del catálogo mientras está en uso (como credencial o como
  asignación) queda bloqueado a nivel de base (`restrictOnDelete`), protegiendo la integridad
  de las credenciales y asignaciones existentes.
- El panel (#22) queda sin UI de gestión del catálogo por diseño: solo consume los endpoints de
  lectura y los de asignación por profesional/membresía.
