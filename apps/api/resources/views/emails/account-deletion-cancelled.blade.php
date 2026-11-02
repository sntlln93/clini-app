<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Cancelamos la eliminación de tu cuenta de Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Hola {{ $name }},</p>

    <p>
        Ingresaste a Clini antes de la fecha en que íbamos a eliminar tu cuenta, así que cancelamos el pedido. Tu
        cuenta sigue activa.
    </p>

    <p>
        Si todavía querés eliminarla, podés volver a pedirlo desde Ajustes › Protección de datos.
    </p>

    <p>
        Si no fuiste vos quien ingresó, cambiá tu contraseña y activá la verificación en dos pasos.
    </p>
</body>
</html>
