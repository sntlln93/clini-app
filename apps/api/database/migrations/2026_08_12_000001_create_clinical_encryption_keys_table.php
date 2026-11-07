<?php

declare(strict_types=1);

use App\Support\ClinicalEncryption;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The data key of the clinical history's envelope encryption (#391, ADR 0036), encrypted with the master key
 * (`CLINICAL_ENCRYPTION_KEY`). Created here, once, so no request ever races another to create it; migrating without
 * the master key fails instead of writing the history in clear.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clinical_encryption_keys', function (Blueprint $table) {
            $table->id();
            $table->text('wrapped_key');
            $table->timestampsTz();
        });

        app(ClinicalEncryption::class)->createDataKey();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_encryption_keys');
    }
};
