<?php

declare(strict_types=1);

use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\Membership;
use App\Models\ProfessionalLicense;
use App\Models\ProfessionalSpecialty;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    // The fake registry unless a test fakes the real one, whatever the run's env says (CI runs the suite with each).
    config(['services.professional_registry.adapter' => 'fake']);
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

test('looking the DNI up brings every license the registry holds for it, outside Clini, keeping only the minimum', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $response = $this->actingAs($user)->postJson('/api/v1/me/licenses/verification');

    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.number', '123456')
        ->assertJsonPath('data.0.province', 'caba')
        ->assertJsonPath('data.0.status', 'verified')
        ->assertJsonPath('data.0.added', false)
        ->assertJsonPath('data.1.number', 'MP 6789')
        ->assertJsonPath('data.1.province', 'cordoba')
        ->assertJsonPath('data.1.status', 'verified')
        ->assertJsonPath('data.1.refeps_code', '541030123456')
        ->assertJsonPath('data.1.issuer', 'MEDICOS DE LA PROVINCIA DE CORDOBA, Consejo de')
        ->assertJsonPath('data.1.specialty', 'Medicina General y/o Medicina de Familia')
        ->assertJsonPath('data.1.situation', 'Habilitado')
        ->assertJsonPath('data.2.profession', 'odontologo')
        ->assertJsonPath('data.2.specialty', 'Odontólogo');
    expect($response->json('data.1.checked_at'))->not->toBeNull();

    // Nothing else the registry answered about the person is kept anywhere.
    $rows = json_encode(DB::table('professional_licenses')->get());
    expect($rows)->not->toContain('PRUEBA')->not->toContain('27301234565')->not->toContain('ANA LAURA');
});

test('a license in Clini the registry no longer holds is not found, and one only offered goes away', function () {
    $user = professionalWithDocument();
    $added = ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id, 'number' => '999', 'province' => Province::SantaFe]);
    $offered = ProfessionalLicense::factory()->verified()->offered()->create(['user_id' => $user->id, 'number' => '998', 'province' => Province::SantaFe]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();

    expect($added->refresh())
        ->status->toBe(ProfessionalLicenseStatus::Mismatch)
        ->mismatch_reason->toBe(ProfessionalLicenseMismatch::NotFound)
        ->refeps_code->toBeNull()
        ->specialty_id->toBeNull()
        ->added_at->not->toBeNull()
        ->and(ProfessionalLicense::query()->find($offered->id))->toBeNull();
});

test('a license whose registry answer isn\'t enabled is a mismatch with the situation it has', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([nationalProfessionalSearchItem([['Médico', '6789', 'Córdoba', 'Suspendido']])]));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'mismatch')
        ->assertJsonPath('data.0.mismatch_reason', 'not_enabled')
        ->assertJsonPath('data.0.situation', 'Suspendido');
});

test('a license whose province or profession Clini doesn\'t know is left out', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([nationalProfessionalSearchItem([
        ['Médico', '1', 'Córdoba'],
        ['Médico', '2', 'Marte'],
        ['Veterinario', '3', 'Córdoba'],
    ])]));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.number', '1');
});

test('with the registry failing, a new DNI is kept unchecked and the registry pauses', function () {
    $user = professionalWithDocument(null);
    fakeNationalProfessionalSearch(fn () => throw new ConnectionException('cURL error 28: Operation timed out'));

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])
        ->assertOk()
        ->assertJsonPath('data.registry', 'unchecked');

    // Paused: checking again doesn't even read the form (the fake records only the first form read; the post that
    // timed out never got a response).
    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertStatus(503);
    Http::assertSentCount(1);
    expect(ProfessionalLicense::query()->count())->toBe(0);
});

test('without a DNI nothing is asked', function () {
    $user = professionalWithDocument(null);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertOk()
        ->assertJsonCount(0, 'data');
    Http::assertNothingSent();
});

test('looking the DNI up again keeps one row per license and what is in Clini', function () {
    $user = professionalWithDocument();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $first = $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();
    $this->actingAs($user)->putJson("/api/v1/me/licenses/{$first->json('data.1.id')}/clini")->assertOk();
    $second = $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();

    expect($second->json('data.*.id'))->toBe($first->json('data.*.id'))
        ->and($second->json('data.*.added'))->toBe([false, true, false]);
});

test('a professional lists only their own licenses', function () {
    $user = professionalWithDocument();
    $own = ProfessionalLicense::factory()->create(['user_id' => $user->id]);
    ProfessionalLicense::factory()->create();

    $this->actingAs($user)->getJson('/api/v1/me/licenses')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $own->id);
});

test('a professional adds to Clini, or takes out, only their own licenses', function () {
    $user = professionalWithDocument();
    $own = ProfessionalLicense::factory()->verified()->offered()->create(['user_id' => $user->id]);
    $other = ProfessionalLicense::factory()->verified()->offered()->create();

    $this->actingAs($user)->putJson("/api/v1/me/licenses/{$other->id}/clini")->assertForbidden();
    $this->actingAs($user)->deleteJson("/api/v1/me/licenses/{$other->id}/clini")->assertForbidden();

    $this->actingAs($user)->putJson("/api/v1/me/licenses/{$own->id}/clini")
        ->assertOk()
        ->assertJsonPath('data.added', true);
    expect($own->refresh()->added_at)->not->toBeNull();

    // Taken out, it goes back to what the registry holds.
    $this->actingAs($user)->deleteJson("/api/v1/me/licenses/{$own->id}/clini")->assertNoContent();
    expect($own->refresh()->added_at)->toBeNull()
        ->and($other->refresh()->added_at)->toBeNull();
});

test('taking out a license the registry no longer holds removes it', function () {
    $user = professionalWithDocument();
    $license = ProfessionalLicense::factory()->create([
        'user_id' => $user->id,
        'status' => ProfessionalLicenseStatus::Mismatch,
        'mismatch_reason' => ProfessionalLicenseMismatch::NotFound,
    ]);

    $this->actingAs($user)->deleteJson("/api/v1/me/licenses/{$license->id}/clini")->assertNoContent();

    expect(ProfessionalLicense::query()->count())->toBe(0);
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

test('a new DNI drops what the registry held for the old one and looks the new one up', function () {
    $user = professionalWithDocument('30123457');
    ProfessionalLicense::factory()->verified()->offered()->create(['user_id' => $user->id, 'number' => '555', 'province' => Province::SantaFe]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])
        ->assertOk()
        ->assertJsonPath('data.registry', 'found')
        ->assertJsonPath('data.locked', false);

    expect(ProfessionalLicense::query()->pluck('number')->all())->toEqualCanonicalizing(['123456', '4321', 'MP 6789'])
        ->and(ProfessionalLicense::query()->added()->exists())->toBeFalse();
});

test('a DNI the registry holds nobody under says so, and stays open to correction', function () {
    $user = professionalWithDocument(null);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('no-results.html'));

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])
        ->assertOk()
        ->assertJsonPath('data.registry', 'not_found')
        ->assertJsonPath('data.locked', false);

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123457'])->assertOk();
    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => null])
        ->assertOk()
        ->assertJsonPath('data.document_number', null)
        ->assertJsonPath('data.registry', 'unchecked');
});

test('once a license is in Clini the DNI is locked, and only support changes it', function (?string $documentNumber) {
    $user = professionalWithDocument();
    $license = ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->getJson('/api/v1/me/professional-document')->assertJsonPath('data.locked', true);

    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => $documentNumber])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'professionals.document_locked');

    expect($user->refresh()->document_number)->toBe('30123456')
        ->and($license->refresh()->exists)->toBeTrue();
    Http::assertNothingSent();
})->with(['another DNI' => ['30123457'], 'none' => [null]]);

test('support takes a settled DNI and its licenses away, and the practice keeps what it offered', function () {
    $user = professionalWithDocument();
    $membership = $user->memberships()->sole();
    $offered = ProfessionalSpecialty::factory()->create(['organization_id' => $membership->organization_id, 'membership_id' => $membership->id]);

    $this->artisan('user:reset-professional-document', ['email' => mb_strtoupper($user->email)])
        ->expectsConfirmation('¿Quitar el DNI y las matrículas de este usuario? Lo que el consultorio le ofrece queda, sin respaldo de matrícula hasta que vuelva a agregarlas.', 'yes')
        ->doesntExpectOutputToContain('30123456')
        ->assertSuccessful();

    expect($user->refresh()->document_number)->toBeNull()
        ->and(ProfessionalLicense::query()->where('user_id', $user->id)->exists())->toBeFalse()
        ->and(ProfessionalSpecialty::withoutGlobalScope('organization')->whereKey($offered->id)->exists())->toBeTrue();
});

test('support can\'t reset a user without a DNI, nor an unknown one', function (string $email) {
    $user = professionalWithDocument(null);

    $this->artisan('user:reset-professional-document', ['email' => $email === 'own' ? $user->email : $email])->assertFailed();
})->with(['own', 'nadie@example.com']);

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

test('checking again on demand says so when the registry is paused or failing, and changes nothing', function (bool $paused) {
    $user = professionalWithDocument();
    $license = ProfessionalLicense::factory()->verified()->create(['user_id' => $user->id]);
    fakeNationalProfessionalSearch(fn () => Http::response('Bad Gateway', 502));

    if ($paused) {
        pauseNationalProfessionalSearch();
    }

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertStatus(503)
        ->assertJsonPath('error.code', 'professionals.registry_unavailable');

    expect($license->refresh()->status)->toBe(ProfessionalLicenseStatus::Verified);
})->with(['paused' => [true], 'failing' => [false]]);

test('every write that reaches the registry is throttled per user', function () {
    $user = professionalWithDocument();

    foreach (range(1, 10) as $attempt) {
        $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();
    }

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertTooManyRequests();
    $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertTooManyRequests();
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
