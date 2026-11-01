<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Eliminamos tu cuenta de Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Hola {{ $name }},</p>

    <p>
        Como pediste, eliminamos tu cuenta de Clini. Ya no se puede ingresar con ella, y este es el último correo que
        te enviamos a esta dirección.
    </p>

    <p>
        Si registraste algo en historias clínicas, se conserva con tu nombre, porque la ley obliga a guardarlo.
    </p>

    <p>
        Si querés volver a usar Clini, podés crear una cuenta nueva con este mismo correo.
    </p>
</body>
</html>
