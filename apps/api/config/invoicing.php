<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Electronic invoices of the subscription (#246, ADR 0039)
|--------------------------------------------------------------------------
|
| One invoice per approved subscription charge, authorized by ARCA through its
| web services (WSAA + WSFEv1). `issuer` picks the adapter: `arca`, or `fake`
| (dev, CI and e2e: it authorizes with a made-up CAE and never leaves Clini),
| which production refuses. `arca.environment` points the `arca` adapter at
| ARCA's homologation or production services; the certificate, its key, the
| CUIT and the point of sale must belong to that same environment.
|
| The issuer's fiscal data (`issuer.*`) is what the voucher prints, and is
| copied onto each invoice when it is issued. The voucher type is a rule, not
| a free choice: a monotributista issues factura C (11), whoever the customer.
|
*/

return [
    'issuer' => env('INVOICE_ISSUER', 'arca'),

    'voucher_type' => (int) env('INVOICE_VOUCHER_TYPE', 11),

    'point_of_sale' => (int) env('INVOICE_POINT_OF_SALE', 0),

    'issuer_data' => [
        'cuit' => env('INVOICE_ISSUER_CUIT', ''),
        'name' => env('INVOICE_ISSUER_NAME', ''),
        'address' => env('INVOICE_ISSUER_ADDRESS', ''),
        'vat_condition' => env('INVOICE_ISSUER_VAT_CONDITION', 'Responsable Monotributo'),
        'gross_income' => env('INVOICE_ISSUER_GROSS_INCOME', ''),
        'activity_start' => env('INVOICE_ISSUER_ACTIVITY_START', ''),
    ],

    'arca' => [
        'environment' => env('ARCA_ENVIRONMENT', 'homologation'),
        // Base64 of the PEM files, so they fit in one env var line each.
        'certificate' => env('ARCA_CERTIFICATE', ''),
        'private_key' => env('ARCA_PRIVATE_KEY', ''),
    ],
];
