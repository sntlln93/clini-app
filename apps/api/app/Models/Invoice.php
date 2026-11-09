<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceVoucherType;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\InvoiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The electronic invoice of one approved subscription charge (#246, ADR 0039).
 *
 * @property array{cuit: string, name: string, address: string, vat_condition: string, gross_income: string, activity_start: string}|null $issuer
 */
#[Fillable(['organization_id', 'subscription_id', 'provider', 'provider_payment_id', 'status', 'amount_cents', 'currency', 'charged_at', 'service_from', 'service_to', 'description', 'annual_discount_percent', 'environment', 'issuer_cuit', 'point_of_sale', 'voucher_type', 'number', 'issued_on', 'payment_due_on', 'cae', 'cae_expires_on', 'issued_at', 'issuer'])]
class Invoice extends Model
{
    /** @use HasFactory<InvoiceFactory> */
    use BelongsToOrganization, HasFactory;

    /**
     * Argentina's zone: the voucher's dates (issue, service period, payment
     * due) are calendar dates there, whatever zone the practice is in.
     */
    public const string FISCAL_TIMEZONE = 'America/Argentina/Buenos_Aires';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => InvoiceStatus::class,
            'amount_cents' => 'integer',
            'charged_at' => 'immutable_datetime',
            'service_from' => 'immutable_date',
            'service_to' => 'immutable_date',
            'annual_discount_percent' => 'integer',
            'environment' => InvoiceEnvironment::class,
            'point_of_sale' => 'integer',
            'voucher_type' => InvoiceVoucherType::class,
            'number' => 'integer',
            'issued_on' => 'immutable_date',
            'payment_due_on' => 'immutable_date',
            'cae_expires_on' => 'immutable_date',
            'issued_at' => 'immutable_datetime',
            'issuer' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Subscription, $this>
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
