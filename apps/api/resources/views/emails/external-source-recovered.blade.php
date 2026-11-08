<x-email.layout
    :title="'El '.$officialName.' volvió a responder'"
    label="Monitoreo"
    eyebrow="Fuente externa recuperada"
    note-title="La caída"
>
    <p>Volvió a responder el <strong>{{ $until }}</strong> (hora de Argentina).</p>

    <p>{{ $recovery }}</p>

    <x-slot:note>
        <strong>Caído desde:</strong> {{ $since }}<br>
        <strong>Duración:</strong> {{ $duration }}
    </x-slot:note>
</x-email.layout>
