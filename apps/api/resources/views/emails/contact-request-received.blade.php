<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Nueva consulta comercial</title>
</head>
<body style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
    @include('emails.partials.brand-header')

    <p>Entró una consulta desde el formulario de contacto de la landing.</p>

    <p>
        <strong>Nombre:</strong> {{ $contactRequest->name }}<br>
        <strong>Correo:</strong> {{ $contactRequest->email }}<br>
        @if ($contactRequest->phone)
            <strong>Teléfono:</strong> {{ $contactRequest->phone }}<br>
        @endif
        @if ($contactRequest->organization_name)
            <strong>Consultorio o centro:</strong> {{ $contactRequest->organization_name }}<br>
        @endif
        @if ($contactRequest->team_size)
            <strong>Profesionales:</strong> {{ $contactRequest->team_size }}<br>
        @endif
        <strong>Plan de interés:</strong> {{ $planLabel }}
    </p>

    <p style="white-space: pre-line;">{{ $contactRequest->message }}</p>

    <p>Respondé este correo para escribirle directamente.</p>

    @if ($inboxUrl)
        <p>
            Cuando la atiendas, actualizá su estado en el dashboard:<br>
            <a href="{{ $inboxUrl }}">{{ $inboxUrl }}</a>
        </p>
    @endif
</body>
</html>
