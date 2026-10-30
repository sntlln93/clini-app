<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An item picked from the medication catalog (#377) keeps its GTIN and the substances of its active ingredients as
 * they were then, copied like an ICD-10 diagnosis (ADR 0020): a later change in the catalog never rewrites the history.
 * Free-text items keep both empty.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->string('gtin', 14)->nullable()->after('quantity');
            $table->jsonb('substances')->nullable()->after('gtin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropColumn(['gtin', 'substances']);
        });
    }
};
