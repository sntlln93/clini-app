<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every export of the clinical history leaves a row here (#326, ADR 0021):
 * who took it out, of which patient (null for every patient the membership
 * attended), in what format and when. It is as append-only as the history
 * it records (ADR 0019), and stays apart from the access log (#325, ADR 0022).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clinical_record_exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->foreignId('patient_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('scope');
            $table->string('format');
            $table->dateTimeTz('created_at')->useCurrent();

            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
            $table->index(['organization_id', 'created_at']);
        });

        // reject_clinical_record_change() comes from the append-only
        // migration, purge exception included.
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER clinical_record_exports_append_only
                BEFORE UPDATE OR DELETE ON clinical_record_exports
                FOR EACH ROW EXECUTE FUNCTION reject_clinical_record_change();
            CREATE TRIGGER clinical_record_exports_no_truncate
                BEFORE TRUNCATE ON clinical_record_exports
                FOR EACH STATEMENT EXECUTE FUNCTION reject_clinical_record_change();
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS clinical_record_exports_append_only ON clinical_record_exports; DROP TRIGGER IF EXISTS clinical_record_exports_no_truncate ON clinical_record_exports;');

        Schema::dropIfExists('clinical_record_exports');
    }
};
