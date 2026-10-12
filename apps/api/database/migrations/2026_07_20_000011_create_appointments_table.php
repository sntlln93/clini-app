<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('origin')->default('manual');
            $table->string('status')->default('scheduled');
            $table->dateTimeTz('start_at');
            $table->dateTimeTz('end_at');
            $table->string('reason')->nullable();
            $table->dateTimeTz('confirmed_at')->nullable();
            $table->dateTimeTz('arrived_at')->nullable();
            $table->dateTimeTz('completed_at')->nullable();
            $table->dateTimeTz('cancelled_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancellation_reason')->nullable();
            $table->foreignId('rescheduled_from_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['membership_id', 'start_at']);

            $table->unique(['id', 'organization_id']);
            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
        });

        DB::statement('ALTER TABLE appointments ADD CONSTRAINT appointments_rescheduled_from_organization_foreign
            FOREIGN KEY (rescheduled_from_id, organization_id) REFERENCES appointments (id, organization_id)
            ON DELETE SET NULL (rescheduled_from_id)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
