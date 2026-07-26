<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Invitación a Clini</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    <p>Hola,</p>

    <p>
        Te invitaron a unirte a <strong>{{ $organizationName }}</strong> en Clini.
    </p>

    <p>
        <a href="{{ $acceptanceUrl }}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Aceptar invitación
        </a>
    </p>

    <p>
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
        <a href="{{ $acceptanceUrl }}">{{ $acceptanceUrl }}</a>
    </p>

    <p>
        Este enlace vence en 7 días y solo puede usarse una vez.
    </p>

    <p>
        Si no esperabas esta invitación, podés ignorar este correo.
    </p>
</body>
</html>
