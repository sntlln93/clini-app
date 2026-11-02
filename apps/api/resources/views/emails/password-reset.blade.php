<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Restablecé tu contraseña de Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Hola {{ $name }},</p>

    <p>
        Recibimos un pedido para restablecer la contraseña de tu cuenta de Clini. Para elegir una nueva, entrá a este
        enlace e ingresá tu correo.
    </p>

    <p>
        <a href="{{ $resetUrl }}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Elegir una contraseña nueva
        </a>
    </p>

    <p>
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
        <a href="{{ $resetUrl }}">{{ $resetUrl }}</a>
    </p>

    <p>
        Este enlace vence en 60 minutos y solo puede usarse una vez. Al cambiar la contraseña se cierran todas las
        sesiones abiertas de tu cuenta.
    </p>

    <p>
        Si no lo pediste, podés ignorar este correo: tu contraseña sigue siendo la misma.
    </p>
</body>
</html>
