{{-- Only the practice, the day, the time and the address (in the calendar event): never the professional, the service or anything clinical (ADR 0018). --}}
<x-email.layout
    title="¡Hola!"
    label="Recordatorio"
    eyebrow="Tu turno"
    :action-url="$detailsUrl"
    action-text="Ver los detalles del turno"
    note-title="Agendalo"
>
    @if ($logoUrl)
        <p>
            <img src="{{ $logoUrl }}" alt="{{ $organizationName }}" style="max-height: 64px; max-width: 240px; border: 0;">
        </p>
    @endif

    <p>Tu turno en <strong>{{ $organizationName }}</strong> es el <strong>{{ $startAt }}</strong>.</p>

    <p>Si no podés asistir, contactate con {{ $organizationName ?? 'el consultorio' }} para reprogramar o cancelar tu turno.</p>

    <x-slot:note>
        <p style="margin: 0 0 8px;">
            <a href="{{ $googleCalendarUrl }}" style="color: #0d7179; font-weight: 600;">Agregar a Google Calendar</a>
        </p>
        <p style="margin: 0;">
            Para Apple Calendar, Outlook u otro calendario, abrí el archivo <strong>turno.ics</strong> adjunto.
        </p>
    </x-slot:note>
</x-email.layout>
