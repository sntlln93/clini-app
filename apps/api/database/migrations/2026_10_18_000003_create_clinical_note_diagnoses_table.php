<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Structured ICD-10 diagnoses for clinical notes (#324, ADR 0020). Each
 * note version keeps its own, copying the code and description it was
 * written with, so a later catalog change never rewrites the history. They
 * are as append-only as the version they belong to (ADR 0019).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clinical_note_diagnoses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinical_note_version_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('position');
            $table->foreignId('icd10_code_id')->constrained()->restrictOnDelete();
            $table->string('code', 10);
            $table->string('description');

            $table->unique(['clinical_note_version_id', 'position']);
            $table->unique(['clinical_note_version_id', 'icd10_code_id']);
        });

        // reject_clinical_record_change() comes from the append-only
        // migration, purge exception included.
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER clinical_note_diagnoses_append_only
                BEFORE UPDATE OR DELETE ON clinical_note_diagnoses
                FOR EACH ROW EXECUTE FUNCTION reject_clinical_record_change();
            CREATE TRIGGER clinical_note_diagnoses_no_truncate
                BEFORE TRUNCATE ON clinical_note_diagnoses
                FOR EACH STATEMENT EXECUTE FUNCTION reject_clinical_record_change();
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS clinical_note_diagnoses_append_only ON clinical_note_diagnoses; DROP TRIGGER IF EXISTS clinical_note_diagnoses_no_truncate ON clinical_note_diagnoses;');

        Schema::dropIfExists('clinical_note_diagnoses');
    }
};
