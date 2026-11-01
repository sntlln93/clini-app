<?php

declare(strict_types=1);

use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\Membership;
use App\Models\ProfessionalLicense;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    // Off unless a test turns it on, whatever the run's env says (CI runs the suite with it on too).
    config(['services.national_professional_search.enabled' => false]);
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function professionalWithDocument(?string $documentNumber = '30123456'): User
{
    $user = Membership::factory()->professional()->create()->user;
    $user->forceFill(['document_number' => $documentNumber])->save();

    return $user;
}

/**
 * @return array<string, string>
 */
function cordobaLicense(string $number = 'MP 6789'): array
{
    return ['number' => $number, 'province' => Province::Cordoba->value, 'profession' => HealthProfession::Medico->value];
}

test('a declared license is checked against the registry right away and keeps only the minimum it answers', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $response = $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense('mp6789'));

    $response->assertCreated()
        ->assertJsonPath('data.number', 'MP6789')
        ->assertJsonPath('data.province', 'cordoba')
        ->assertJsonPath('data.profession', 'medico')
        ->assertJsonPath('data.status', 'verified')
        ->assertJsonPath('data.mismatch_reason', null)
        ->assertJsonPath('data.refeps_code', '541030123456')
        ->assertJsonPath('data.issuer', 'MEDICOS DE LA PROVINCIA DE CORDOBA, Consejo de')
        ->assertJsonPath('data.specialty', 'Medicina General y/o Medicina de Familia')
        ->assertJsonPath('data.situation', 'Habilitado');
    expect($response->json('data.checked_at'))->not->toBeNull();

    // Nothing else the registry answered about the person is kept anywhere.
    $row = json_encode(DB::table('professional_licenses')->first());
    expect($row)->not->toContain('PRUEBA')->not->toContain('27301234565')->not->toContain('ANA LAURA');
});

test('a license the registry doesn\'t hold in that province is a mismatch, not refused', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses', [...cordobaLicense(), 'province' => Province::SantaFe->value])
        ->assertCreated()
        ->assertJsonPath('data.status', 'mismatch')
        ->assertJsonPath('data.mismatch_reason', 'not_found')
        ->assertJsonPath('data.refeps_code', null);
});

test('a license whose registry answer isn\'t enabled is a mismatch with the situation it has', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([nationalProfessionalSearchItem([['Médico', '6789', 'Córdoba', 'Suspendido']])]));

    $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense('6789'))
        ->assertCreated()
        ->assertJsonPath('data.status', 'mismatch')
        ->assertJsonPath('data.mismatch_reason', 'not_enabled')
        ->assertJsonPath('data.situation', 'Suspendido');
});

test('with the registry failing, a license is kept unverified and the registry pauses', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(fn () => throw new ConnectionException('cURL error 28: Operation timed out'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense())
        ->assertCreated()
        ->assertJsonPath('data.status', 'unverified')
        ->assertJsonPath('data.checked_at', null);

    // Paused: the next license doesn't even read the form again (the fake records only the first form read; the post
    // that timed out never got a response).
    $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense('7000'))->assertCreated();
    Http::assertSentCount(1);
});

test('with the registry off, or without a DNI, a license is kept unverified without asking anyone', function (bool $enabled, ?string $documentNumber) {
    $user = professionalWithDocument($documentNumber);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));
    config(['services.national_professional_search.enabled' => $enabled]);

    $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense())
        ->assertCreated()
        ->assertJsonPath('data.status', 'unverified');
    Http::assertNothingSent();
})->with([
    'off' => [false, '30123456'],
    'no DNI' => [true, null],
]);

test('declaring the same license twice keeps the first and asks the registry once', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $first = $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense('mp  6789'))->assertCreated();
    $second = $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense('MP 6789'))->assertCreated();

    expect($second->json('data.id'))->toBe($first->json('data.id'))
        ->and(ProfessionalLicense::query()->count())->toBe(1);
    Http::assertSentCount(2);
});

test('a license is validated', function (array $payload, string $field) {
    $this->actingAs(professionalWithDocument())->postJson('/api/v1/me/licenses', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'no number' => [['province' => 'cordoba', 'profession' => 'medico'], 'number'],
    'a number without digits' => [['number' => 'MP', 'province' => 'cordoba', 'profession' => 'medico'], 'number'],
    'an unknown province' => [['number' => '1', 'province' => 'marte', 'profession' => 'medico'], 'province'],
    'an unknown profession' => [['number' => '1', 'province' => 'cordoba', 'profession' => 'veterinario'], 'profession'],
]);

test('a professional lists only their own licenses', function () {
    $user = professionalWithDocument();
    $own = ProfessionalLicense::factory()->create(['user_id' => $user->id]);
    ProfessionalLicense::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me/licenses')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $own->id);
});

test('a professional removes their own license, never another\'s', function () {
    $user = professionalWithDocument();
    $own = ProfessionalLicense::factory()->create(['user_id' => $user->id]);
    $other = ProfessionalLicense::factory()->create();

    $this->actingAs($user)->deleteJson("/api/v1/me/licenses/{$other->id}")->assertForbidden();
    $this->actingAs($user)->deleteJson("/api/v1/me/licenses/{$own->id}")->assertNoContent();

    expect(ProfessionalLicense::query()->pluck('id')->all())->toBe([$other->id]);
});

test('a professional reads and sets their own DNI, written with or without dots', function () {
    $user = professionalWithDocument(null);

    $this->actingAs($user)->getJson('/api/v1/me/professional-document')
        ->assertOk()
        ->assertJsonPath('data.document_number', null);

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30.123.456'])
        ->assertOk()
        ->assertJsonPath('data.document_number', '30123456');

    // Encrypted at rest.
    expect(DB::table('users')->where('id', $user->id)->value('document_number'))->not->toContain('30123456');
});

test('a DNI is validated', function (mixed $documentNumber) {
    $this->actingAs(professionalWithDocument())->putJson('/api/v1/me/professional-document', ['document_number' => $documentNumber])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('document_number');
})->with(['123456', '123456789', '30A23456', 30123456]);

test('the DNI never leaves the API anywhere but its own endpoint', function () {
    $user = professionalWithDocument();

    $this->actingAs($user)->getJson('/api/v1/me')->assertOk()->assertJsonMissingPath('document_number');
    expect($user->toArray())->not->toHaveKey('document_number');
});

test('a new DNI makes every license unverified and checks them again with it', function () {
    $user = professionalWithDocument('30123457');
    ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id, 'number' => 'MP 6789', 'province' => Province::Cordoba]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('no-results.html'));

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertOk();

    expect(ProfessionalLicense::query()->sole())
        ->status->toBe(ProfessionalLicenseStatus::Mismatch)
        ->mismatch_reason->toBe(ProfessionalLicenseMismatch::NotFound)
        ->refeps_code->toBeNull();
});

test('a new DNI the registry can\'t check leaves every license unverified, not with the old answer', function () {
    $user = professionalWithDocument('30123457');
    ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertOk();

    expect(ProfessionalLicense::query()->sole())
        ->status->toBe(ProfessionalLicenseStatus::Unverified)
        ->refeps_code->toBeNull()
        ->checked_at->toBeNull();
});

test('taking the DNI away leaves every license unverified', function () {
    $user = professionalWithDocument();
    ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id]);

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => null])
        ->assertOk()
        ->assertJsonPath('data.document_number', null);

    expect(ProfessionalLicense::query()->sole()->status)->toBe(ProfessionalLicenseStatus::Unverified);
});

test('the same DNI again changes nothing and asks nobody', function () {
    $user = professionalWithDocument();
    ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertOk();

    expect(ProfessionalLicense::query()->sole()->status)->toBe(ProfessionalLicenseStatus::Verified);
    Http::assertNothingSent();
});

test('a professional checks their licenses again on demand', function () {
    $user = professionalWithDocument();
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertOk()
        ->assertJsonPath('data.0.status', 'verified')
        ->assertJsonPath('data.0.issuer', 'MINISTERIO DE SALUD DE LA NACION');
});

test('checking again on demand says so when the registry is off or failing, and changes nothing', function (bool $enabled) {
    $user = professionalWithDocument();
    $license = ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id]);
    fakeNationalProfessionalSearch(fn () => Http::response('Bad Gateway', 502));
    config(['services.national_professional_search.enabled' => $enabled]);

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertStatus(503)
        ->assertJsonPath('error.code', 'professionals.registry_unavailable');

    expect($license->refresh()->status)->toBe(ProfessionalLicenseStatus::Verified);
})->with(['off' => [false], 'failing' => [true]]);

test('every write that reaches the registry is throttled per user', function () {
    $user = professionalWithDocument();

    foreach (range(1, 10) as $attempt) {
        $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();
    }

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertTooManyRequests();
    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertTooManyRequests();
    $this->actingAs($user)->postJson('/api/v1/me/licenses', cordobaLicense())->assertTooManyRequests();
});

test('a guest reaches none of it', function () {
    $this->getJson('/api/v1/me/licenses')->assertUnauthorized();
    $this->getJson('/api/v1/me/professional-document')->assertUnauthorized();
});

test('deleting a user deletes their licenses', function () {
    $license = ProfessionalLicense::factory()->create();

    DB::table('memberships')->where('user_id', $license->user_id)->delete();
    $license->user()->firstOrFail()->delete();

    expect(ProfessionalLicense::query()->count())->toBe(0);
});
