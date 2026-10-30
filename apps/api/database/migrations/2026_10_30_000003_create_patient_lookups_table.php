<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only record of every search of a patient by document from a practice (#365): who searched, from where, and
     * which patient it found. The document searched is never stored, so a miss leaves no trace of whose it was.
     */
    public function up(): void
    {
        Schema::create('patient_lookups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained()->restrictOnDelete();
            $table->dateTimeTz('created_at')->useCurrent();

            $table->index(['membership_id', 'created_at']);
            $table->index(['patient_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_lookups');
    }
};
