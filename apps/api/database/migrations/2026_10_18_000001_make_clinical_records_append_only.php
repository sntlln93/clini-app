<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Clinical notes and indicated medication become append-only (#323, ADR
 * 0019): a correction is a new version, a note is annulled instead of
 * deleted, and a trigger rejects every UPDATE, DELETE or TRUNCATE on these
 * tables. Existing rows become version 1, and soft-deleted notes are
 * restored as annulled, so nothing written before is lost.
 */
return new class extends Migration
{
    /**
     * Restored soft-deleted notes carry this as their annulment reason.
     */
    public const string LEGACY_DELETION_REASON = 'Borrada antes de que las notas clínicas fueran inmutables.';

    /**
     * Every table of the clinical history, guarded by the trigger.
     */
    private const array GUARDED_TABLES = [
        'clinical_notes',
        'clinical_note_versions',
        'clinical_note_annulments',
        'prescriptions',
        'prescription_versions',
        'prescription_items',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clinical_note_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinical_note_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('version');
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->text('body');
            $table->string('reason', 500)->nullable();
            $table->dateTimeTz('created_at');

            $table->unique(['clinical_note_id', 'version']);
        });

        Schema::create('clinical_note_annulments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinical_note_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('reason', 500);
            $table->dateTimeTz('created_at');
        });

        // The current body was last written at updated_at, so that is when
        // version 1 says it was written; the note keeps its created_at. A
        // soft delete overwrote updated_at with the deletion time, so a
        // deleted note's version 1 falls back to its created_at.
        DB::statement(<<<'SQL'
            INSERT INTO clinical_note_versions (clinical_note_id, version, membership_id, body, reason, created_at)
            SELECT id, 1, membership_id, body, NULL,
                CASE WHEN deleted_at IS NOT NULL THEN created_at ELSE COALESCE(updated_at, created_at) END
            FROM clinical_notes
            SQL);

        // Only the author could delete a note, so the author annulled it.
        DB::statement(<<<'SQL'
            INSERT INTO clinical_note_annulments (clinical_note_id, membership_id, reason, created_at)
            SELECT id, membership_id, ?, deleted_at
            FROM clinical_notes
            WHERE deleted_at IS NOT NULL
            SQL, [self::LEGACY_DELETION_REASON]);

        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->dropColumn(['body', 'updated_at', 'deleted_at']);
        });

        Schema::create('prescription_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('version');
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('reason', 500)->nullable();
            $table->dateTimeTz('created_at');

            $table->unique(['prescription_id', 'version']);
        });

        DB::statement(<<<'SQL'
            INSERT INTO prescription_versions (prescription_id, version, membership_id, reason, created_at)
            SELECT id, 1, membership_id, NULL, COALESCE(updated_at, created_at)
            FROM prescriptions
            SQL);

        Schema::table('prescription_items', function (Blueprint $table) {
            $table->foreignId('prescription_version_id')->nullable()->after('id')
                ->constrained()->restrictOnDelete();
        });

        DB::statement(<<<'SQL'
            UPDATE prescription_items
            SET prescription_version_id = prescription_versions.id
            FROM prescription_versions
            WHERE prescription_versions.prescription_id = prescription_items.prescription_id
            SQL);

        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropUnique(['prescription_id', 'position']);
            $table->dropConstrainedForeignId('prescription_id');
            $table->dropColumn('updated_at');
            $table->unique(['prescription_version_id', 'position']);
        });

        DB::statement('ALTER TABLE prescription_items ALTER COLUMN prescription_version_id SET NOT NULL');

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dropColumn('updated_at');
        });

        // The only way past the guard is the transaction-local setting the
        // fixture seeder uses to clear its own organizations (ADR 0019).
        // `OR REPLACE`: migrate:fresh drops tables, not functions.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION reject_clinical_record_change() RETURNS trigger AS $$
            BEGIN
                IF TG_OP = 'DELETE' AND current_setting('clini.clinical_records_purge', true) = 'on' THEN
                    RETURN OLD;
                END IF;

                RAISE EXCEPTION 'The clinical history is append-only: % on % is not allowed.', TG_OP, TG_TABLE_NAME;
            END;
            $$ LANGUAGE plpgsql;
            SQL);

        // The records' (appointment_id, patient_id) keys already refuse it,
        // but by naming a constraint; this says why (#360).
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

            CREATE TRIGGER appointments_clinical_patient_frozen
                BEFORE UPDATE OF patient_id ON appointments
                FOR EACH ROW WHEN (OLD.patient_id IS DISTINCT FROM NEW.patient_id)
                EXECUTE FUNCTION reject_clinical_appointment_patient_change();
            SQL);

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
    }

    /**
     * Reverse the migrations. Only the latest version of each record
     * survives a rollback, and annulled notes come back soft-deleted.
     */
    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS appointments_clinical_patient_frozen ON appointments; DROP FUNCTION IF EXISTS reject_clinical_appointment_patient_change();');

        foreach (self::GUARDED_TABLES as $table) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$table}_append_only ON {$table}; DROP TRIGGER IF EXISTS {$table}_no_truncate ON {$table};");
        }

        DB::unprepared('DROP FUNCTION IF EXISTS reject_clinical_record_change()');

        Schema::table('prescriptions', function (Blueprint $table) {
            $table->dateTimeTz('updated_at')->nullable();
        });

        Schema::table('prescription_items', function (Blueprint $table) {
            $table->foreignId('prescription_id')->nullable()->after('id');
            $table->dateTimeTz('updated_at')->nullable();
        });

        // Items of a superseded version have no place in the old schema.
        DB::statement(<<<'SQL'
            DELETE FROM prescription_items
            USING prescription_versions
            WHERE prescription_versions.id = prescription_items.prescription_version_id
              AND prescription_versions.version < (
                  SELECT MAX(latest.version) FROM prescription_versions AS latest
                  WHERE latest.prescription_id = prescription_versions.prescription_id
              )
            SQL);

        DB::statement(<<<'SQL'
            UPDATE prescription_items
            SET prescription_id = prescription_versions.prescription_id, updated_at = prescription_versions.created_at
            FROM prescription_versions
            WHERE prescription_versions.id = prescription_items.prescription_version_id
            SQL);

        DB::statement(<<<'SQL'
            UPDATE prescriptions
            SET updated_at = latest.created_at
            FROM (
                SELECT prescription_id, MAX(created_at) AS created_at
                FROM prescription_versions
                GROUP BY prescription_id
            ) AS latest
            WHERE latest.prescription_id = prescriptions.id
            SQL);

        Schema::table('prescription_items', function (Blueprint $table) {
            $table->dropUnique(['prescription_version_id', 'position']);
            $table->dropConstrainedForeignId('prescription_version_id');
            $table->foreign('prescription_id')->references('id')->on('prescriptions')->cascadeOnDelete();
            $table->unique(['prescription_id', 'position']);
        });

        DB::statement('ALTER TABLE prescription_items ALTER COLUMN prescription_id SET NOT NULL');

        Schema::drop('prescription_versions');

        Schema::table('clinical_notes', function (Blueprint $table) {
            $table->text('body')->nullable();
            $table->dateTimeTz('updated_at')->nullable();
            $table->softDeletesTz();
        });

        DB::statement(<<<'SQL'
            UPDATE clinical_notes
            SET body = latest.body, updated_at = latest.created_at
            FROM (
                SELECT DISTINCT ON (clinical_note_id) clinical_note_id, body, created_at
                FROM clinical_note_versions
                ORDER BY clinical_note_id, version DESC
            ) AS latest
            WHERE latest.clinical_note_id = clinical_notes.id
            SQL);

        DB::statement(<<<'SQL'
            UPDATE clinical_notes
            SET deleted_at = clinical_note_annulments.created_at
            FROM clinical_note_annulments
            WHERE clinical_note_annulments.clinical_note_id = clinical_notes.id
            SQL);

        DB::statement('ALTER TABLE clinical_notes ALTER COLUMN body SET NOT NULL');

        Schema::drop('clinical_note_annulments');
        Schema::drop('clinical_note_versions');
    }
};
