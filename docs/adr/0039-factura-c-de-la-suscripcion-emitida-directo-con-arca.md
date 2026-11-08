# ADR 0039: Factura C de la suscripción, emitida directo con ARCA

## Estado

Aceptado (#246). Se apoya en el ADR 0023 (archivos descargables armados en el frontend) para el PDF de la factura, y en el patrón de adaptadores elegidos por configuración del ADR 0038 (`PROFESSIONAL_REGISTRY`).

## Contexto

Mercado Pago cobra la suscripción del plan Consultorio (ADR 0014), pero Clini no emitía ningún comprobante por esos cobros. Quien opera Clini es monotributista: emite factura C, la misma para cualquier cliente. La factura electrónica la autoriza ARCA (ex AFIP), que le da a cada comprobante un CAE.

Hay tres formas de hacerlo: un servicio intermediario de facturación, el SDK de un tercero o los web services de ARCA directamente (WSAA para autenticarse con un certificado, WSFEv1 para emitir). Además hay que decidir qué datos del cliente lleva la factura, qué pasa si ARCA no responde y qué pasa con una respuesta que se pierde a mitad de camino. Esto último importa porque ARCA exige numeración correlativa sin huecos por punto de venta y tipo.

## Decisión

**Integración directa con ARCA, detrás de `App\Contracts\InvoiceIssuer`.** `ArcaInvoiceService` habla con WSFEv1 y `ArcaAccessTicket` con WSAA, con SOAP armado a mano que viaja por el cliente `Http`. La imagen de producción no tiene `ext-soap`, y por `Http` los tests pueden simular las respuestas. `INVOICE_ISSUER` elige el adaptador: `arca`, o `fake`, que autoriza con un CAE inventado sin salir de Clini (dev, CI y e2e). Producción rechaza `fake` al resolverlo, igual que `PROFESSIONAL_REGISTRY`. `ARCA_ENVIRONMENT` apunta `arca` a homologación o a producción, y cada entorno tiene su propio certificado, CUIT y punto de venta. Cada factura guarda en qué entorno se autorizó, y solo la de producción tiene validez fiscal.

**Factura C a consumidor final, sin datos del cliente.** El receptor es siempre `DocTipo` 99, `DocNro` 0, `CondicionIVAReceptorId` 5. No se pide ni se guarda CUIT, razón social ni domicilio de la organización. No hace falta, y una factura con datos fiscales (A, o a nombre de la organización) se puede sumar después como otra regla sin migrar las que ya existen. El tipo de comprobante va en configuración (`INVOICE_VOUCHER_TYPE`), pero la regla solo admite 11 (C). Pasar a responsable inscripto cambia la configuración y esa regla (los importes con IVA), no el resto.

**Una factura por cobro aprobado, por lo que se cobró.** La idempotencia vive en `invoices`, única por el id del pago del proveedor, y no en la notificación: Mercado Pago avisa el mismo cobro varias veces. El webhook la escribe `pending` dentro de su transacción, con la suscripción bloqueada. El importe es el `transaction_amount` del cobro, no el precio del plan. Se factura todo cobro aprobado, también uno tardío que ya no cambia el estado de la suscripción, porque la plata se cobró igual.

**La factura nunca condiciona la suscripción.** La emisión corre en un job encolado después del commit, con reintentos y backoff. El webhook aplica el pago aunque ARCA esté caído, y un barrido horario vuelve a encolar las facturas que siguen pendientes. Una factura que ARCA rechaza queda pendiente: no hay estado «fallida».

**Numeración sin repetir ni saltear.** Con un lock por entorno, CUIT, punto de venta y tipo, se consulta el último número autorizado y se reserva el siguiente en la factura **antes** de pedirlo. Si la respuesta se pierde, el intento siguiente pregunta a ARCA por ese número (`FECompConsultar`) y lo adopta si quedó autorizado con el mismo importe, en vez de pedir otro. Un rechazo libera el número.

**El ticket de WSAA se guarda toda su vida.** Vale 12 horas, y WSAA rechaza otro mientras haya uno vigente. Se guarda cifrado en la caché, que en los entornos desplegados es la base de datos y sobrevive a un deploy, y un lock evita dos pedidos a la vez.

**El PDF lo arma el panel y el mail solo avisa.** La API devuelve los datos de la factura, el QR de la RG 4892 incluido. El panel arma el PDF con pdfmake (ADR 0023) y el mail informa número, CAE y total con un enlace a Ajustes, sin adjunto. Los datos fiscales del emisor se copian en cada factura al emitirla, así un cambio de domicilio no reescribe las anteriores.

## Alternativas descartadas

- **Un intermediario de facturación** (un servicio que emite por nosotros): agrega un proveedor que recibe los datos de cada cobro y un costo por comprobante. A cambio solo ahorra la integración con WSAA y WSFEv1, que es acotada.
- **`SoapClient` o una librería SOAP**: la imagen de producción no tiene `ext-soap`, y sus llamadas esquivan el cliente `Http`, así que los tests no podrían simular ARCA ni frenar una llamada real.
- **Pedir los datos fiscales del cliente** (CUIT, razón social, condición frente al IVA): una factura C no los necesita. Pedirlos suma datos personales y un formulario, y el criterio es exponer lo mínimo y relajarlo después.
- **Idempotencia por notificación** (`subscription_events`): un mismo cobro llega en varias notificaciones con ids distintos.
- **Emitir dentro del webhook**: ARCA caído haría fallar o demorar la activación de la suscripción.
- **Adjuntar el PDF al mail**: obligaría a armar PDFs en la API, lo que el ADR 0023 descarta.

## Consecuencias

- Producción necesita, antes del primer cobro real, el certificado de producción, su relación con `wsfe`, un punto de venta «RECE / Factura Electrónica – Web Services» y los datos fiscales del emisor en Dokploy. Sin eso, las facturas quedan pendientes y se emiten cuando se configura. Los pasos están en `docs/architecture/subscriptions.md`.
- ARCA entra en el inventario de proveedores de `docs/architecture/security.md`: recibe el CUIT del emisor, el importe y las fechas de cada cobro, nunca datos de pacientes ni de la organización.
- Los tests nunca llegan a ARCA: usan respuestas SOAP en `tests/Fixtures/Arca/`, armadas por ahora con la forma que documentan los manuales. Hay que reemplazarlas por respuestas reales de homologación cuando exista el certificado.
- Quedan fuera: factura A o B, facturar a la organización con sus datos, notas de crédito por reintegros, gestión del certificado desde el panel, avisar al equipo cuando ARCA está caído (como #424/#427) y mostrar las facturas a los operadores.
