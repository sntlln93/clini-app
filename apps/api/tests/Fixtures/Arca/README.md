# ARCA (WSAA + WSFEv1) answers

Answers of ARCA's web services for `ArcaInvoiceService` and `ArcaAccessTicket` (#246). They follow the shapes documented
in ARCA's own manuals, with made-up data: no homologation certificate existed when they were written.

- WSAA: «Especificación técnica WSAA» 1.2.2 (<https://www.afip.gob.ar/ws/WSAA/Especificacion_Tecnica_WSAA_1.2.2.pdf>).
  `loginCmsReturn` carries the ticket as escaped XML; a refusal is a SOAP fault (`coe.alreadyAuthenticated` while a
  ticket is still valid).
- WSFEv1: «Manual para el desarrollador» RG 4291, v4.7
  (<https://www.afip.gob.ar/ws/documentacion/manuales/manual-desarrollador-ARCA-COMPG.pdf>). The service answers SOAP
  1.1 with the default namespace `http://ar.gov.afip.dif.FEV1/`, the detail as `FECAEDetResponse` and observations as
  `Observaciones/Obs`.

The token, sign, CAE and CUIT are invented. Replace each file with a real homologation answer (token and sign
redacted) once Clini's homologation certificate exists; the tests read them by name.
