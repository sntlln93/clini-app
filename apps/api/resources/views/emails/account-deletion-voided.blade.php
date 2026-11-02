<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>No pudimos eliminar tu cuenta de Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Hola {{ $name }},</p>

    <p>
        Llegó la fecha en que íbamos a eliminar tu cuenta de Clini, pero no pudimos:
        @if ($lastAdmin)
            sos la única persona que administra
        @else
            tenés turnos por atender en
        @endif
        {{ implode(', ', $organizationNames) }}.
    </p>

    <p>
        Tu cuenta sigue activa, como estaba antes del pedido. Si todavía querés eliminarla,
        @if ($lastAdmin)
            sumá a otra persona como dueña o administradora
        @else
            reasigná o cancelá esos turnos
        @endif
        y volvé a pedirlo desde Ajustes › Protección de datos.
    </p>
</body>
</html>
