<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ $officialName }} volvió a responder</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>El {{ $officialName }} volvió a responder el <strong>{{ $until }}</strong> (hora de Argentina).</p>

    <p>
        <strong>Caído desde:</strong> {{ $since }}<br>
        <strong>Duración:</strong> {{ $duration }}
    </p>

    <p>{{ $recovery }}</p>
</body>
</html>
