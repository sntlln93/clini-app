<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A patient's emails, phones and WhatsApp numbers (#365), shared on the platform like the rest of their personal data.
     * `value` is normalized (E.164 for phone and WhatsApp, lowercase for email), so one number typed two ways is one row.
     * `needs_confirmation` marks a contact an anonymous online booking added to an existing patient: no reminder goes to it
     * until someone at a practice keeps it in the patient's form.
     */
    public function up(): void
    {
        Schema::create('patient_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('value');
            $table->string('label', 50)->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->boolean('needs_confirmation')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->unique(['patient_id', 'type', 'value']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_contacts');
    }
};
