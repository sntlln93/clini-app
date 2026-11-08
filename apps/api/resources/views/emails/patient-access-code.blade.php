{{-- Only the practice, the day, the time and the code: never the professional, the service or anything clinical (ADR 0018). --}}
<x-email.layout
    title="¡Hola!"
    label="Tu turno"
    eyebrow="Código para tu turno"
    note-title="Cómo funciona"
>
    <p>Tu turno en <strong>{{ $organizationName ?? 'el consultorio' }}</strong> es el <strong>{{ $startAt }}</strong>.</p>

    <p>
        Si querés que quien te atienda vea lo que otros profesionales registraron en tus consultas anteriores, compartile este código durante el turno:
    </p>

    <p style="margin: 24px 0 8px; font-family: 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #0d7179;">{{ $code }}</p>

    <x-slot:note>
        Sirve una sola vez y solo para este turno. Si no lo compartís, quien te atienda solo ve lo que registre en tu consulta.
    </x-slot:note>
</x-email.layout>
