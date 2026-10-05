<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\PlatformAdmin;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CurrentOrganization;
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

/**
 * Every platform-operator request must look like it comes from the
 * dashboard: the Referer makes it Sanctum-stateful (session) *and* passes
 * the `admin.origin` pin. Not named `fromSpa` — SanctumSpaAuthTest declares
 * that one globally.
 */
function fromDashboard(): TestCase
{
    /** @var TestCase $test */
    $test = test();

    return $test->withHeader('Referer', 'http://localhost:5175');
}

/**
 * Points the test's default Referer back at the panel, for a clinic request
 * that follows an operator one in the same test: the clinic routes reject
 * the dashboard origin (`clinic.origin`, ADR 0010).
 */
function fromPanel(): TestCase
{
    /** @var TestCase $test */
    $test = test();

    return $test->withHeader('Referer', 'http://localhost:5174');
}

/**
 * `actingAs($admin, 'admin')` also switches the default guard to `admin`.
 */
function actingAsAdmin(?PlatformAdmin $admin = null): TestCase
{
    return fromDashboard()->actingAs($admin ?? PlatformAdmin::factory()->create(), 'admin');
}

/**
 * What a fresh production request starts from, between chained requests of
 * one test: no cached guard users, `web` as the default guard (an earlier
 * `auth:admin` or `actingAs(..., 'admin')` switched it), and no tenant left
 * in the CurrentOrganization singleton by an earlier clinic request. The
 * session store itself is kept, like a browser cookie would keep it.
 */
function freshRequestState(): void
{
    app('auth')->shouldUse('web');
    app('auth')->forgetGuards();
    app(CurrentOrganization::class)->set(null);
}

/**
 * Fills the `{organization}`, `{user}` and `{subscription}` placeholders of
 * an admin route template (tests/Datasets/AdminRoutes.php) with real ids.
 */
function adminRouteUri(string $template): string
{
    $organization = Organization::factory()->create();
    $subscription = Subscription::factory()->create(['organization_id' => $organization->id]);
    $user = User::factory()->create();

    return str_replace(
        ['{organization}', '{user}', '{subscription}'],
        [(string) $organization->id, (string) $user->id, (string) $subscription->id],
        $template,
    );
}
