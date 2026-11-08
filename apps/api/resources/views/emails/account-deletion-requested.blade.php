<x-email.layout
    :title="'¡Hola, '.$name.'!'"
    label="Tu cuenta"
    eyebrow="Eliminación de cuenta"
    :action-url="$loginUrl"
    action-text="Ingresar a Clini"
    note-title="Qué pasa cuando se elimine"
>
    <p>
        Recibimos tu pedido para eliminar tu cuenta de Clini. Vamos a eliminarla el <strong>{{ $deletesOn }}</strong>.
        Hasta entonces dejaste de figurar en la agenda y en la reserva online de tus consultorios.
    </p>

    <p>
        Si cambiaste de idea, ingresá a Clini antes de esa fecha con tu correo y tu contraseña: el pedido se cancela
        solo y todo vuelve a estar como antes.
    </p>

    <x-slot:note>
        <p style="margin: 0 0 8px;">
            Cuando se elimine, borramos tu correo, tu contraseña, tu verificación en dos pasos, tu DNI, tus matrículas y
            tus especialidades. Si registraste o consultaste historias clínicas, lo que hiciste se conserva con tu nombre
            en ellas y en su registro de accesos, porque hay que guardarlo.
        </p>
        <p style="margin: 0;">Si no pediste eliminar tu cuenta, ingresá a Clini ahora para cancelarlo y cambiá tu contraseña.</p>
    </x-slot:note>
</x-email.layout>
