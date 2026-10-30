# ADR 0026: Verificación en dos pasos (TOTP) para usuarios clínicos

## Estado

Aceptado (#357, derivado de #330).

## Contexto

La Ley 25.326 (art. 9) impone el deber de seguridad y la Res. AAIP 47/2018 recomienda autenticación robusta. Los usuarios clínicos (guard `web`: dueños, profesionales y staff) entraban solo con contraseña. El issue fija lo esencial: TOTP con app autenticadora, opcional y activada por cada usuario, sobre el `AuthController` actual, sin Fortify. Este ADR registra cómo se resolvió lo que el issue dejaba abierto.

## Decisión

**El login queda pendiente entre la contraseña y el código.** Si la contraseña coincide y el usuario tiene el factor activo, `POST /login` no autentica: guarda en la sesión (`login.two_factor`, `App\Support\PendingTwoFactorLogin`) el id del usuario y un vencimiento de 10 minutos, y responde `{"two_factor": true}`. `POST /login/two-factor` recibe un código de la app (`code`) o uno de recuperación (`recovery_code`), y recién ahí hace `login()` y regenera la sesión. Nada detrás de `auth:sanctum` responde mientras tanto. Con la contraseña equivocada la respuesta es el 422 de siempre, así que no se revela si la cuenta usa el segundo factor.

**Ningún otro camino abre una sesión clínica salteando el factor.** Aceptar una invitación como usuario existente y confirmar el correo hacían `login()` con solo el token del mail. Con el factor activo, ahora aceptan o confirman pero no abren sesión: el usuario entra por `/login` (el panel ya lo manda ahí, porque `_auth` pide sesión). El registro no cambia: una cuenta nueva no puede tener el factor.

**Errores.** Un código incorrecto, fuera de ventana o ya usado es 409 `auth.two_factor_code_invalid`, no 422: es una credencial rechazada, pero el 422 queda para las reglas del FormRequest (ADR 0009), que solo validan la forma (6 dígitos, uno de los dos campos). El resto también es 409: `auth.two_factor_challenge_expired` (no hay login pendiente o venció), `auth.two_factor_already_enabled`, `auth.two_factor_not_enabled`, `auth.two_factor_setup_missing`.

**Límites.** `two-factor-challenge`: 5 por minuto por la cuenta del login pendiente, sin IP, así que rotar IPs o sesiones no suma intentos. `two-factor`: 10 por minuto por usuario en Ajustes, donde cada pedido valida la contraseña o un código.

**Sin reuso.** `users.two_factor_last_used_step` guarda el último paso de 30 segundos aceptado, y un código solo vale si es más nuevo, también el que confirmó la activación. Los códigos de recuperación (8, `xxxxx-xxxxx`) se borran al usarse. La verificación corre con la fila del usuario bloqueada (`lockForUpdate`), así que dos pedidos simultáneos no gastan el mismo código.

**Activar también pide la contraseña**, además de confirmar con un código. El issue solo la exigía para desactivar y regenerar. Pero una sesión abierta en una computadora compartida podría activar el factor con su propio teléfono y dejar afuera al dueño de la cuenta. Es el criterio más conservador, y se puede relajar sin migrar datos.

**El secreto y los códigos se guardan cifrados** (casts `encrypted` y `encrypted:array`) y nunca salen de la API, salvo en la respuesta que los genera. El QR se dibuja en la API (`bacon/bacon-qr-code`, SVG) y el TOTP lo calcula `pragmarx/google2fa`, los dos detrás de `App\Contracts\TwoFactorAuthenticator`.

**Soporte.** `php artisan user:reset-two-factor <email>` desactiva el factor de quien perdió la app y los códigos. Verificar la identidad de quien lo pide es tarea de soporte, antes de correrlo.

## Alternativas descartadas

- **Fortify.** Lo descartó el issue: trae rutas, vistas y flujos propios que chocan con la API REST y el contrato de errores.
- **Autenticar con la contraseña y bloquear las rutas hasta el código** (un middleware). Cualquier ruta que se olvidara de pedirlo quedaría abierta. Con el login pendiente no hay sesión que proteger.
- **422 para un código incorrecto.** Rompería la regla de que el 422 es del FormRequest, que no puede verificar el código sin leer al usuario bajo bloqueo ni gastar un código de recuperación.
- **Guardar los códigos de recuperación como hash.** El issue pide el cast `encrypted`. Como solo se muestran al generarlos, un hash no cambiaría lo que ve el usuario, y se puede adoptar después regenerándolos.
- **Que el token de la invitación o del correo abra el login pendiente.** Así el token reemplazaría a la contraseña. Pedir el login completo es más simple y no expone nada.

## Consecuencias

- Todo camino nuevo que haga `login()` de un usuario clínico tiene que respetar el factor (`User::hasTwoFactorEnabled()`), como los tres de hoy.
- El factor sigue siendo opcional. Volverlo obligatorio por organización o por rol, o sumar WebAuthn, va en otro issue.
- Un usuario que pierde la app y los códigos depende de soporte para volver a entrar.
