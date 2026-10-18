<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Recordatorio de turno</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    @if ($logoUrl)
        <p>
            <img src="{{ $logoUrl }}" alt="{{ $organizationName }}" style="max-height: 64px; max-width: 240px;">
        </p>
    @endif

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
        <a href="{{ $googleCalendarUrl }}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">Agregar a Google Calendar</a>
    </p>

    <p style="font-size: 14px; color: #4b5563;">
        Para Apple Calendar, Outlook u otro calendario, abrí el archivo <strong>turno.ics</strong> adjunto.
    </p>

    <p>
        Si no podés asistir, contactate con la organización para reprogramar o cancelar tu turno.
    </p>
</body>
</html>
