# Infrastructure

> Proyecto vivo: esto documenta el punto de partida elegido para no bloquear el arranque, no un compromiso permanente. Cualquier punto acá puede cambiar cuando aparezca una necesidad real — no hay que pedir permiso para revisar esto, solo actualizar el doc cuando cambie.

## Colas

`QUEUE_CONNECTION=database` para arrancar. Redis solo si aparece una necesidad real de throughput/latencia que la cola en base de datos no pueda cubrir — no antes.

## Caché

Driver por defecto de Laravel. No optimizar prematuramente: sin justificación concreta (medición, no intuición), no vale la pena introducir Redis/Memcached solo para cache.

## Archivos

Disco local en la primera etapa. Cuando haga falta almacenamiento distribuido/durable (múltiples instancias, backups, CDN), migrar a un bucket compatible con S3 — Laravel's filesystem abstraction hace ese cambio barato cuando llegue el momento, así que no se justifica adelantarlo.

## Observabilidad

Herramientas evaluadas (no instaladas todavía): Laravel Pulse, Laravel Nightwatch, Uptime Kuma. El objetivo cuando se necesite: logs, métricas, monitoreo, uptime — con preferencia por soluciones gratuitas o de muy bajo costo dado el estadio del proyecto. Sin decisión tomada sobre cuál(es) usar.
