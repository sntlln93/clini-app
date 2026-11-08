<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceVoucherType;
use App\Models\Invoice;
use App\Models\Organization;
use App\Models\Subscription;
use App\Services\Invoicing\FakeInvoiceIssuer;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Invoices of organization B's subscription (#246): two issued by the fake
 * issuer and the latest still pending. Never in production, where a voucher
 * only comes from ARCA (the demo server seeds a production image too).
 */
class InvoicesSeeder extends Seeder
{
    private const string ISSUER_CUIT = '20111111112';

    private const array ISSUER = [
        'cuit' => self::ISSUER_CUIT,
        'name' => 'Emisor de prueba',
        'address' => 'Calle Falsa 123, CABA',
        'vat_condition' => 'Responsable Monotributo',
        'gross_income' => self::ISSUER_CUIT,
        'activity_start' => '2026-01-01',
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        $organization = Organization::query()->where('slug', OrganizationsSeeder::ORGANIZATION_B_SLUG)->firstOrFail();
        $subscription = Subscription::withoutGlobalScope('organization')->where('organization_id', $organization->id)->firstOrFail();

        $this->seedInvoice($subscription, 'seed-payment-1', '2026-08-03', '2026-09-02', 1);
        $this->seedInvoice($subscription, 'seed-payment-2', '2026-09-03', '2026-10-02', 2);
        $this->seedInvoice($subscription, 'seed-payment-3', '2026-10-03', '2026-11-02', null);
    }

    private function seedInvoice(Subscription $subscription, string $paymentId, string $from, string $to, ?int $number): void
    {
        $voucher = $number === null ? ['status' => InvoiceStatus::Pending] : [
            'status' => InvoiceStatus::Issued,
            'environment' => InvoiceEnvironment::Fake,
            'issuer_cuit' => self::ISSUER_CUIT,
            'point_of_sale' => 1,
            'voucher_type' => InvoiceVoucherType::FacturaC,
            'number' => $number,
            'issued_on' => $from,
            'payment_due_on' => $from,
            'cae' => FakeInvoiceIssuer::cae(1, $number),
            'cae_expires_on' => CarbonImmutable::parse($from)->addDays(10)->toDateString(),
            'issued_at' => $from.' 13:05:00',
            'issuer' => self::ISSUER,
        ];

        Invoice::withoutGlobalScope('organization')->firstOrCreate(
            ['provider' => Subscription::PROVIDER_MERCADOPAGO, 'provider_payment_id' => $paymentId],
            [
                'organization_id' => $subscription->organization_id,
                'subscription_id' => $subscription->id,
                'amount_cents' => 1500000,
                'currency' => 'ARS',
                'charged_at' => $from.' 13:00:00',
                'service_from' => $from,
                'service_to' => $to,
                'description' => 'Suscripción mensual a Clini, plan Consultorio',
                ...$voucher,
            ],
        );
    }
}
