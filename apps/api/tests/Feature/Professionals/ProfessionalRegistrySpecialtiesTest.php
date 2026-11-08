<?php

declare(strict_types=1);

use App\Contracts\ProfessionalRegistry;
use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\Membership;
use App\Models\ProfessionalLicense;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\User;
use App\Services\Professionals\FakeProfessionalRegistry;
use App\Services\Professionals\NationalProfessionalSearchService;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

beforeEach(function () {
    config(['services.professional_registry.adapter' => 'fake']);
    Sleep::fake();
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function registryProfessional(string $documentNumber = '30123456'): User
{
    $user = Membership::factory()->professional()->create()->user;
    $user->forceFill(['document_number' => $documentNumber])->save();

    return $user;
}

/**
 * @return list<array{string, string}>
 */
function specialtiesCatalog(): array
{
    return Specialty::query()->orderBy('profession')->orderBy('name')->get()
        ->map(fn (Specialty $specialty): array => [$specialty->profession->value, $specialty->name])
        ->all();
}

test('a registry answer adds its professions and specialties to the catalog, and a profession without one is its own row', function () {
    $user = registryProfessional();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses', [
        'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires->value, 'profession' => HealthProfession::Medico->value,
    ])->assertCreated()->assertJsonPath('data.specialty', 'Medicina General y/o Medicina de Familia');

    // The recorded answer: Médico with a specialty, and Odontólogo without one, which wasn't even declared.
    expect(specialtiesCatalog())->toBe([
        ['medico', 'Medicina General y/o Medicina de Familia'],
        ['odontologo', 'Odontólogo'],
    ]);
});

test('every way the registry is asked fills the catalog', function (string $path) {
    $user = registryProfessional($path === 'a new DNI' ? '30123457' : '30123456');
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    match ($path) {
        'a new DNI' => $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertOk(),
        'on demand' => $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk(),
        'the daily reverification' => $this->artisan('professionals:reverify-licenses')->assertSuccessful(),
    };

    expect(specialtiesCatalog())->toHaveCount(2)
        ->and(ProfessionalLicense::query()->sole()->specialty?->name)->toBe('Medicina General y/o Medicina de Familia');
})->with(['a new DNI', 'on demand', 'the daily reverification']);

test('the same specialty written another way is the same row, kept as first written', function () {
    $first = registryProfessional('30000001');
    $second = registryProfessional('30000002');
    ProfessionalLicense::factory()->create(['user_id' => $first->id, 'number' => '1', 'province' => Province::Cordoba]);
    ProfessionalLicense::factory()->create(['user_id' => $second->id, 'number' => '2', 'province' => Province::Cordoba]);
    fakeNationalProfessionalSearch(fn ($request) => Http::response(nationalProfessionalSearchResults([
        withRegistrySpecialty(nationalProfessionalSearchItem([['Médico', $request->data()['dni'] === '30000001' ? '1' : '2', 'Córdoba']], documentNumber: $request->data()['dni']),
            $request->data()['dni'] === '30000001' ? 'Pediatría' : 'PEDIATRIA'),
    ])));

    $this->actingAs($first)->postJson('/api/v1/me/licenses/verification')->assertOk();
    app(CurrentOrganization::class)->set(null);
    $this->actingAs($second)->postJson('/api/v1/me/licenses/verification')->assertOk();

    expect(specialtiesCatalog())->toBe([['medico', 'Pediatría']])
        ->and(ProfessionalLicense::query()->pluck('specialty_id')->unique()->all())->toBe([Specialty::query()->sole()->id]);
});

test('a profession Clini doesn\'t know never reaches the catalog', function () {
    $user = registryProfessional();
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '1', 'province' => Province::Cordoba]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([nationalProfessionalSearchItem([
        ['Médico', '1', 'Córdoba'],
        ['Veterinario', '2', 'Córdoba'],
    ])]));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();

    expect(specialtiesCatalog())->toBe([['medico', 'Médico']]);
});

test('the specialties a professional backs are those of their verified licenses only', function () {
    $user = registryProfessional();
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
    // The recorded answer holds this Odontólogo license only in Buenos Aires: declared in Córdoba, it doesn't match.
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '4321', 'province' => Province::Cordoba, 'profession' => HealthProfession::Odontologo]);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk()
        ->assertJsonPath('data.0.status', 'verified')
        ->assertJsonPath('data.1.status', 'mismatch')
        ->assertJsonPath('data.1.specialty', null);

    expect(Specialty::query()->backedFor($user->id)->pluck('name')->all())->toBe(['Medicina General y/o Medicina de Familia']);
});

test('a license that stops being verified stops backing its specialty, and what the practice offers stays', function () {
    $user = registryProfessional();
    $membership = $user->memberships()->sole();
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
    $situation = 'Habilitado';
    fakeNationalProfessionalSearch(function () use (&$situation) {
        return Http::response(nationalProfessionalSearchResults([withRegistrySpecialty(nationalProfessionalSearchItem([['Médico', '123456', 'CABA', $situation]]), 'Pediatría')]));
    });
    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk();
    $specialty = Specialty::query()->backedFor($user->id)->sole();
    $this->actingAs($user)->postJson("/api/v1/memberships/{$membership->id}/specialties", ['specialty_id' => $specialty->id])->assertCreated();

    $situation = 'Suspendido';
    $this->travel(8)->days();
    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect(ProfessionalLicense::query()->sole()->status)->toBe(ProfessionalLicenseStatus::Mismatch)
        ->and(Specialty::query()->backedFor($user->id)->exists())->toBeFalse()
        ->and(ProfessionalSpecialty::query()->where('membership_id', $membership->id)->pluck('specialty_id')->all())->toBe([$specialty->id]);
});

test('a new DNI or a removed license takes the backing away at once', function (string $change) {
    $user = registryProfessional('99000001');
    $this->actingAs($user)->postJson('/api/v1/me/licenses', ['number' => '120034', 'province' => 'caba', 'profession' => 'medico'])
        ->assertCreated()->assertJsonPath('data.specialty', 'Pediatría');
    expect(Specialty::query()->backedFor($user->id)->pluck('name')->all())->toBe(['Pediatría']);

    match ($change) {
        'a new DNI' => $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertOk(),
        'a removed license' => $this->actingAs($user)->deleteJson('/api/v1/me/licenses/'.ProfessionalLicense::query()->sole()->id)->assertNoContent(),
    };

    expect(Specialty::query()->backedFor($user->id)->exists())->toBeFalse();
})->with(['a new DNI', 'a removed license']);

test('the fake registry answers the seeder\'s made-up DNIs, and nobody for any other', function () {
    $registry = new FakeProfessionalRegistry;

    expect($registry->available())->toBeTrue()
        ->and($registry->lookUp('99000001')[0]->licenses)->toHaveCount(2)
        ->and($registry->lookUp('99000001')[0]->licenses[0]->specialty)->toBe('Pediatría')
        ->and($registry->lookUp('30123456'))->toBe([]);
    Http::assertNothingSent();
});

test('PROFESSIONAL_REGISTRY picks the registry, and production refuses the fake one', function () {
    config(['services.professional_registry.adapter' => 'national_search']);
    expect(app(ProfessionalRegistry::class))->toBeInstanceOf(NationalProfessionalSearchService::class);

    config(['services.professional_registry.adapter' => 'fake']);
    expect(app(ProfessionalRegistry::class))->toBeInstanceOf(FakeProfessionalRegistry::class);

    $this->app['env'] = 'production';

    try {
        expect(fn () => app(ProfessionalRegistry::class))->toThrow(LogicException::class, 'refused in production');

        config(['services.professional_registry.adapter' => 'national_search']);
        expect(app(ProfessionalRegistry::class))->toBeInstanceOf(NationalProfessionalSearchService::class);
    } finally {
        $this->app['env'] = 'testing';
    }

    config(['services.professional_registry.adapter' => 'off']);
    expect(fn () => app(ProfessionalRegistry::class))->toThrow(LogicException::class);
});
