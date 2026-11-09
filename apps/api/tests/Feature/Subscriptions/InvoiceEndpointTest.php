<?php

declare(strict_types=1);

use App\Enums\SubscriptionStatus;
use App\Models\Invoice;
use App\Models\Membership;
use App\Models\Subscription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * An owner whose organization's subscription has one issued and one pending invoice.
 *
 * @return array{0: Membership, 1: Invoice, 2: Invoice}
 */
function ownerWithInvoices(SubscriptionStatus $status = SubscriptionStatus::Active): array
{
    $owner = Membership::factory()->owner()->create();
    $subscription = Subscription::factory()->withStatus($status)->create(['organization_id' => $owner->organization_id]);
    $issued = Invoice::factory()->issued(12)->create(['subscription_id' => $subscription->id, 'charged_at' => '2026-09-03 13:00:00']);
    $pending = Invoice::factory()->create(['subscription_id' => $subscription->id, 'charged_at' => '2026-10-03 13:00:00']);

    return [$owner, $issued, $pending];
}

test('the owner reads the subscription\'s invoices, newest charge first, with what each PDF prints', function () {
    [$owner, $issued, $pending] = ownerWithInvoices();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/subscription/invoices')->assertOk();

    $response->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $pending->id)
        ->assertJsonPath('data.0.status', 'pending')
        ->assertJsonPath('data.0.voucher', null)
        ->assertJsonPath('data.1', [
            'id' => $issued->id,
            'status' => 'issued',
            'description' => 'Suscripción mensual a Clini, plan Consultorio',
            'amount_cents' => 1500000,
            'currency' => 'ARS',
            'charged_at' => '2026-09-03T13:00:00+00:00',
            'service_from' => '2026-10-03',
            'service_to' => '2026-11-02',
            'annual_discount_percent' => null,
            'voucher' => [
                'letter' => 'C',
                'type_code' => 11,
                'point_of_sale' => 1,
                'number' => 12,
                'formatted_number' => 'C 00001-00000012',
                'issued_on' => '2026-10-03',
                'payment_due_on' => '2026-10-03',
                'cae' => '90000100000012',
                'cae_expires_on' => '2026-10-13',
                'qr_url' => $response->json('data.1.voucher.qr_url'),
                'fiscally_valid' => false,
                'issuer' => [
                    'cuit' => '20111111112',
                    'name' => 'Emisor de prueba',
                    'address' => 'Calle Falsa 123, CABA',
                    'vat_condition' => 'Responsable Monotributo',
                    'gross_income' => '20111111112',
                    'activity_start' => '2026-01-01',
                ],
            ],
        ]);
});

test('the QR follows RG 4892: ARCA\'s URL with the voucher as base64 JSON, numbers as numbers', function () {
    [$owner] = ownerWithInvoices();

    $url = $this->actingAs($owner->user)->getJson('/api/v1/subscription/invoices')->json('data.1.voucher.qr_url');

    expect($url)->toStartWith('https://www.arca.gob.ar/fe/qr/?p=');
    $json = base64_decode(substr($url, strlen('https://www.arca.gob.ar/fe/qr/?p=')), true);
    expect($json)->toBe('{"ver":1,"fecha":"2026-10-03","cuit":20111111112,"ptoVta":1,"tipoCmp":11,"nroCmp":12,"importe":15000,"moneda":"PES","ctz":1,"tipoDocRec":99,"nroDocRec":0,"tipoCodAut":"E","codAut":90000100000012}');
});

test('an annual invoice says the discount it got', function () {
    [$owner, $issued] = ownerWithInvoices();
    $issued->forceFill(['annual_discount_percent' => 40])->save();

    $this->actingAs($owner->user)->getJson('/api/v1/subscription/invoices')
        ->assertJsonPath('data.1.annual_discount_percent', 40);
});

test('only a voucher from ARCA\'s production services reads as fiscally valid', function () {
    [$owner, $issued] = ownerWithInvoices();
    $issued->forceFill(['environment' => 'production'])->save();

    $this->actingAs($owner->user)->getJson('/api/v1/subscription/invoices')
        ->assertJsonPath('data.1.voucher.fiscally_valid', true);
});

test('an expired or cancelled subscription\'s owner still reads its invoices', function (SubscriptionStatus $status) {
    [$owner] = ownerWithInvoices($status);

    $this->actingAs($owner->user)->getJson('/api/v1/subscription/invoices')
        ->assertOk()
        ->assertJsonCount(2, 'data');
})->with([SubscriptionStatus::Expired, SubscriptionStatus::Cancelled]);

test('an organization that never subscribed has no invoices', function () {
    $owner = Membership::factory()->owner()->create();

    $this->actingAs($owner->user)->getJson('/api/v1/subscription/invoices')
        ->assertOk()
        ->assertExactJson(['data' => []]);
});

test('only the owner reads them: an admin, a professional or staff is refused', function (string $role) {
    [$owner] = ownerWithInvoices();
    $member = Membership::factory()->{$role}()->create(['organization_id' => $owner->organization_id]);

    $this->actingAs($member->user)->getJson('/api/v1/subscription/invoices')->assertForbidden();
})->with(['admin', 'professional', 'staff']);

test('an owner never reads another organization\'s invoices', function () {
    ownerWithInvoices();
    $otherOwner = Membership::factory()->owner()->create();

    $this->actingAs($otherOwner->user)->getJson('/api/v1/subscription/invoices')
        ->assertOk()
        ->assertExactJson(['data' => []]);
});

test('a guest is refused', function () {
    $this->getJson('/api/v1/subscription/invoices')->assertUnauthorized();
});
