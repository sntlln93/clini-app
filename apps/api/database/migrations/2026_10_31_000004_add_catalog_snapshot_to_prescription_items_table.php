<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An item picked from the medication catalog (#377) keeps what the catalog said of its product then, copied like an
 * ICD-10 diagnosis (ADR 0020): its GTIN and SNOMED code, the substances of its drug text and whether the source cut
 * that text short, its dispensing condition and its control mark. A later change in the catalog never rewrites the
 * history. Free-text items keep them all empty.
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
            $table->string('snomed', 20)->nullable()->after('gtin');
            $table->jsonb('substances')->nullable()->after('snomed');
            $table->string('dispensing_condition')->nullable()->after('substances');
            $table->string('control_mark')->nullable()->after('dispensing_condition');
            // Whether the source cut the drug text short («+asoc.»): the substances above then miss some.
            $table->boolean('composition_incomplete')->nullable()->after('control_mark');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropColumn(['gtin', 'snomed', 'substances', 'dispensing_condition', 'control_mark', 'composition_incomplete']);
        });
    }
};
