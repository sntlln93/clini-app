# ADR 0032: Matrículas validadas con el Buscador Nacional de Profesionales

## Estado

Aceptado (#380). El reemplazo previsto es el acceso oficial a REFEPS (#379). La emisión de recetas sigue en #314. El ADR 0038 (#387) cambia dos cosas: la especialidad de cada matrícula pasa a ser la fila del catálogo de especialidades que el registro llena (`specialty_id`), que decide con qué especialidades puede atender el profesional, y `NATIONAL_PROFESSIONAL_SEARCH_ENABLED` se reemplaza por la elección de adaptador `PROFESSIONAL_REGISTRY` (`national_search` o `fake`), así que ya no hay un registro «apagado»: donde abajo dice «apagado», ahora solo cabe «pausado» tras una falla. `NATIONAL_PROFESSIONAL_SEARCH_PER_RUN` pasa a llamarse `PROFESSIONAL_REGISTRY_PER_RUN`.

## Contexto

Una receta válida lleva la matrícula del profesional, con su entidad emisora, su jurisdicción y su código REFEPS (Res. MS 2214/2025, anexo II), y la CUIR usa la jurisdicción de la matrícula como código INDEC de 2 dígitos. La Disp. DNSISA 1/2025 exige además validar al profesional contra REFEPS, RENAPER y REFES. Hasta ahora Clini no guardaba la matrícula ni la provincia del consultorio: la provincia se derivaba de la dirección (dirección → ciudad → provincia), que ningún flujo del panel carga.

El acceso oficial a REFEPS («ABM Dominios») llega después de inscribirse como recetario (#379). Mientras tanto existe el **Buscador Nacional de Profesionales de la Salud** (`argentina.gob.ar/salud/buscador-nacional-de-profesionales-de-la-salud`), la cara pública de REFEPS. Relevado el 31/10 y el 01/11/2026:

- **No tiene API.** Es un formulario de Drupal sin captcha: un GET devuelve la página con el `form_build_id`, y un POST a la misma URL con `searchBy=dni`, el DNI, ese `form_build_id`, `form_id=argobar_consulta_refeps_profesionales`, `op=Consultar` y el honeypot `tarro_de_miel` vacío devuelve el resultado. La página trae otro formulario (el buscador del sitio) con su propio `form_build_id`, antes del de REFEPS.
- **Los resultados vienen como JSON** dentro del HTML, en `Drupal.settings.refepsProfesionales.allItems = [...]`. Cada persona trae su código REFEPS, documento, nombre, sexo, CUIL, `activo` y sus profesiones, cada una con su especialidad y sus matrículas (número, entidad emisora, provincia, situación y sanción).
- **«Sin resultados»** no trae ese JSON sino el aviso «No se encuentran resultados…». Un DNI que el formulario rechaza trae un mensaje de error de Drupal. `formHasError` vale 1 siempre y no indica nada.
- La provincia viene por nombre («CABA», «Córdoba», «Tierra del Fuego»); las matrículas nacionales (Ministerio de Salud de la Nación) figuran en «CABA».
- Las búsquedas públicas por nombre devolvieron solo profesionales activos y «Habilitado»: en la práctica, una matrícula suspendida probablemente aparezca como «no encontrada».

## Decisión

**La provincia del consultorio se declara.** `organizations.province` la carga quien administra el consultorio (`organization.manage`, Ajustes › Consultorio). `Organization::resolveProvince()` la prefiere a la de la dirección, que queda como respaldo, así que también decide los feriados provinciales: hay un solo concepto de «provincia del consultorio». Viaja en la sesión (`/me`).

**El DNI y las matrículas son del profesional,** como sus especialidades (ADR 0005): viajan con él a cada consultorio, y solo él los ve y los cambia (Ajustes › Matrículas). Nadie más del consultorio los ve. La matrícula que vale en un consultorio es la de su provincia; el panel la marca. El DNI se guarda cifrado, nunca se busca por él, no sale en `/me` y viaja solo en el cuerpo de los pedidos, nunca en una URL.

**Adaptador reemplazable.** `App\Contracts\ProfessionalRegistry` (`available()`, `lookUp($dni)`) lo implementa hoy `NationalProfessionalSearchService`. El acceso oficial a REFEPS (#379) es otro adaptador y otro binding. Una consulta por DNI responde todas las matrículas, así que se verifican todas las de un profesional con una sola consulta.

**Qué es «verificada».** Una matrícula declarada (número, provincia, profesión) está verificada cuando el registro tiene, para ese DNI, una matrícula con ese número en esa provincia y para esa profesión, en situación «Habilitado», sin una sanción vigente, y la persona figura `activo` = «SI» (`App\Support\ProfessionalLicenseMatch`). Si el registro la tiene pero no cumple, es **no coincide** con el motivo (inactivo, sancionada, no habilitada); si no la tiene, **no coincide** por no encontrada. El número se compara sin espacios ni puntos y sin mayúsculas, y un número sin letras coincide con el mismo número con prefijo («6789» y «MP 6789»); dos prefijos distintos no coinciden. Como todos los candidatos son del mismo DNI, esa tolerancia no confunde personas. Una sanción sin fecha de fin, o con una fecha que no se puede leer, cuenta como vigente: nunca se dice «verificada» adivinando.

**Sin verificar no bloquea nada.** Sin DNI, con el registro apagado o caído, la matrícula queda «sin verificar» (o con lo último que el registro dijo). Ningún estado bloquea la agenda, las notas ni la medicación indicada.

**Falla abierta, como el Buscador de Medicamentos (ADR 0031).** Timeout de 4 segundos por pedido. Una falla de conexión, un estado que no es 2xx, una página sin el formulario o una respuesta que no es ni resultados, ni «sin resultados», ni el formulario rechazando el DNI («El DNI ingresado no es válido») lanzan `professionals.registry_unavailable` y pausan el registro 5 minutos. Nunca se interpreta una página desconocida como «no encontrada». El rechazo del DNI sí es una respuesta sobre ese DNI (nadie registrado con él), y no pausa el registro para los demás. La Action atrapa la excepción y deja la matrícula como estaba; solo cuando el profesional pide «Volver a consultar» responde el 503, para que el panel no diga que consultó cuando no pudo. Está apagado por defecto (`NATIONAL_PROFESSIONAL_SEARCH_ENABLED`); `phpunit.xml` y el servicio `e2e` lo fijan apagado, y CI corre Pest con los dos buscadores apagados y encendidos. Los tests usan páginas grabadas (`tests/Fixtures/NationalProfessionalSearch`): el formulario, «sin resultados» y el error son páginas reales; la de resultados tiene la estructura real con datos inventados.

**Hacia afuera sale solo el DNI**, con un User-Agent que identifica a Clini. Los logs de una falla dicen qué paso falló, nunca el DNI.

**Datos mínimos.** De la respuesta se guarda, por matrícula, el código REFEPS, la entidad emisora, la especialidad, la situación, el estado, el motivo y la fecha de la consulta (`checked_at`); el número, la provincia y la profesión son los declarados, que coincidieron. Nunca el CUIL, el sexo ni el nombre: el CUIL recién se guardará cuando exista la receta, que lo exige en el perfil del prescriptor (#314). Un DNI nuevo vuelve todas las matrículas a «sin verificar» antes de consultarlas de nuevo, porque la respuesta anterior era de otra persona.

**Provincia a código INDEC.** `Province::indecCode()` da el código de 2 dígitos que usa la CUIR, y `Province::fromRegistryName()` traduce el nombre que escribe el registro (sin mayúsculas ni tildes, con «CABA» y «Capital Federal» como alias). Un nombre desconocido queda sin provincia y nunca coincide.

### Decisiones de triage

- **Qué profesiones pueden prescribir: no lo decide este issue.** Se guarda la profesión que respalda REFEPS, pero no habilita ni bloquea nada: la medicación indicada sigue siendo un registro de la historia clínica, no una receta (CU-53, ADR 0031), y un kinesiólogo o un psicólogo pueden seguir registrando lo que indicaron. Qué profesión prescribe qué (Ley 17.132 y las normas de cada profesión) es de #314, que puede leer la profesión ya guardada sin migrar datos. La lista de profesiones (`App\Enums\HealthProfession`) son las de consultorio con la etiqueta exacta de REFEPS; agregar una es agregar un caso.
- **Reverificación diaria, cada 7 días por matrícula.** `professionals:reverify-licenses` corre todos los días y consulta a quien tenga una matrícula sin respuesta o con una de hace 7 días o más (`ProfessionalLicense::REVERIFY_AFTER_DAYS`), primero a quien hace más que no se intenta (`attempted_at`, que se marca con o sin respuesta, así un DNI que siempre falla pasa al final y no frena a los demás), como mucho 200 profesionales por corrida (`NATIONAL_PROFESSIONAL_SEARCH_PER_RUN`), con un segundo entre consultas, y se detiene en cuanto el registro está apagado o falla. Una matrícula que deja de estar «Habilitado» pasa a «no coincide» y el profesional lo ve en Ajustes; no se bloquea nada, no se borra nada y no se avisa a nadie más. Bloquear o avisar al consultorio se puede agregar después sobre el estado guardado.
- **La validación corre al cargar, no al registrarse.** Se valida al agregar una matrícula, al cambiar el DNI, cuando el profesional pide «Volver a consultar» (los tres limitados a 10 por minuto por usuario) y en la reverificación diaria. El registro de cuenta no pide DNI ni matrícula: lo usan también dueños y recepcionistas, y sumar una consulta a un sitio de terceros al alta agrega demora y un punto de falla. Así el DNI sale de Clini solo por una acción explícita del profesional.

## Alternativas descartadas

- **Exigir la matrícula verificada para la medicación indicada.** Contradice que la medicación indicada no es una receta, deja sin la función a profesiones que la usan, y con el registro apagado por defecto bloquearía a todos.
- **Una dirección completa para el consultorio.** Lo que hace falta es la provincia; pedir calle y ciudad para declararla es más fricción y más datos. La dirección sigue existiendo y queda como respaldo.
- **Profesión libre.** Un texto libre no coincide con la etiqueta de REFEPS por un error de tipeo y deja la matrícula en «no coincide» sin motivo real.
- **Buscar por matrícula en vez de por DNI.** Una matrícula de 3 dígitos o menos falla sola (hay que enviarla como «Profesión - número») y la búsqueda por DNI ya trae todas.
- **Guardar la respuesta entera.** Trae CUIL, sexo, nombre y matrículas que no se declararon: datos que Clini no necesita hoy.
- **Que el DNI sea único entre usuarios.** Revelaría a quien carga un DNI que otra cuenta de Clini ya lo tiene.

## Consecuencias

- El formulario puede cambiar sin aviso. Un cambio deja las matrículas con lo último que se supo y las nuevas sin verificar, y el log dice qué paso falló. El reemplazo previsto es REFEPS oficial (#379), con su propio adaptador.
- La validación no confirma la identidad: alguien podría cargar el DNI de otra persona. El cruce con RENAPER y la biometría quedan para #379.
- Una matrícula suspendida probablemente figure como «no encontrada» y no como «no habilitada», porque la búsqueda pública parece mostrar solo habilitados.
- Los consultorios que ya existen no tienen provincia hasta que su dueño la declara; mientras tanto la dirección (si la hay) sigue decidiendo los feriados.
