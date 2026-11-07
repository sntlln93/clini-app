# ADR 0036: Cifrado envolvente de la historia clínica

## Estado

Aceptado (#391). Completa el criterio 5 de #358 y convive con el solo agregado de [ADR 0019](0019-historia-clinica-de-solo-agregado.md).

## Contexto

El texto libre de la historia clínica (notas, medicación indicada, antecedentes, los motivos de cada enmienda o anulación y las palabras del profesional al declarar un acceso excepcional) se guardaba en claro. Un volcado de la base, un backup filtrado o una inyección SQL lo exponían entero.

Ninguna consulta SQL busca, ordena ni agrupa por esos campos: se leen por ids, y el aviso de alergias ([ADR 0030](0030-aviso-de-alergias-al-indicar-medicacion.md)) compara en PHP. Cifrarlos cuesta poco.

Lo que lo complica es el solo agregado: el trigger rechaza todo `UPDATE` sobre la historia. Una fila cifrada no se puede volver a cifrar. Con una clave única, rotarla obligaría a conservar cada clave vieja para siempre. Y cifrar filas existentes después del lanzamiento exigiría abrir el trigger. Por eso se hace ahora, mientras las migraciones se editan en el lugar.

## Decisión

**Cifrado envolvente, con una maestra propia.**

- **Clave de datos:** cada valor se cifra con AES-256-GCM y se guarda como `<id de la clave>:<texto cifrado>` en una columna `text`, con los casts `EncryptedClinicalText` y `EncryptedClinicalList`. Hay una sola clave de datos, que la crea la migración de su tabla (`clinical_encryption_keys`), así que ningún pedido compite por crearla.
- **Maestra:** la clave de datos se guarda cifrada con `CLINICAL_ENCRYPTION_KEY`, que no es `APP_KEY`. `clinical_encryption_keys` es la única tabla de la historia que admite `UPDATE`.
- **Quién tiene la maestra:** solo `App\Contracts\KeyManagementService`, que cifra o descifra la clave de datos y nada más. El adaptador inicial, `EnvKeyManagementService`, la lee del entorno.
- **Falla cerrado:** sin maestra no se escribe ni se lee nada clínico, y migrar falla. Producción rechaza la clave pública de dev, CI y e2e, y ninguna maestra puede ser `APP_KEY`.
- **Rotar la maestra** (`clinical-keys:rotate`) vuelve a cifrar solo la clave de datos con la maestra nueva, en una transacción: si falla a mitad, queda como estaba. La historia no se toca. La maestra retirada sale del servidor y se guarda fuera de línea solo mientras duren los backups anteriores a la rotación.
- **Columnas:** las que lista `security.md`. Quedan fuera los valores de `vital_signs`, los enums (`severity`, `blood_type`, `dispensing_condition`, `control_mark`), los diagnósticos CIE-10 copiados del catálogo, y el documento, el nombre y los contactos del paciente. `substances` deja de ser `jsonb` y pasa a ser un JSON cifrado.
- **Sin blind index:** nada de lo cifrado se busca, se ordena ni se agrupa.
- **El trigger de solo agregado no cambia.**

## Riesgo residual aceptado

El cifrado protege del robo de la base, de un backup filtrado y de una inyección SQL que solo lee. No protege de quien compromete el servidor de la app, donde están la base y la maestra a la vez.

Tampoco de una inyección que puede insertar filas, si además tiene una cuenta de profesional: el texto cifrado no está atado a su fila, así que podría copiar el de otro paciente en un registro propio y leerlo por la API. Atarlo (cifrar con el paciente, la organización y la columna como contexto) queda para un issue aparte.

## Alternativas descartadas

- **El cast `encrypted` con `APP_KEY`:** rotar `APP_KEY` no protegería lo guardado, porque el trigger impide volver a cifrarlo, y habría que conservar cada clave vieja indefinidamente. Además, `APP_KEY` circula más (sesión, cookies, links firmados): una filtración de la sesión no debería abrir la historia.
- **Abrir el trigger para volver a cifrar:** rompe la garantía de [ADR 0019](0019-historia-clinica-de-solo-agregado.md) justo sobre los datos que protege.
- **AWS KMS desde el día uno:** suma un proveedor fuera del país y una dependencia de red en cada lectura, para un riesgo que hoy cubre la maestra separada.
- **OpenBao desde el día uno:** es operar otro servicio crítico antes de tener consultorios. Entra más adelante como otro adaptador de `KeyManagementService`, y migrar a él solo vuelve a cifrar la clave de datos.

## Consecuencias

- Una columna clínica nueva de texto libre usa el cast, es `text`, y su test de lectura cruda se suma a `ClinicalEncryptionAtRestTest`. Una inserción cruda en estas tablas (un test, una migración) cifra con `ClinicalEncryption`.
- Los largos máximos los controlan solo los FormRequests: una columna `text` cifrada no los impone.
- Perder la maestra es perder la historia. Se resguarda fuera de línea con los backups (#390).
- Dev, CI y e2e comparten una maestra pública, porque solo tienen datos sintéticos. Un `.env` anterior a #391 necesita agregarla.
- Rotar la clave de datos queda fuera: obligaría a volver a cifrar la historia. Si hiciera falta, una clave nueva convive con la vieja, porque cada valor nombra la suya.
