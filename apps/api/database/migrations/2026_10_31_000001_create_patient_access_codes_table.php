<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The code a patient shares with whoever attends them so they read what other professionals wrote (#364, ADR 0029).
     * One per appointment, redeemable once and only by that appointment's professional, until the appointment's window
     * ends; the redeemed row is the access it grants. The code itself is stored encrypted, since the patient's
     * appointment page shows it again.
     */
    public function up(): void
    {
        Schema::create('patient_access_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id')->unique();
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->text('code');
            $table->dateTimeTz('expires_at');
            $table->dateTimeTz('redeemed_at')->nullable();
            $table->dateTimeTz('created_at')->useCurrent();

            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
            // A code is about its appointment's patient and professional (#360).
            $table->foreign(['appointment_id', 'patient_id'])
                ->references(['id', 'patient_id'])->on('appointments')->restrictOnDelete();
            $table->index(['patient_id', 'membership_id', 'expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_access_codes');
    }
};
