<?php

declare(strict_types=1);

/*
 * Practice (Consultorio) pricing, in whole pesos (#237): the base amount
 * covers `included_professionals` active professionals, and each one past
 * them adds `extra_professional_amount` per month. Free has no price and
 * Center is billed outside the platform.
 */
return [
    'practice' => [
        'base_amount' => (int) env('MERCADOPAGO_PLAN_AMOUNT', 0),
        'included_professionals' => (int) env('PLAN_PRACTICE_INCLUDED_PROFESSIONALS', 5),
        'extra_professional_amount' => (int) env('PLAN_PRACTICE_EXTRA_PROFESSIONAL_AMOUNT', 0),
        'currency' => env('MERCADOPAGO_PLAN_CURRENCY', 'ARS'),
    ],
];
