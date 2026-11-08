<x-email.layout
    :title="'¡Hola, '.$name.'!'"
    label="Tu cuenta"
    eyebrow="Cuenta eliminada"
    note-title="Lo que se conserva"
>
    <p>
        Como pediste, eliminamos tu cuenta de Clini. Ya no se puede ingresar con ella, y este es el último correo que
        te enviamos a esta dirección.
    </p>

    <p>Si querés volver a usar Clini, podés crear una cuenta nueva con este mismo correo.</p>

    <x-slot:note>
        Si registraste o consultaste historias clínicas, lo que hiciste se conserva con tu nombre en ellas y en su
        registro de accesos, porque hay que guardarlo.
    </x-slot:note>
</x-email.layout>
