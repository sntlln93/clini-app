# ARCA (WSAA + WSFEv1) answers

Answers of ARCA's web services for `ArcaInvoiceService` and `ArcaAccessTicket` (#246).

**Recorded from ARCA's homologation services** (2026-11-08, «HomologacionExterno»), with the issuer's CUIT replaced by the
made-up `20111111112` the tests configure:

- `FECompUltimoAutorizado.xml`: the last authorized number (1).
- `FECompConsultar.xml`: voucher 1, found with its CAE. `FECompConsultar-not-found.xml`: error 602 for a number never
  authorized.
- `FECAESolicitar-approved.xml`: voucher 2 authorized. `FECAESolicitar-rejected.xml`: a skipped number (6) refused with
  10016, which comes in the result's `Errors`, not in the detail's `Observaciones`.

**Built from ARCA's manuals** (made-up data), until they can be recorded:

- `loginCms.xml` and `loginCms-already-authenticated.xml`: «Especificación técnica WSAA» 1.2.2
  (<https://www.afip.gob.ar/ws/WSAA/Especificacion_Tecnica_WSAA_1.2.2.pdf>). A real `loginCms` answer carries a valid
  token and sign: record it with both redacted.
- `FECAESolicitar-invalid-ticket.xml`: error 600, «Manual para el desarrollador» RG 4291 v4.7
  (<https://www.afip.gob.ar/ws/documentacion/manuales/manual-desarrollador-ARCA-COMPG.pdf>).

The service answers SOAP 1.1 with the default namespace `http://ar.gov.afip.dif.FEV1/`, a `FEHeaderInfo` header, the
detail as `FECAEDetResponse` and observations as `Observaciones/Obs`. Never commit a real CUIT, token or sign.
