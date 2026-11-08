<x-email.layout
    :title="'¡Hola, '.$name.'!'"
    label="Tu cuenta"
    eyebrow="Confirmá tu correo"
    :action-url="$verificationUrl"
    action-text="Confirmar correo"
    note-title="El enlace es personal"
>
    <p>Gracias por registrarte en Clini. Confirmá tu correo para activar tu cuenta.</p>

    <x-slot:note>
        Este enlace vence en 48 horas y solo puede usarse una vez.<br>
        Si no creaste una cuenta en Clini, podés ignorar este correo.
    </x-slot:note>
</x-email.layout>
