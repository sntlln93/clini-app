<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A clinical record can be written outside an appointment (#382, ADR 0037): a study result that arrives days later,
 * an allergy the patient reports by phone. Its `appointment_id` is then null, which is the record's «fuera de un
 * turno» mark. The composite keys to `appointments` stay: Postgres checks neither while `appointment_id` is null, and
 * on a record made in an appointment they still keep its patient and organization the appointment's (#360). The
 * patient of a record outside an appointment comes from the route, by a professional who attends them.
 */
return new class extends Migration
{
    private const array TABLES = [
        'clinical_notes',
        'prescriptions',
        'vital_signs',
        'blood_type_records',
        'medical_history_entries',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('appointment_id')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations. Fails while a record outside an appointment exists: the history is append-only, so
     * none is deleted to make room.
     */
    public function down(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('appointment_id')->nullable(false)->change();
            });
        }
    }
};
