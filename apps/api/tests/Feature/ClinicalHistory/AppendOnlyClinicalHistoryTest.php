<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Prescription;
use App\Support\CurrentOrganization;
use Illuminate\Database\QueryException;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

const APPEND_ONLY_MIGRATION = 'migrations/2026_10_18_000001_make_clinical_records_append_only.php';

/**
 * Runs one statement in its own savepoint, so the error it raises doesn't
 * abort the test's transaction.
 */
function inSavepoint(Closure $statement): Closure
{
    return fn () => DB::transaction($statement);
}

test('no route edits or deletes a clinical note or an indicated-medication record', function () {
    $offenders = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $route): bool => preg_match('#(clinical-notes|prescriptions)#', $route->uri()) === 1)
        ->filter(fn (RoutingRoute $route): bool => array_intersect($route->methods(), ['PUT', 'PATCH', 'DELETE']) !== [])
        ->map(fn (RoutingRoute $route): string => implode('|', $route->methods()).' '.$route->uri())
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});

test('the old edit and delete endpoints are gone', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = Appointment::factory()->create(['organization_id' => $membership->organization_id, 'membership_id' => $membership->id]);
    $note = ClinicalNote::factory()->create(['appointment_id' => $appointment->id]);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);

    $this->actingAs($membership->user)->patchJson("/api/v1/clinical-notes/{$note->id}", ['body' => 'x'])->assertStatus(404);
    $this->actingAs($membership->user)->deleteJson("/api/v1/clinical-notes/{$note->id}")->assertStatus(404);
    $this->actingAs($membership->user)->patchJson("/api/v1/prescriptions/{$prescription->id}", ['items' => []])->assertStatus(404);
});

test('the database rejects updating or deleting any row of the clinical history', function (string $table, Closure $rowId) {
    $id = $rowId();

    expect(inSavepoint(fn () => DB::table($table)->where('id', $id)->update(['created_at' => now()])))
        ->toThrow(QueryException::class, 'append-only');
    expect(inSavepoint(fn () => DB::table($table)->where('id', $id)->delete()))
        ->toThrow(QueryException::class, 'append-only');
    expect(inSavepoint(fn () => DB::statement("TRUNCATE {$table} CASCADE")))
        ->toThrow(QueryException::class, 'append-only');

    expect(DB::table($table)->where('id', $id)->exists())->toBeTrue();
})->with([
    'clinical_notes' => ['clinical_notes', fn () => ClinicalNote::factory()->create()->id],
    'clinical_note_versions' => ['clinical_note_versions', fn () => ClinicalNote::factory()->create()->versions()->sole()->id],
    'clinical_note_annulments' => ['clinical_note_annulments', function () {
        $note = ClinicalNote::factory()->create();

        return $note->annulment()->create(['membership_id' => $note->membership_id, 'reason' => 'Anulada.'])->id;
    }],
    'prescriptions' => ['prescriptions', fn () => Prescription::factory()->create()->id],
    'prescription_versions' => ['prescription_versions', fn () => Prescription::factory()->create()->versions()->sole()->id],
    'prescription_items' => ['prescription_items', fn () => Prescription::factory()->create()->versions()->sole()->items()->sole()->id],
]);

test('the migration turns existing rows into version 1 and restores soft-deleted notes as annulled', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create(['organization_id' => $membership->organization_id, 'membership_id' => $membership->id]);
    $migration = require database_path(APPEND_ONLY_MIGRATION);
    $migration->down();

    $legacy = [
        'organization_id' => $membership->organization_id,
        'appointment_id' => $appointment->id,
        'membership_id' => $membership->id,
    ];
    $editedNoteId = DB::table('clinical_notes')->insertGetId([...$legacy, 'body' => 'Nota editada.', 'created_at' => '2026-09-01 10:00:00+00', 'updated_at' => '2026-09-02 10:00:00+00']);
    $deletedNoteId = DB::table('clinical_notes')->insertGetId([...$legacy, 'body' => 'Nota borrada.', 'created_at' => '2026-09-03 10:00:00+00', 'updated_at' => '2026-09-03 10:00:00+00', 'deleted_at' => '2026-09-04 10:00:00+00']);
    $prescriptionId = DB::table('prescriptions')->insertGetId([...$legacy, 'patient_id' => $appointment->patient_id, 'issued_at' => '2026-09-05 10:00:00+00', 'created_at' => '2026-09-05 10:00:00+00', 'updated_at' => '2026-09-06 10:00:00+00']);
    foreach (['Amoxicilina', 'Ibuprofeno'] as $position => $medication) {
        DB::table('prescription_items')->insert(['prescription_id' => $prescriptionId, 'position' => $position, 'medication' => $medication, 'dosage' => '1 por día', 'quantity' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    $migration->up();

    $edited = ClinicalNote::with('versions', 'annulment')->findOrFail($editedNoteId);
    expect($edited->versions)->toHaveCount(1)
        ->and($edited->versions->sole()->version)->toBe(1)
        ->and($edited->versions->sole()->body)->toBe('Nota editada.')
        ->and($edited->versions->sole()->membership_id)->toBe($membership->id)
        ->and($edited->versions->sole()->created_at->toIso8601ZuluString())->toBe('2026-09-02T10:00:00Z')
        ->and($edited->created_at->toIso8601ZuluString())->toBe('2026-09-01T10:00:00Z')
        ->and($edited->annulment)->toBeNull();

    $deleted = ClinicalNote::with('versions', 'annulment')->findOrFail($deletedNoteId);
    expect($deleted->versions->sole()->body)->toBe('Nota borrada.')
        ->and($deleted->annulment?->reason)->toBe($migration::LEGACY_DELETION_REASON)
        ->and($deleted->annulment?->membership_id)->toBe($membership->id)
        ->and($deleted->annulment?->created_at?->toIso8601ZuluString())->toBe('2026-09-04T10:00:00Z');

    $version = Prescription::findOrFail($prescriptionId)->versions()->sole();
    expect($version->version)->toBe(1)
        ->and($version->created_at->toIso8601ZuluString())->toBe('2026-09-06T10:00:00Z')
        ->and($version->items()->pluck('medication')->all())->toBe(['Amoxicilina', 'Ibuprofeno']);

    expect(inSavepoint(fn () => DB::table('clinical_notes')->where('id', $deletedNoteId)->delete()))
        ->toThrow(QueryException::class, 'append-only');
});

test('rolling the migration back keeps the latest version and brings annulled notes back soft-deleted', function () {
    $note = ClinicalNote::factory()->withBody('Versión 1.')->create();
    $note->versions()->create(['version' => 2, 'membership_id' => $note->membership_id, 'body' => 'Versión 2.']);
    $note->annulment()->create(['membership_id' => $note->membership_id, 'reason' => 'Anulada.']);
    $prescription = Prescription::factory()->create();
    $prescription->versions()->create(['version' => 2, 'membership_id' => $prescription->membership_id])
        ->items()->create(['position' => 0, 'medication' => 'Paracetamol', 'dosage' => '1 cada 6 h', 'quantity' => 2]);

    (require database_path(APPEND_ONLY_MIGRATION))->down();

    $legacyNote = DB::table('clinical_notes')->where('id', $note->id)->sole();
    expect($legacyNote->body)->toBe('Versión 2.')
        ->and($legacyNote->deleted_at)->not->toBeNull();
    expect(DB::table('prescription_items')->where('prescription_id', $prescription->id)->pluck('medication')->all())
        ->toBe(['Paracetamol']);
});
