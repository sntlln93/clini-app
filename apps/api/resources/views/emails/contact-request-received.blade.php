<x-email.layout
    title="Nueva consulta comercial"
    label="Contacto"
    eyebrow="Formulario de la landing"
    note-title="Datos de la consulta"
>
    <p>Entró una consulta desde el formulario de contacto de la landing. Respondé este correo para escribirle directamente.</p>

    <x-slot:note>
        <p style="margin: 0 0 12px; color: #0f1a1b;">
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

        <p style="margin: 0; white-space: pre-line; color: #0f1a1b;">{{ $contactRequest->message }}</p>

        @if ($inboxUrl)
            <p style="margin: 12px 0 0;">
                Cuando la atiendas, actualizá su estado en el dashboard:<br>
                <a href="{{ $inboxUrl }}" style="color: #0d7179; word-break: break-all;">{{ $inboxUrl }}</a>
            </p>
        @endif
    </x-slot:note>
</x-email.layout>
