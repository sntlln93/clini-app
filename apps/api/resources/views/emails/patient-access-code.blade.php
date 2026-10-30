<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Tu código para el turno</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Hola,</p>

    <p>
        Tu turno en <strong>{{ $organizationName ?? 'el consultorio' }}</strong> es el <strong>{{ $startAt }}</strong>.
    </p>

    <p>
        Si querés que quien te atienda vea lo que otros profesionales registraron en tus consultas anteriores, compartile este código durante el turno:
    </p>

    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">{{ $code }}</p>

    <p style="font-size: 14px; color: #4b5563;">
        Sirve una sola vez y solo para este turno. Si no lo compartís, quien te atienda solo ve lo que registre en tu consulta.
    </p>
</body>
</html>
