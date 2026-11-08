<x-email.layout
    :title="'¡Hola, '.$name.'!'"
    label="Tu cuenta"
    eyebrow="Eliminación no realizada"
>
    <p>
        Llegó la fecha en que íbamos a eliminar tu cuenta de Clini, pero no pudimos:
        @if ($lastAdmin)
            sos la única persona que administra
        @else
            tenés turnos por atender en
        @endif
        {{ implode(', ', $organizationNames) }}.
    </p>

    <p>
        Tu cuenta sigue activa, como estaba antes del pedido. Si todavía querés eliminarla,
        @if ($lastAdmin)
            sumá a otra persona como dueña o administradora
        @else
            reasigná o cancelá esos turnos
        @endif
        y volvé a pedirlo desde Ajustes › Protección de datos.
    </p>
</x-email.layout>
