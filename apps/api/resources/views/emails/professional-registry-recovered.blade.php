<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>El registro nacional de profesionales volvió a responder</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>El Buscador Nacional de Profesionales de la Salud volvió a responder el <strong>{{ $until }}</strong> (hora de Argentina).</p>

    <p>
        <strong>Caído desde:</strong> {{ $since }}<br>
        <strong>Duración:</strong> {{ $duration }}
    </p>

    <p>Ya se pueden cargar DNIs y aceptar invitaciones como profesional otra vez.</p>
</body>
</html>
