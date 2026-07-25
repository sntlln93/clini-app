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
        Schema::create('professional_specialties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->foreignId('specialty_id');

            $table->unique(['membership_id', 'specialty_id']);

            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->cascadeOnDelete();
            $table->foreign(['specialty_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('specialties')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('professional_specialties');
    }
};
