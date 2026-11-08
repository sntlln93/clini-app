<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>El registro nacional de profesionales no responde</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>El Buscador Nacional de Profesionales de la Salud está caído desde el <strong>{{ $since }}</strong> (hora de Argentina).</p>

    <p>
        <strong>Último motivo:</strong> {{ $stepLabel }} (<code>{{ $step }}</code>).
    </p>

    <p>Mientras siga así, nadie puede cargar su DNI ni aceptar una invitación como profesional, y las matrículas no se reverifican. Clini lo vuelve a probar cada 5 minutos y te avisa cuando responda.</p>
</body>
</html>
