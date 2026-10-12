<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `subscriptions` holds one SaaS subscription per organization; one
     * with no row is on the Free plan (#237). `subscription_events` logs every verified provider webhook
     * notification by its own id, so a redelivered notification is a no-op.
     */
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('provider');
            $table->string('provider_subscription_id')->nullable()->unique();
            $table->string('status');
            $table->dateTimeTz('grace_ends_at')->nullable();
            $table->string('grace_reason')->nullable();
            $table->dateTimeTz('last_payment_at')->nullable();
            $table->dateTimeTz('last_payment_failed_at')->nullable();
            // The provider's next scheduled charge, shown as the renewal date.
            $table->dateTimeTz('next_payment_at')->nullable();
            // When the subscription was cancelled; null unless status = cancelled.
            $table->dateTimeTz('cancelled_at')->nullable();
            // End of the period already paid when an active subscription was
            // cancelled: it keeps write access until then.
            $table->dateTimeTz('access_ends_at')->nullable();
            // Monthly amount last set at the provider, in whole pesos.
            $table->unsignedInteger('amount')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'grace_ends_at']);
        });

        Schema::create('subscription_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider');
            $table->string('notification_id');
            $table->string('type')->nullable();
            $table->string('resource_id')->nullable();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->json('payload');
            $table->timestampsTz();

            $table->unique(['provider', 'notification_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_events');
        Schema::dropIfExists('subscriptions');
    }
};
