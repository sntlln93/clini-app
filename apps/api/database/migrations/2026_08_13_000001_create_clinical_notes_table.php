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
        Schema::create('clinical_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id');
            $table->foreignId('membership_id');
            $table->text('body');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['appointment_id', 'membership_id']);

            $table->unique(['id', 'organization_id']);
            $table->foreign(['appointment_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('appointments')->restrictOnDelete();
            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_notes');
    }
};
