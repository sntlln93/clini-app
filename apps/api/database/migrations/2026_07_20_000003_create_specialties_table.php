<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The professions and specialties the national professional registry answers (#387, ADR 0038): Clini is the only
     * owner of this catalog, and only a registry answer adds to it. A row is a specialty of a profession, written as the
     * registry writes it, or the profession itself when the registry answers it without a specialty. Nothing deletes a
     * row: licenses and practices point at it.
     */
    public function up(): void
    {
        Schema::create('specialties', function (Blueprint $table) {
            $table->id();
            $table->string('profession');
            $table->string('name');
            // `App\Support\FoldedText::fold($name)`: one row per profession and name, whatever its case or accents.
            $table->string('folded_name');
            $table->timestampsTz();

            $table->unique(['profession', 'folded_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('specialties');
    }
};
