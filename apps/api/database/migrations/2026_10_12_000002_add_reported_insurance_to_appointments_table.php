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
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('reported_insurance_provider_id')->nullable()->after('notes')->constrained('insurance_providers')->nullOnDelete();
            $table->string('reported_insurance_member_number', 50)->nullable()->after('reported_insurance_provider_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reported_insurance_provider_id');
            $table->dropColumn('reported_insurance_member_number');
        });
    }
};
