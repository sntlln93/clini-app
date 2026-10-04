<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

/**
 * Mercado Pago test config (tests/Feature/Subscriptions): sandbox-like
 * values only, never real credentials.
 */
function configureMercadoPago(): void
{
    config([
        'services.mercadopago.access_token' => 'TEST-access-token',
        'services.mercadopago.public_key' => 'TEST-public-key',
        'services.mercadopago.webhook_secret' => 'test-webhook-secret',
        'services.mercadopago.plan_amount' => 15000,
        'services.mercadopago.plan_currency' => 'ARS',
        'services.mercadopago.back_url' => 'https://api.example.com/api/v1/subscription/return',
    ]);
}

/**
 * Builds an `x-signature` header the way Mercado Pago documents it.
 */
function mercadoPagoSignature(string $dataId, string $requestId, string $ts, string $secret = 'test-webhook-secret'): string
{
    $manifest = 'id:'.strtolower($dataId).';request-id:'.$requestId.';ts:'.$ts.';';

    return 'ts='.$ts.',v1='.hash_hmac('sha256', $manifest, $secret);
}
