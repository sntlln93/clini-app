<?php

declare(strict_types=1);

/*
 * Practice (Consultorio) pricing, in whole pesos (#237): the base amount
 * covers `included_professionals` active professionals, and each one past
 * them adds `extra_professional_amount` per month. Paying the whole year
 * takes `annual_discount_percent` off that monthly price (#240). Free has no
 * price and Center is billed outside the platform.
 *
 * Free's monthly appointment limit and the count that warns the owners
 * (#238, #300): 0 means no limit, which is also the default. A threshold of
 * 0, or not below the limit, sends no warning.
 */
return [
    'free' => [
        'monthly_appointment_limit' => (int) env('PLAN_FREE_MONTHLY_APPOINTMENT_LIMIT', 0),
        'appointment_warning_threshold' => (int) env('PLAN_FREE_APPOINTMENT_WARNING_THRESHOLD', 0),
    ],
    'practice' => [
        'base_amount' => (int) env('MERCADOPAGO_PLAN_AMOUNT', 0),
        'included_professionals' => (int) env('PLAN_PRACTICE_INCLUDED_PROFESSIONALS', 5),
        'extra_professional_amount' => (int) env('PLAN_PRACTICE_EXTRA_PROFESSIONAL_AMOUNT', 0),
        'annual_discount_percent' => (int) env('PLAN_PRACTICE_ANNUAL_DISCOUNT_PERCENT', 40),
        'currency' => env('MERCADOPAGO_PLAN_CURRENCY', 'ARS'),
    ],
];
