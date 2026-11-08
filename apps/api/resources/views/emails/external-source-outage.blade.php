<x-email.layout
    :title="'El '.$officialName.' no responde'"
    label="Monitoreo"
    eyebrow="Fuente externa caída"
    note-title="Último motivo"
>
    <p>Está caído desde el <strong>{{ $since }}</strong> (hora de Argentina).</p>

    <p>{{ $impact }} Clini lo vuelve a probar cada 5 minutos y te avisa cuando responda.</p>

    <x-slot:note>
        {{ $stepLabel }} (<code>{{ $step }}</code>).
    </x-slot:note>
</x-email.layout>
