# Correos: el template único

Todo correo que manda la API, los propios (`app/Mail`) y las notificaciones de Laravel (`app/Notifications`), se dibuja con **un solo layout**: el componente Blade `resources/views/components/email/layout.blade.php` (`<x-email.layout>`), introducido en #422. Ninguna vista de correo arma su propio `<html>`, sus estilos generales ni su encabezado de marca.

## Qué dibuja

De arriba hacia abajo, sobre fondo gris claro y en una tarjeta blanca de hasta 600 px con borde superior verde azulado:

| Sección | Prop o slot | Obligatoria |
|---|---|---|
| Encabezado: logo de la marca (`config('brand.mail_logo_url')`) | — | siempre |
| Etiqueta a la derecha del logo («Invitación», «Tu cuenta») | `label` | no |
| Ícono en círculo: el isotipo (`config('brand.mail_icon_url')`), igual en todos | `:icon="false"` lo saca | no (sale por defecto) |
| «Eyebrow» en píldora | `eyebrow` | no |
| Título | `title` | no |
| Cuerpo | el slot | **sí** |
| Botón oscuro | `action-url` + `action-text` | no |
| Caja de nota, con título opcional | slot `note` + `note-title` | no |
| Enlace alternativo («Si el botón no funciona…») | sale solo con el botón | — |
| Pie: `config('brand.name')` · «Más tiempo para atender.» | — | siempre |

```blade
<x-email.layout
    title="¡Hola!"
    label="Invitación"
    eyebrow="Invitación a tu clínica"
    :action-url="$acceptanceUrl"
    action-text="Aceptar invitación"
    note-title="Tu invitación es personal"
>
    <p>Te invitaron a unirte a <strong style="color: #0d7179;">{{ $organizationName }}</strong> en Clini.</p>

    <x-slot:note>
        Este enlace vence en 7 días y solo puede usarse una vez.
    </x-slot:note>
</x-email.layout>
```

El cuerpo va centrado y hereda la tipografía del layout: alcanza con `<p>`, `<strong>` y `<a>`. Lo que tiene forma de lista de datos (los de una consulta comercial, el resumen de una caída) va en la nota, que está alineada a la izquierda.

## Correo nuevo

1. Una Mailable en `app/Mail/<Módulo>/` con su vista en `resources/views/emails/`, que es un `<x-email.layout>` y nada más: sin `<html>`, sin `<body>`, sin leer `config('brand.*')`.
2. Una entrada en `mailableCases()` de `tests/Feature/Mail/MailLayoutTest.php`, con el enlace del botón y los datos que el correo tiene que conservar. El test recorre `app/Mail` y `app/Notifications` y falla si una clase no tiene su caso; también falla si una vista de `emails/` no usa el layout.
3. Si el correo va al paciente, solo lleva consultorio, día, hora y dirección ([ADR 0018](../adr/0018-datos-minimos-en-lo-que-sale-hacia-el-paciente.md)): eso incluye la etiqueta, el eyebrow y el título.

Una notificación nueva usa `MailMessage` como las demás y nombra su etiqueta y su eyebrow con `->markdown('notifications::email', ['label' => …, 'eyebrow' => …])`. `vendor/notifications/email.blade.php` la pasa al layout: el saludo es el título, las líneas de introducción el cuerpo, la acción el botón y las líneas de cierre la nota. `vendor/mail/html/message.blade.php` dibuja el layout con el Markdown ya convertido, y `vendor/mail/text/message.blade.php` arma la parte de texto con las mismas secciones. El tema que Laravel inlinea en los correos Markdown (`vendor/mail/html/themes/default.css`) está vacío a propósito: sus reglas para `body`, `p`, `a` y `h1` pisarían el diseño.

## Reglas del HTML

- Apto para clientes de correo: tablas con `role="presentation"`, estilos en línea, ancho máximo de 600 px (con una tabla fija para Outlook), solo modo claro (`color-scheme: light`) y fuentes del sistema: Outfit no es confiable en correo.
- Los colores están copiados del tema claro de `@clini/theme` (un correo no puede leer variables CSS): primario `#0d7179`, texto `#0f1a1b`, texto secundario `#5a6b6c`, acento `#d9eff0`, nota `#f3f8f7`, borde `#e7e8e8`, fondo `#eef2f2`. Todos los pares cumplen AA. Si cambia el tema, se actualizan a mano en `layout.blade.php` y `button.blade.php`.
- Se lee con las imágenes bloqueadas: el logo y el ícono llevan `alt` con el nombre de la marca, con estilo de texto.
- Los PNG del logo y del ícono son el `mailLogo` y el `mailIcon` de `@clini/brand`, publicados por el panel; ver [Marca](brand.md).
- No hay versión en texto plano de los correos propios ni modo oscuro (fuera de alcance de #422).
