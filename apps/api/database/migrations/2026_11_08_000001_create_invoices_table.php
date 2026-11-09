<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One electronic invoice per approved subscription charge (#246, ADR 0039).
     * The row is written with the charge, as `pending`, and the job that asks
     * ARCA for its CAE fills the voucher: the number it reserves before asking,
     * then the CAE. A charge is invoiced once whatever the webhooks repeat: the
     * row is unique by the provider's payment id. A voucher number is never
     * used twice in an environment, point of sale and type.
     *
     * Organizations are only soft-deleted, and an invoice is a fiscal record:
     * its organization can't be deleted from under it.
     */
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider');
            $table->string('provider_payment_id');
            // InvoiceStatus: pending until ARCA authorizes it.
            $table->string('status');
            // What was charged, in cents of `currency`.
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 3);
            $table->dateTimeTz('charged_at');
            // Calendar dates in Argentina (the voucher's own dates).
            $table->date('service_from');
            $table->date('service_to');
            $table->string('description');
            // The annual discount an annual charge got, printed as a note under
            // its line; null when monthly, or when the charge doesn't match
            // the discounted price (the discount can't be told apart then).
            $table->unsignedTinyInteger('annual_discount_percent')->nullable();
            // The year at list price (twelve undiscounted months, in cents),
            // so the PDF can say how much the discount saved (#431). Set with
            // the discount, under the same condition; bigint like the amount.
            $table->unsignedBigInteger('annual_list_amount_cents')->nullable();
            // InvoiceEnvironment, InvoiceVoucherType and the issuer, as they
            // were when the number was reserved.
            $table->string('environment')->nullable();
            $table->string('issuer_cuit')->nullable();
            $table->unsignedInteger('point_of_sale')->nullable();
            $table->unsignedSmallInteger('voucher_type')->nullable();
            $table->unsignedBigInteger('number')->nullable();
            $table->date('issued_on')->nullable();
            $table->date('payment_due_on')->nullable();
            $table->string('cae')->nullable();
            $table->date('cae_expires_on')->nullable();
            $table->dateTimeTz('issued_at')->nullable();
            // The issuer's fiscal data printed on the voucher, copied when issued.
            $table->json('issuer')->nullable();
            $table->timestampsTz();

            $table->unique(['provider', 'provider_payment_id']);
            $table->unique(['environment', 'issuer_cuit', 'point_of_sale', 'voucher_type', 'number']);
            $table->index(['organization_id', 'charged_at']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
