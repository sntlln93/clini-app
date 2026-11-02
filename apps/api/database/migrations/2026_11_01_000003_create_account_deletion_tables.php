<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A clinic user's own account deletion (#384, ADR 0034). The request keeps which memberships it deactivated, and in
     * which status they were, so a login within the grace period puts back exactly those. `account_deletions` is the
     * append-only trace of each completed one: the user's id and the date, never a personal datum.
     */
    public function up(): void
    {
        Schema::create('account_deletion_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('status');
            $table->dateTimeTz('deletes_at');
            $table->dateTimeTz('resolved_at')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'deletes_at']);
        });

        // One pending request per user.
        DB::statement("CREATE UNIQUE INDEX account_deletion_requests_one_pending ON account_deletion_requests (user_id) WHERE status = 'pending'");

        Schema::create('account_deletion_request_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_deletion_request_id')
                ->constrained('account_deletion_requests', 'id', 'account_deletion_request_memberships_request_fk')
                ->cascadeOnDelete();
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('previous_status');

            $table->unique(['account_deletion_request_id', 'membership_id'], 'account_deletion_request_memberships_unique');
        });

        Schema::create('account_deletions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->dateTimeTz('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_deletions');
        Schema::dropIfExists('account_deletion_request_memberships');
        Schema::dropIfExists('account_deletion_requests');
    }
};
