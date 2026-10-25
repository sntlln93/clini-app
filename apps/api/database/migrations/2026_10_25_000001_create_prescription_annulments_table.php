<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Annulling indicated medication (#344): it stays in the history with every
 * version, marked as no longer needed or never needed, with its author and a
 * required reason. As append-only as the record it annuls (ADR 0019).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('prescription_annulments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('kind');
            $table->string('reason', 500);
            $table->dateTimeTz('created_at');
        });

        // reject_clinical_record_change() comes from the append-only
        // migration, purge exception included.
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER prescription_annulments_append_only
                BEFORE UPDATE OR DELETE ON prescription_annulments
                FOR EACH ROW EXECUTE FUNCTION reject_clinical_record_change();
            CREATE TRIGGER prescription_annulments_no_truncate
                BEFORE TRUNCATE ON prescription_annulments
                FOR EACH STATEMENT EXECUTE FUNCTION reject_clinical_record_change();
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS prescription_annulments_append_only ON prescription_annulments; DROP TRIGGER IF EXISTS prescription_annulments_no_truncate ON prescription_annulments;');

        Schema::dropIfExists('prescription_annulments');
    }
};
