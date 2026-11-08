# Integrations

> Proyecto vivo: esto documenta el punto de partida elegido, no un compromiso permanente. Revisar cuando cambien los requisitos — nada acá está grabado en piedra.

## Notificaciones

Diseño previsto: sistema desacoplado basado en eventos, no lógica de negocio hablando directo con cada canal.

```text
AppointmentBooked → Notification → Email → Push → WhatsApp → SMS
```

La idea es poder agregar canales nuevos sin tocar la lógica de negocio que dispara la notificación. Hoy el único canal construido es el mail (Resend en producción). Entre otros: recordatorios con su `.ics` (ADR 0018), el código de acceso a la historia (ADR 0029), invitaciones, verificación de correo, avisos de plan y suscripción a los dueños, y el aviso de cada consulta del formulario de contacto. Qué datos salen hacia cada tercero está en [Seguridad](security.md#flujo-de-datos).

## Web Push

Evaluado como canal complementario, no reemplazo del email. Casos de uso previstos:

- **Profesionales**: nuevo turno, cancelación, confirmación, próxima consulta, pago recibido, vencimiento de suscripción.
- **Pacientes**: confirmación de turno, recordatorios, reprogramaciones, cancelaciones.

## Mercado Pago

Suscripción SaaS por organización (cobro recurrente, webhook, período de gracia, modo solo lectura): ver [subscriptions.md](subscriptions.md). Los avisos de gracia/vencimiento salen hoy solo por mail; Web Push queda como seguimiento.

## ARCA (facturación electrónica)

Factura C de cada cobro aprobado de la suscripción, autorizada directo con los web services de ARCA (WSAA + WSFEv1), sin intermediario: ver [subscriptions.md](subscriptions.md#facturación-electrónica-246-adr-0039) y [ADR 0039](../adr/0039-factura-c-de-la-suscripcion-emitida-directo-con-arca.md).

## SMS

Se evaluó un sistema propio sobre dispositivos Android (técnicamente viable). Conclusión actual: no debería ser un pilar del sistema — depende de hardware y operadoras, incrementa complejidad operativa, escala peor que las alternativas. Si se implementa, sería como canal opcional, no core.
