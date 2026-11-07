<?php

declare(strict_types=1);

use App\Enums\AllergySeverity;
use App\Enums\BloodType;
use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalEncryptionKey;
use App\Models\ClinicalNote;
use App\Models\MedicalHistoryEntry;
use App\Models\Prescription;
use App\Models\VitalSign;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/*
 * The free clinical content is stored encrypted (#391, ADR 0036): a raw read of each table finds `<key id>:<cipher
 * text>` and never the text, and the model gives it back as written.
 */
test('the free clinical content is stored encrypted and read back as written', function (Closure $write) {
    /** @var array{0: Model, 1: array<string, string|list<string>>} $written */
    $written = $write();
    [$model, $values] = $written;
    $raw = (array) DB::table($model->getTable())->where('id', $model->getKey())->sole();
    $keyId = ClinicalEncryptionKey::query()->sole()->id;

    foreach ($values as $column => $plain) {
        $stored = $raw[$column];
        expect($stored)->toBeString()
            ->toStartWith("{$keyId}:");

        foreach ((array) $plain as $fragment) {
            expect($stored)->not->toContain($fragment);
        }

        expect($model->newQuery()->findOrFail($model->getKey())->getAttribute($column))->toBe($plain);
    }
})->with([
    'clinical_note_versions' => [function () {
        $note = ClinicalNote::factory()->withBody('Dolor lumbar desde hace una semana.')->create();

        return [$note->versions()->create([
            'version' => 2,
            'membership_id' => $note->membership_id,
            'body' => 'Dolor lumbar, irradiado a la pierna.',
            'reason' => 'Faltaba la irradiación.',
        ]), ['body' => 'Dolor lumbar, irradiado a la pierna.', 'reason' => 'Faltaba la irradiación.']];
    }],
    'clinical_note_annulments' => [function () {
        $note = ClinicalNote::factory()->create();

        return [$note->annulment()->create([
            'membership_id' => $note->membership_id,
            'reason' => 'Cargada en el paciente equivocado.',
        ]), ['reason' => 'Cargada en el paciente equivocado.']];
    }],
    'prescription_items' => [function () {
        $prescription = Prescription::factory()->create();
        $version = $prescription->versions()->create([
            'version' => 2,
            'membership_id' => $prescription->membership_id,
            'reason' => 'Cambio de presentación.',
        ]);

        return [$version->items()->create([
            'position' => 0,
            'medication' => 'Sertralina',
            'presentation' => 'comprimidos 50 mg',
            'dosage' => '1 por la mañana',
            'quantity' => 1,
            'gtin' => '07795306000123',
            'snomed' => '372594008',
            'substances' => ['sertralina'],
        ]), [
            'medication' => 'Sertralina',
            'presentation' => 'comprimidos 50 mg',
            'dosage' => '1 por la mañana',
            'gtin' => '07795306000123',
            'snomed' => '372594008',
            'substances' => ['sertralina'],
        ]];
    }],
    'prescription_versions' => [function () {
        $prescription = Prescription::factory()->create();

        return [$prescription->versions()->create([
            'version' => 2,
            'membership_id' => $prescription->membership_id,
            'reason' => 'Ajuste de dosis por insomnio.',
        ]), ['reason' => 'Ajuste de dosis por insomnio.']];
    }],
    'prescription_annulments' => [function () {
        $prescription = Prescription::factory()->create();

        return [$prescription->annulment()->create([
            'membership_id' => $prescription->membership_id,
            'reason' => 'Suspendida por efectos adversos.',
        ]), ['reason' => 'Suspendida por efectos adversos.']];
    }],
    'medical_history_entry_versions' => [function () {
        $entry = MedicalHistoryEntry::factory()->create();

        return [$entry->versions()->create([
            'version' => 2,
            'membership_id' => $entry->membership_id,
            'description' => 'Amoxicilina',
            'reaction' => 'Edema de glotis',
            'severity' => AllergySeverity::Severe,
            'approximate_date' => 'Infancia',
            'reason' => 'El paciente recordó la reacción.',
        ]), [
            'description' => 'Amoxicilina',
            'reaction' => 'Edema de glotis',
            'approximate_date' => 'Infancia',
            'reason' => 'El paciente recordó la reacción.',
        ]];
    }],
    'medical_history_entry_withdrawals' => [function () {
        $entry = MedicalHistoryEntry::factory()->create();

        return [$entry->withdrawal()->create([
            'membership_id' => $entry->membership_id,
            'reason' => 'Prueba de provocación negativa.',
        ]), ['reason' => 'Prueba de provocación negativa.']];
    }],
    'blood_type_records' => [function () {
        return [BloodTypeRecord::factory()->create([
            'blood_type' => BloodType::ONegative,
            'reason' => 'Informe del banco de sangre.',
        ]), ['reason' => 'Informe del banco de sangre.']];
    }],
    'vital_sign_versions' => [function () {
        $vitalSign = VitalSign::factory()->create();

        return [$vitalSign->versions()->create([
            'version' => 2,
            'membership_id' => $vitalSign->membership_id,
            'reason' => 'Balanza descalibrada.',
            'weight_kg' => 71.5,
        ]), ['reason' => 'Balanza descalibrada.']];
    }],
    'vital_sign_annulments' => [function () {
        $vitalSign = VitalSign::factory()->create();

        return [$vitalSign->annulment()->create([
            'membership_id' => $vitalSign->membership_id,
            'reason' => 'Medición de otro paciente.',
        ]), ['reason' => 'Medición de otro paciente.']];
    }],
    'clinical_access_logs' => [function () {
        $note = ClinicalNote::factory()->create();

        return [ClinicalAccessLog::query()->create([
            'organization_id' => $note->organization_id,
            'membership_id' => $note->membership_id,
            'patient_id' => $note->patient_id,
            'action' => ClinicalAccessAction::ExceptionalAccess,
            'reason' => ClinicalAccessReason::Other,
            'reason_detail' => 'Consulta telefónica por un resultado.',
        ]), ['reason_detail' => 'Consulta telefónica por un resultado.']];
    }],
]);

test('what stays in clear is what SQL reads: the severity, the blood type and the access reason', function () {
    $entry = MedicalHistoryEntry::factory()->create();
    $record = BloodTypeRecord::factory()->create(['blood_type' => BloodType::AbPositive]);

    expect(DB::table('medical_history_entry_versions')->where('medical_history_entry_id', $entry->id)->value('severity'))
        ->toBe(AllergySeverity::Moderate->value)
        ->and(DB::table('blood_type_records')->where('id', $record->id)->value('blood_type'))->toBe('AB+');
});

test('an empty optional field stays null instead of an encrypted empty value', function () {
    $prescription = Prescription::factory()->create();
    $version = $prescription->versions()->create(['version' => 2, 'membership_id' => $prescription->membership_id]);

    expect(DB::table('prescription_versions')->where('id', $version->id)->value('reason'))->toBeNull()
        ->and($version->fresh()?->reason)->toBeNull();
});
