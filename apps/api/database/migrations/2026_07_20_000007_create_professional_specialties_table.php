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
            $table->foreignId('user_id');
            // One of the specialties the professional's verified licenses back when it is chosen (#387); it stays
            // when that backing goes, and the panel marks it «sin respaldo de matrícula».
            $table->foreignId('specialty_id')->constrained()->restrictOnDelete();

            $table->unique(['membership_id', 'specialty_id']);

            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->cascadeOnDelete();
            $table->foreign(['membership_id', 'user_id'])
                ->references(['id', 'user_id'])->on('memberships')->cascadeOnDelete();
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
