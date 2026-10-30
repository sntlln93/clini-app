<?php

declare(strict_types=1);

use App\Enums\DocumentType;
use App\Enums\PatientContactType;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\PatientContact;
use App\Support\CurrentOrganization;
use App\Support\PatientContactValue;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * @param  list<array<string, mixed>>  $contacts
 * @return array<string, mixed>
 */
function patientPayloadWithContacts(Patient $patient, array $contacts): array
{
    return [
        'name' => $patient->name,
        'document_type' => $patient->document_type->value,
        'document_number' => $patient->document_number,
        'contacts' => $contacts,
    ];
}

test('a contact is stored in one form however it was typed', function (PatientContactType $type, string $typed, string $stored) {
    expect(PatientContactValue::normalize($type, $typed))->toBe($stored);
})->with([
    'a mobile with 0 and 15' => [PatientContactType::Phone, '011 15 2345-6789', '+5491123456789'],
    'a mobile in E.164' => [PatientContactType::Phone, '+54 9 11 2345-6789', '+5491123456789'],
    'a landline with its area code' => [PatientContactType::Phone, '(011) 4123-4567', '+541141234567'],
    'a number from abroad' => [PatientContactType::Phone, '+1 415 555 2671', '+14155552671'],
    'a WhatsApp number without its 9' => [PatientContactType::Whatsapp, '11 2345-6789', '+5491123456789'],
    'an email in capitals' => [PatientContactType::Email, '  Juana.Diaz@Example.COM ', 'juana.diaz@example.com'],
]);

test('a value that is not a contact of its type is rejected', function (PatientContactType $type, string $typed) {
    expect(PatientContactValue::normalize($type, $typed))->toBeNull();
})->with([
    'a number without its area code' => [PatientContactType::Phone, '4123-4567'],
    'letters as a phone' => [PatientContactType::Whatsapp, 'mi celular'],
    'an email without a domain' => [PatientContactType::Email, 'juana@'],
]);

test('update replaces the contacts in the given order, with their labels, and confirms the ones it keeps', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()
        ->withEmail('viejo@example.com')
        ->withEmail('reserva@example.com', needsConfirmation: true)
        ->create();
    $patient->organizations()->attach($membership->organization_id);
    $kept = $patient->contacts()->where('value', 'reserva@example.com')->firstOrFail();

    $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", patientPayloadWithContacts($patient, [
        ['type' => 'whatsapp', 'value' => '11 2345-6789', 'label' => 'madre'],
        ['type' => 'email', 'value' => 'RESERVA@example.com', 'label' => ''],
    ]))->assertOk()
        ->assertJsonPath('data.contacts.0.value', '+5491123456789')
        ->assertJsonPath('data.contacts.0.label', 'madre')
        ->assertJsonPath('data.contacts.1.id', $kept->id)
        ->assertJsonPath('data.contacts.1.needs_confirmation', false)
        ->assertJsonCount(2, 'data.contacts');

    expect(PatientContact::query()->where('value', 'viejo@example.com')->exists())->toBeFalse();
    expect($patient->contacts()->firstOrFail()->created_by)->toBe($membership->user_id);
});

test('update with null contacts also leaves them as they are', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->withEmail('queda@example.com')->create();
    $patient->organizations()->attach($membership->organization_id);

    $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", [...patientPayloadWithContacts($patient, []), 'contacts' => null])
        ->assertOk()
        ->assertJsonPath('data.contacts.0.value', 'queda@example.com');
});

test('update without contacts leaves the patient\'s contacts as they are', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->withEmail('queda@example.com')->create();
    $patient->organizations()->attach($membership->organization_id);

    $payload = patientPayloadWithContacts($patient, []);
    unset($payload['contacts']);

    $this->actingAs($membership->user)->putJson("/api/v1/patients/{$patient->id}", $payload)
        ->assertOk()
        ->assertJsonPath('data.contacts.0.value', 'queda@example.com');
});

test('a repeated, invalid or unknown contact is a 422 on its own row', function (array $contacts, string $field) {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Juana Diaz',
        'document_type' => 'dni',
        'document_number' => '12345678',
        'contacts' => $contacts,
    ])->assertStatus(422)->assertJsonValidationErrors($field);

    expect(Patient::query()->count())->toBe(0);
})->with([
    'the same number typed two ways' => [[['type' => 'phone', 'value' => '11 2345-6789'], ['type' => 'phone', 'value' => '+54 11 2345 6789']], 'contacts.1.value'],
    'an invalid number' => [[['type' => 'phone', 'value' => '1234']], 'contacts.0.value'],
    'an invalid email' => [[['type' => 'email', 'value' => 'juana@']], 'contacts.0.value'],
    'an unknown type' => [[['type' => 'fax', 'value' => '11 2345-6789']], 'contacts.0.type'],
    'an empty value' => [[['type' => 'email', 'value' => '']], 'contacts.0.value'],
    'keyed instead of a list' => [['a' => ['type' => 'email', 'value' => 'a@example.com']], 'contacts'],
    'too many' => [array_map(fn (int $n): array => ['type' => 'email', 'value' => "p{$n}@example.com"], range(1, 11)), 'contacts'],
]);

test('the same number as a phone and as WhatsApp is two contacts', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => 'Juana Diaz',
        'document_type' => 'dni',
        'document_number' => '12345678',
        'contacts' => [
            ['type' => 'phone', 'value' => '011 15 2345-6789'],
            ['type' => 'whatsapp', 'value' => '011 15 2345-6789'],
        ],
    ])->assertCreated()->assertJsonCount(2, 'data.contacts');
});

test('registering an existing patient never confirms a contact an anonymous booking left unconfirmed', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->withEmail('reserva@example.com', needsConfirmation: true)->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '30111222',
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/patients', [
        'name' => $patient->name,
        'document_type' => 'dni',
        'document_number' => '30111222',
        'contacts' => [['type' => 'email', 'value' => 'reserva@example.com']],
    ])->assertCreated()
        ->assertJsonPath('data.contacts.0.needs_confirmation', true)
        ->assertJsonCount(1, 'data.contacts');
});
