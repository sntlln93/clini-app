<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'holidays' => [
        'url' => env('HOLIDAYS_API_URL', 'https://calendariosnacionales.com'),
    ],

    // The Ministry of Health's Buscador Nacional de Medicamentos, which fills the medication catalog on demand (#377,
    // ADR 0031). Off unless turned on, so tests, CI and e2e never reach it.
    'national_medication_search' => [
        'enabled' => (bool) env('NATIONAL_MEDICATION_SEARCH_ENABLED', false),
        'url' => env('NATIONAL_MEDICATION_SEARCH_URL', 'https://cnpm.msal.gov.ar'),
        'user_agent' => env('NATIONAL_MEDICATION_SEARCH_USER_AGENT', 'Clini/1.0 (catalogo de medicamentos; +'.env('APP_URL', 'http://localhost').')'),
    ],

    // The Ministry of Health's Buscador Nacional de Profesionales de la Salud, which checks professionals' licenses
    // (#380, ADR 0032). Off unless turned on, so tests, CI and e2e never reach it.
    'national_professional_search' => [
        'enabled' => (bool) env('NATIONAL_PROFESSIONAL_SEARCH_ENABLED', false),
        'url' => env('NATIONAL_PROFESSIONAL_SEARCH_URL', 'https://www.argentina.gob.ar/salud/buscador-nacional-de-profesionales-de-la-salud'),
        'user_agent' => env('NATIONAL_PROFESSIONAL_SEARCH_USER_AGENT', 'Clini/1.0 (validacion de matriculas; +'.env('APP_URL', 'http://localhost').')'),
        // Professionals the daily reverification looks up at most in one run.
        'per_run' => (int) env('NATIONAL_PROFESSIONAL_SEARCH_PER_RUN', 200),
    ],

    // SaaS subscription billing (#28). See docs/architecture/subscriptions.md.
    'mercadopago' => [
        'access_token' => env('MERCADOPAGO_ACCESS_TOKEN'),
        'public_key' => env('MERCADOPAGO_PUBLIC_KEY'),
        'webhook_secret' => env('MERCADOPAGO_WEBHOOK_SECRET'),
        // The API's public return route, which redirects to the panel.
        'back_url' => env('MERCADOPAGO_BACK_URL', rtrim((string) env('APP_URL', 'http://localhost'), '/').'/api/v1/subscription/return'),
    ],

];
