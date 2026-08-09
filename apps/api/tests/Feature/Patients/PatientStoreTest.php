<?php

declare(strict_types=1);

use App\Enums\DocumentType;
use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

// A row inserted through a genuinely separate Postgres session is committed independently of RefreshDatabase's per-test transaction, so deleting it inline would deadlock on the FK lock held until that transaction ends; cleanup runs in afterAll(), once every test's transaction has already rolled back, using the still-open PDO connection captured here since Laravel's container (config()/app()) is torn down by then.
function &raceCleanupTasks(): array
{
    static $tasks = [];

    return $tasks;
}

afterAll(function () {
    foreach (raceCleanupTasks() as [$pdo, $patientId]) {
        $pdo->exec('DELETE FROM patients WHERE id = '.$patientId);
    }
});

test('store creates a new patient, links it to the active organization and sets created_by', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Juana Diaz',
        'document_type' => 'dni',
        'document_number' => '12345678',
        'email' => 'juana@example.com',
        'phone' => '111222333',
    ]);

    $response->assertCreated();
    $patient = Patient::findOrFail($response->json('data.id'));

    expect($patient->created_by)->toBe($membership->user_id);
    expect($patient->organizations()->count())->toBe(1);
    expect($patient->organizations()->first()->id)->toBe($membership->organization_id);
});

test('store with an already-existing document pair returns that same patient and does not duplicate it', function () {
    $membership = Membership::factory()->create();
    $existing = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '99999999',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Otro Nombre',
        'document_type' => 'dni',
        'document_number' => '99999999',
    ]);

    $response->assertCreated();
    expect($response->json('data.id'))->toBe($existing->id);
    expect(Patient::count())->toBe(1);
    expect($existing->organizations()->whereKey($membership->organization_id)->exists())->toBeTrue();
});

test('store fills only empty contact fields on an existing patient without overwriting set ones', function () {
    $membership = Membership::factory()->create();
    $existing = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '55555555',
        'email' => 'original@example.com',
        'phone' => null,
        'birth_date' => null,
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => $existing->name,
        'document_type' => 'dni',
        'document_number' => '55555555',
        'email' => 'nuevo@example.com',
        'phone' => '444555666',
        'birth_date' => '1990-01-01',
    ])->assertCreated();

    $existing->refresh();
    expect($existing->email)->toBe('original@example.com');
    expect($existing->phone)->toBe('444555666');
    expect($existing->birth_date?->format('Y-m-d'))->toBe('1990-01-01');
});

test('store never overwrites the name of an existing patient', function () {
    $membership = Membership::factory()->create();
    $existing = Patient::factory()->create([
        'name' => 'Nombre Original',
        'document_type' => DocumentType::Dni,
        'document_number' => '66666666',
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Nombre Distinto',
        'document_type' => 'dni',
        'document_number' => '66666666',
    ])->assertCreated();

    expect($existing->fresh()->name)->toBe('Nombre Original');
});

test('store returns 422 when document_number is missing', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Sin Documento',
        'document_type' => 'dni',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('document_number');
});

test('store returns 422 when document_type is outside the enum', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Tipo Invalido',
        'document_type' => 'not_a_real_type',
        'document_number' => '12345678',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('document_type');
});

test('store returns 422 when insurance_provider_id does not exist', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Con Obra Social Invalida',
        'document_type' => 'dni',
        'document_number' => '12345679',
        'insurance_provider_id' => 999999,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('insurance_provider_id');
});

test('store returns 422 when birth_date is in the future', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Fecha Futura',
        'document_type' => 'dni',
        'document_number' => '12345680',
        'birth_date' => now()->addDay()->toDateString(),
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('birth_date');
});

test('storing the same patient twice from the same organization leaves exactly one pivot row', function () {
    $membership = Membership::factory()->create();

    $payload = [
        'name' => 'Paciente Repetido',
        'document_type' => 'dni',
        'document_number' => '77777777',
    ];

    $this->actingAs($membership->user)->postJson('/api/v1/patients', $payload)->assertCreated();
    $this->actingAs($membership->user)->postJson('/api/v1/patients', $payload)->assertCreated();

    $patient = Patient::where('document_number', '77777777')->firstOrFail();

    expect(
        DB::table('organization_patient')
            ->where('patient_id', $patient->id)
            ->where('organization_id', $membership->organization_id)
            ->count()
    )->toBe(1);
});

test('storing the pair of a soft-deleted patient restores and reuses it', function () {
    $membership = Membership::factory()->create();
    $existing = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '88888888',
    ]);
    $existing->delete();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => $existing->name,
        'document_type' => 'dni',
        'document_number' => '88888888',
    ]);

    $response->assertCreated();
    expect($response->json('data.id'))->toBe($existing->id);
    expect(Patient::withTrashed()->count())->toBe(1);
    expect($existing->fresh()->trashed())->toBeFalse();
});

// Declared last on purpose: the racing row it plants survives rollback (see the afterAll() cleanup above), so it must not exist while earlier tests run.
test('store reuses the patient a concurrent request just created for the same document pair instead of returning a 500', function () {
    $membership = Membership::factory()->create();

    // Genuinely separate database session (own PDO connection), not this test's RefreshDatabase transaction — commits independently of the SAVEPOINT rollback below.
    $config = config('database.connections.pgsql');
    $race = new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']),
        $config['username'],
        $config['password']
    );

    $racingPatientId = null;

    Patient::creating(function (Patient $patient) use (&$racingPatientId, $race) {
        if ($patient->document_number !== '10101010') {
            return;
        }

        // Fires after the action's own read found nothing but before its insert lands, so the insert below collides on the unique constraint.
        $racingPatientId = (int) $race->query(
            'INSERT INTO patients (name, document_type, document_number, created_at, updated_at) '.
            "VALUES ('Ganador de la carrera', 'dni', '10101010', now(), now()) RETURNING id"
        )->fetchColumn();
    });

    $response = $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Perdedor de la carrera',
        'document_type' => 'dni',
        'document_number' => '10101010',
    ]);

    $response->assertCreated();
    expect(Patient::count())->toBe(1);
    expect($response->json('data.id'))->toBe($racingPatientId);
    expect(
        DB::table('organization_patient')
            ->where('patient_id', $racingPatientId)
            ->where('organization_id', $membership->organization_id)
            ->exists()
    )->toBeTrue();

    raceCleanupTasks()[] = [$race, $racingPatientId];
});
