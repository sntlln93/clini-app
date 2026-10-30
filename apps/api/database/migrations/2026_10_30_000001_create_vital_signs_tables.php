<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Measurements of the clinical history (#361): weight, height and the rest,
 * taken during one appointment. Append-only like the notes (ADR 0019): the
 * values live in its versions, a correction adds one, and an annulment takes
 * a measurement out of the series without erasing it.
 */
return new class extends Migration
{
    private const array GUARDED_TABLES = ['vital_signs', 'vital_sign_versions', 'vital_sign_annulments'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->restrictOnDelete();
            $table->foreignId('appointment_id');
            $table->foreignId('patient_id')->constrained()->restrictOnDelete();
            $table->foreignId('membership_id');
            $table->dateTimeTz('measured_at');
            $table->dateTimeTz('created_at');

            $table->index(['patient_id', 'organization_id', 'measured_at']);

            $table->foreign(['appointment_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('appointments')->restrictOnDelete();
            // Always the appointment's patient (#360).
            $table->foreign(['appointment_id', 'patient_id'])
                ->references(['id', 'patient_id'])->on('appointments')->restrictOnDelete();
            $table->foreign(['membership_id', 'organization_id'])
                ->references(['id', 'organization_id'])->on('memberships')->restrictOnDelete();
        });

        Schema::create('vital_sign_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vital_sign_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('version');
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('reason', 500)->nullable();
            $table->decimal('weight_kg', 5, 2)->nullable();
            $table->decimal('height_cm', 4, 1)->nullable();
            $table->decimal('head_circumference_cm', 4, 1)->nullable();
            $table->decimal('waist_circumference_cm', 4, 1)->nullable();
            $table->unsignedSmallInteger('systolic_mmhg')->nullable();
            $table->unsignedSmallInteger('diastolic_mmhg')->nullable();
            $table->unsignedSmallInteger('capillary_glucose_mg_dl')->nullable();
            $table->unsignedSmallInteger('heart_rate_bpm')->nullable();
            $table->unsignedSmallInteger('respiratory_rate_rpm')->nullable();
            $table->decimal('temperature_c', 3, 1)->nullable();
            $table->unsignedSmallInteger('oxygen_saturation_pct')->nullable();
            $table->dateTimeTz('created_at');

            $table->unique(['vital_sign_id', 'version']);
        });

        Schema::create('vital_sign_annulments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vital_sign_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('membership_id')->constrained()->restrictOnDelete();
            $table->string('reason', 500);
            $table->dateTimeTz('created_at');
        });

        Schema::table('clinical_access_logs', function (Blueprint $table) {
            $table->foreignId('vital_sign_id')->nullable()->after('prescription_id')->constrained()->restrictOnDelete();
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinical_access_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vital_sign_id');
        });

        foreach (self::GUARDED_TABLES as $table) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$table}_append_only ON {$table}; DROP TRIGGER IF EXISTS {$table}_no_truncate ON {$table};");
        }

        Schema::dropIfExists('vital_sign_annulments');
        Schema::dropIfExists('vital_sign_versions');
        Schema::dropIfExists('vital_signs');
    }
};
