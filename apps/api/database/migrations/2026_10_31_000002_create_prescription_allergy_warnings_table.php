<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The allergy warning a professional confirmed with «Indicar igual» when indicating medication (#362, ADR 0030): one
 * row per current allergy whose substance appeared in the medication, on the version it warned about and the access
 * log row of the confirmation. It keeps which version of the allergy was matched and whether its detail was shown,
 * and is as append-only as the history it belongs to (ADR 0019).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('prescription_allergy_warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_version_id')->constrained()->restrictOnDelete();
            $table->foreignId('clinical_access_log_id')->constrained()->restrictOnDelete();
            $table->foreignId('medical_history_entry_id')->constrained()->restrictOnDelete();
            $table->foreignId('medical_history_entry_version_id')->constrained()->restrictOnDelete();
            // False when the allergy was another author's the professional can't read (#364): the warning said there
            // was one, not which.
            $table->boolean('detail_shown');
            $table->dateTimeTz('created_at');

            $table->unique(['prescription_version_id', 'medical_history_entry_id']);
        });

        // reject_clinical_record_change() comes from the append-only
        // migration, purge exception included.
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER prescription_allergy_warnings_append_only
                BEFORE UPDATE OR DELETE ON prescription_allergy_warnings
                FOR EACH ROW EXECUTE FUNCTION reject_clinical_record_change();
            CREATE TRIGGER prescription_allergy_warnings_no_truncate
                BEFORE TRUNCATE ON prescription_allergy_warnings
                FOR EACH STATEMENT EXECUTE FUNCTION reject_clinical_record_change();
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS prescription_allergy_warnings_append_only ON prescription_allergy_warnings; DROP TRIGGER IF EXISTS prescription_allergy_warnings_no_truncate ON prescription_allergy_warnings;');

        Schema::dropIfExists('prescription_allergy_warnings');
    }
};
