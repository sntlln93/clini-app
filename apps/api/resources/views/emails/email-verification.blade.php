<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Confirmá tu correo en Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    <p>Hola {{ $name }},</p>

    <p>
        Gracias por registrarte en Clini. Confirmá tu correo para activar tu cuenta.
    </p>

    <p>
        <a href="{{ $verificationUrl }}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Confirmar correo
        </a>
    </p>

    <p>
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
        <a href="{{ $verificationUrl }}">{{ $verificationUrl }}</a>
    </p>

    <p>
        Este enlace vence en 48 horas y solo puede usarse una vez.
    </p>

    <p>
        Si no creaste una cuenta en Clini, podés ignorar este correo.
    </p>
</body>
</html>
