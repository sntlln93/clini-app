<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceVoucherType;
use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    /**
     * A pending invoice of a monthly charge.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'subscription_id' => Subscription::factory(),
            'organization_id' => fn (array $attributes): int => Subscription::withoutGlobalScope('organization')->findOrFail($attributes['subscription_id'])->organization_id,
            'provider' => Subscription::PROVIDER_MERCADOPAGO,
            'provider_payment_id' => (string) fake()->unique()->numberBetween(1, 9999999),
            'status' => InvoiceStatus::Pending,
            'amount_cents' => 1500000,
            'currency' => 'ARS',
            'charged_at' => '2026-10-03 13:00:00',
            'service_from' => '2026-10-03',
            'service_to' => '2026-11-02',
            'description' => 'Suscripción mensual a Clini, plan Consultorio',
        ];
    }

    /**
     * Authorized by the fake issuer as `$number` of point of sale 1.
     */
    public function issued(int $number = 1): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => InvoiceStatus::Issued,
            'environment' => InvoiceEnvironment::Fake,
            'issuer_cuit' => '20111111112',
            'point_of_sale' => 1,
            'voucher_type' => InvoiceVoucherType::FacturaC,
            'number' => $number,
            'issued_on' => '2026-10-03',
            'payment_due_on' => '2026-10-03',
            'cae' => '9'.str_pad('1', 5, '0', STR_PAD_LEFT).str_pad((string) $number, 8, '0', STR_PAD_LEFT),
            'cae_expires_on' => '2026-10-13',
            'issued_at' => '2026-10-03 13:05:00',
            'issuer' => [
                'cuit' => '20111111112',
                'name' => 'Emisor de prueba',
                'address' => 'Calle Falsa 123, CABA',
                'vat_condition' => 'Responsable Monotributo',
                'gross_income' => '20111111112',
                'activity_start' => '2026-01-01',
            ],
        ]);
    }
}
