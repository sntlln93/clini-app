<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Recordatorio de turno</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    <p>Hola {{ $patientName }},</p>

    <p>
        Te recordamos tu turno en <strong>{{ $organizationName }}</strong>:
    </p>

    <p>
        <strong>Profesional:</strong> {{ $professionalName }}<br>
        <strong>Servicio:</strong> {{ $serviceName }}<br>
        <strong>Fecha y hora:</strong> {{ $startAt }}
    </p>

    <p>
        Si no podés asistir, contactate con la organización para reprogramar o cancelar tu turno.
    </p>
</body>
</html>
