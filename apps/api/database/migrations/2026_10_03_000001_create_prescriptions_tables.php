<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id');
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->text('diagnosis')->nullable();
            $table->timestamp('issued_at');
            $table->timestamps();

            $table->index(['appointment_id', 'membership_id']);
            $table->index(['patient_id', 'membership_id']);

            $table->foreign(['appointment_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('appointments')->restrictOnDelete();
            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
        });

        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('medication');
            $table->string('presentation')->nullable();
            $table->string('dosage', 500);
            $table->unsignedInteger('quantity');
            $table->timestamps();

            $table->unique(['prescription_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
        Schema::dropIfExists('prescriptions');
    }
};
