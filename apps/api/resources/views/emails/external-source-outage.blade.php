<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>{{ $officialName }} no responde</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>El {{ $officialName }} está caído desde el <strong>{{ $since }}</strong> (hora de Argentina).</p>

    <p>
        <strong>Último motivo:</strong> {{ $stepLabel }} (<code>{{ $step }}</code>).
    </p>

    <p>{{ $impact }} Clini lo vuelve a probar cada 5 minutos y te avisa cuando responda.</p>
</body>
</html>
