<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The patient's background in the clinical history (#361, ADR 0027): the
 * blood type, whose current value is the latest one recorded, and the
 * allergies and personal, family and surgical history, whose entries are
 * amended with a new version or withdrawn once they no longer apply. Each one
 * is recorded during an appointment and is as append-only as the notes (ADR
 * 0019).
 */
return new class extends Migration
{
    private const array GUARDED_TABLES = [
        'blood_type_records',
        'medical_history_entries',
        'medical_history_entry_versions',
        'medical_history_entry_withdrawals',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('blood_type_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id');
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->string('blood_type', 3);
            $table->string('reason', 500)->nullable();
            $table->dateTimeTz('created_at');

            $table->index(['patient_id', 'organization_id', 'created_at']);

            $table->foreign(['appointment_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('appointments')->restrictOnDelete();
            // Always the appointment's patient (#360).
            $table->foreign(['appointment_id', 'patient_id'])
                ->references(['id', 'patient_id'])->on('appointments')->restrictOnDelete();
            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
        });

        Schema::create('medical_history_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id');
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->string('category');
            $table->dateTimeTz('created_at');

            $table->index(['patient_id', 'organization_id', 'category']);

            $table->foreign(['appointment_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('appointments')->restrictOnDelete();
            // Always the appointment's patient (#360).
            $table->foreign(['appointment_id', 'patient_id'])
                ->references(['id', 'patient_id'])->on('appointments')->restrictOnDelete();
            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
        });

        Schema::create('medical_history_entry_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_history_entry_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('version');
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('description', 500);
            $table->string('reaction')->nullable();
            $table->string('severity')->nullable();
            $table->string('approximate_date', 50)->nullable();
            $table->string('reason', 500)->nullable();
            $table->dateTimeTz('created_at');

            $table->unique(['medical_history_entry_id', 'version']);
        });

        Schema::create('medical_history_entry_withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_history_entry_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('reason', 500)->nullable();
            $table->dateTimeTz('created_at');
        });

        Schema::table('clinical_access_logs', function (Blueprint $table) {
            $table->foreignId('blood_type_record_id')->nullable()->after('vital_sign_id')->constrained()->restrictOnDelete();
            $table->foreignId('medical_history_entry_id')->nullable()->after('blood_type_record_id')->constrained()->restrictOnDelete();
        });

        // reject_clinical_record_change() comes from the append-only
        // migration, purge exception included.
        foreach (self::GUARDED_TABLES as $table) {
            DB::unprepared(<<<SQL
                CREATE TRIGGER {$table}_append_only
                    BEFORE UPDATE OR DELETE ON {$table}
                    FOR EACH ROW EXECUTE FUNCTION reject_clinical_record_change();
                CREATE TRIGGER {$table}_no_truncate
                    BEFORE TRUNCATE ON {$table}
                    FOR EACH STATEMENT EXECUTE FUNCTION reject_clinical_record_change();
                SQL);
        }

        // An appointment with any clinical record keeps its patient (#360),
        // the measurements and the background included.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION reject_clinical_appointment_patient_change() RETURNS trigger AS $$
            BEGIN
                IF EXISTS (SELECT 1 FROM clinical_notes WHERE appointment_id = OLD.id)
                    OR EXISTS (SELECT 1 FROM prescriptions WHERE appointment_id = OLD.id)
                    OR EXISTS (SELECT 1 FROM vital_signs WHERE appointment_id = OLD.id)
                    OR EXISTS (SELECT 1 FROM blood_type_records WHERE appointment_id = OLD.id)
                    OR EXISTS (SELECT 1 FROM medical_history_entries WHERE appointment_id = OLD.id) THEN
                    RAISE EXCEPTION 'An appointment with clinical records keeps its patient: appointment % has clinical records.', OLD.id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION reject_clinical_appointment_patient_change() RETURNS trigger AS $$
            BEGIN
                IF EXISTS (SELECT 1 FROM clinical_notes WHERE appointment_id = OLD.id)
                    OR EXISTS (SELECT 1 FROM prescriptions WHERE appointment_id = OLD.id) THEN
                    RAISE EXCEPTION 'An appointment with clinical records keeps its patient: appointment % has notes or indicated medication.', OLD.id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            SQL);

        Schema::table('clinical_access_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('medical_history_entry_id');
            $table->dropConstrainedForeignId('blood_type_record_id');
        });

        foreach (self::GUARDED_TABLES as $table) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$table}_append_only ON {$table}; DROP TRIGGER IF EXISTS {$table}_no_truncate ON {$table};");
        }

        Schema::dropIfExists('medical_history_entry_withdrawals');
        Schema::dropIfExists('medical_history_entry_versions');
        Schema::dropIfExists('medical_history_entries');
        Schema::dropIfExists('blood_type_records');
    }
};
