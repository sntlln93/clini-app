<x-email.layout
    :title="'¡Hola, '.$name.'!'"
    label="Seguridad"
    eyebrow="Restablecer contraseña"
    :action-url="$resetUrl"
    action-text="Elegir una contraseña nueva"
    note-title="El enlace es personal"
>
    <p>
        Recibimos un pedido para restablecer la contraseña de tu cuenta de Clini. Para elegir una nueva, entrá a este
        enlace e ingresá tu correo.
    </p>

    <x-slot:note>
        <p style="margin: 0 0 8px;">
            Este enlace vence en 60 minutos y solo puede usarse una vez. Al cambiar la contraseña se cierran todas las
            sesiones abiertas de tu cuenta.
        </p>
        <p style="margin: 0;">Si no lo pediste, podés ignorar este correo: tu contraseña sigue siendo la misma.</p>
    </x-slot:note>
</x-email.layout>
