<x-email.layout
    title="¡Hola!"
    label="Invitación"
    eyebrow="Invitación a tu clínica"
    :action-url="$acceptanceUrl"
    action-text="Aceptar invitación"
    note-title="Tu invitación es personal"
>
    <p>Te invitaron a unirte a <strong style="color: #0d7179;">{{ $organizationName }}</strong> en Clini.</p>

    @if ($professional)
        <p>
            Para aceptarla vas a necesitar tu DNI: con él buscamos tu nombre y tus matrículas en el Buscador Nacional de Profesionales de la Salud del Ministerio de Salud.
        </p>
    @endif

    <x-slot:note>
        Este enlace vence en 7 días y solo puede usarse una vez.<br>
        Si no esperabas esta invitación, podés ignorar este correo.
    </x-slot:note>
</x-email.layout>
