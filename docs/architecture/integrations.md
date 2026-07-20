# Integrations

> Proyecto vivo: esto documenta el punto de partida elegido, no un compromiso permanente. Revisar cuando cambien los requisitos — nada acá está grabado en piedra.

## Notificaciones

Diseño previsto: sistema desacoplado basado en eventos, no lógica de negocio hablando directo con cada canal.

```text
AppointmentBooked → Notification → Email → Push → WhatsApp → SMS
```

La idea es poder agregar canales nuevos sin tocar la lógica de negocio que dispara la notificación. Todavía no implementado — ningún canal está construido.

## Web Push

Evaluado como canal complementario, no reemplazo del email. Casos de uso previstos:

- **Profesionales**: nuevo turno, cancelación, confirmación, próxima consulta, pago recibido, vencimiento de suscripción.
- **Pacientes**: confirmación de turno, recordatorios, reprogramaciones, cancelaciones.

## SMS

Se evaluó un sistema propio sobre dispositivos Android (técnicamente viable). Conclusión actual: no debería ser un pilar del sistema — depende de hardware y operadoras, incrementa complejidad operativa, escala peor que las alternativas. Si se implementa, sería como canal opcional, no core.
