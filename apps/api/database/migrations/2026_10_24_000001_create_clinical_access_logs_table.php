<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The clinical access log (#325, ADR 0022): every read of a patient's notes
 * or indicated medication, every write of them, and every exceptional access
 * with its reason. Who (membership), on which patient, what and when, and
 * what it touched. As append-only as the history it records (ADR 0019).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clinical_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->string('action');
            $table->foreignId('appointment_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('clinical_note_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('prescription_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('reason')->nullable();
            $table->string('reason_detail', 500)->nullable();
            $table->dateTimeTz('created_at')->useCurrent();

            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
            $table->index(['organization_id', 'action', 'created_at']);
            $table->index(['membership_id', 'patient_id', 'action', 'created_at']);
        });

        // reject_clinical_record_change() comes from the append-only
        // migration, purge exception included.
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER clinical_access_logs_append_only
                BEFORE UPDATE OR DELETE ON clinical_access_logs
                FOR EACH ROW EXECUTE FUNCTION reject_clinical_record_change();
            CREATE TRIGGER clinical_access_logs_no_truncate
                BEFORE TRUNCATE ON clinical_access_logs
                FOR EACH STATEMENT EXECUTE FUNCTION reject_clinical_record_change();
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS clinical_access_logs_append_only ON clinical_access_logs; DROP TRIGGER IF EXISTS clinical_access_logs_no_truncate ON clinical_access_logs;');

        Schema::dropIfExists('clinical_access_logs');
    }
};
