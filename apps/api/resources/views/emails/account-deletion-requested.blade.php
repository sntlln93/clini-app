<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Pediste eliminar tu cuenta de Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Hola {{ $name }},</p>

    <p>
        Recibimos tu pedido para eliminar tu cuenta de Clini. Vamos a eliminarla el <strong>{{ $deletesOn }}</strong>.
        Hasta entonces dejaste de figurar en la agenda y en la reserva online de tus consultorios.
    </p>

    <p>
        Si cambiaste de idea, ingresá a Clini antes de esa fecha con tu correo y tu contraseña: el pedido se cancela
        solo y todo vuelve a estar como antes.
    </p>

    <p>
        <a href="{{ $loginUrl }}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Ingresar a Clini
        </a>
    </p>

    <p>
        Cuando se elimine, borramos tu correo, tu contraseña, tu verificación en dos pasos, tu DNI, tus matrículas y tus
        especialidades. Si registraste o consultaste historias clínicas, lo que hiciste se conserva con tu nombre en
        ellas y en su registro de accesos, porque hay que guardarlo.
    </p>

    <p>
        Si no pediste eliminar tu cuenta, ingresá a Clini ahora para cancelarlo y cambiá tu contraseña.
    </p>
</body>
</html>
