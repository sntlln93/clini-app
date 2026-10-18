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

    <p>Hola,</p>

    <p>
        Tu turno en <strong>{{ $organizationName }}</strong> es el <strong>{{ $startAt }}</strong>.
    </p>

    <p>
        <a href="{{ $detailsUrl }}" style="display: inline-block; padding: 10px 20px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">Ver los detalles del turno</a>
    </p>

    <p>
        <a href="{{ $googleCalendarUrl }}" style="display: inline-block; padding: 10px 20px; border: 1px solid #111827; color: #111827; text-decoration: none; border-radius: 6px;">Agregar a Google Calendar</a>
    </p>

    <p style="font-size: 14px; color: #4b5563;">
        Para Apple Calendar, Outlook u otro calendario, abrí el archivo <strong>turno.ics</strong> adjunto.
    </p>

    <p>
        Si no podés asistir, contactate con {{ $organizationName ?? 'el consultorio' }} para reprogramar o cancelar tu turno.
    </p>
</body>
</html>
