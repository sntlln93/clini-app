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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('document_type')->default('dni');
            $table->string('document_number');
            $table->string('sex')->nullable();
            $table->date('birth_date')->nullable();
            $table->foreignId('insurance_provider_id')->nullable()->constrained()->nullOnDelete();
            $table->string('insurance_member_number', 50)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->unique(['document_type', 'document_number']);
        });

        // A member number belongs to one person per provider, whatever separators or letter case it was typed with (#290).
        DB::statement("CREATE UNIQUE INDEX patients_insurance_member_number_unique ON patients (insurance_provider_id, upper(regexp_replace(insurance_member_number, '[^[:alnum:]]', '', 'g')))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
