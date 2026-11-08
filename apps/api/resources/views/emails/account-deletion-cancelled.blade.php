<x-email.layout
    :title="'¡Hola, '.$name.'!'"
    label="Tu cuenta"
    eyebrow="Eliminación cancelada"
    note-title="¿No fuiste vos?"
>
    <p>
        Ingresaste a Clini antes de la fecha en que íbamos a eliminar tu cuenta, así que cancelamos el pedido. Tu
        cuenta sigue activa.
    </p>

    <p>Si todavía querés eliminarla, podés volver a pedirlo desde Ajustes › Protección de datos.</p>

    <x-slot:note>
        Si no fuiste vos quien ingresó, cambiá tu contraseña y activá la verificación en dos pasos.
    </x-slot:note>
</x-email.layout>
