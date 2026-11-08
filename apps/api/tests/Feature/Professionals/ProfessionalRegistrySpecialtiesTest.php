<?php

declare(strict_types=1);

use App\Contracts\ProfessionalRegistry;
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

function registryProfessional(?string $documentNumber = '30123456'): User
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

    $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertOk()
        ->assertJsonPath('data.0.specialty', 'Medicina General y/o Medicina de Familia');

    // The recorded answer: Médico with a specialty, and Odontólogo without one.
    expect(specialtiesCatalog())->toBe([
        ['medico', 'Medicina General y/o Medicina de Familia'],
        ['odontologo', 'Odontólogo'],
    ]);
});

test('every way the registry is asked fills the catalog', function (string $path) {
    // Loading a DNI (#417) starts from an account without one: its licenses come with it.
    $user = registryProfessional($path === 'loading the DNI' ? null : '30123456');

    if ($path !== 'loading the DNI') {
        ProfessionalLicense::factory()->state(['added_at' => now()])
            ->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
    }

    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    match ($path) {
        'loading the DNI' => $this->actingAs($user)->putJson('/api/v1/me/professional-document', ['document_number' => '30123456'])->assertOk(),
        'on demand' => $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk(),
        'the daily reverification' => $this->artisan('professionals:reverify-licenses')->assertSuccessful(),
    };

    expect(specialtiesCatalog())->toHaveCount(2)
        ->and(ProfessionalLicense::query()->where('number', '123456')->sole()->specialty?->name)->toBe('Medicina General y/o Medicina de Familia');
})->with(['loading the DNI', 'on demand', 'the daily reverification']);

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

test('the specialties a professional backs are those of their verified licenses in Clini only', function () {
    $user = registryProfessional();
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([withRegistrySpecialty(nationalProfessionalSearchItem([
        ['Médico', '1', 'Córdoba'],
        ['Odontólogo', '2', 'Córdoba'],
        ['Kinesiólogo', '3', 'Córdoba', 'Suspendido'],
    ]), null)]));

    $licenses = $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk()->json('data');
    // Nothing backs a specialty until the professional adds it to Clini.
    expect(Specialty::query()->backedFor($user->id)->exists())->toBeFalse();

    // Médico in Clini and verified; Kinesiólogo in Clini but not enabled; Odontólogo only offered.
    $this->actingAs($user)->putJson("/api/v1/me/licenses/{$licenses[0]['id']}/clini")->assertOk();
    $this->actingAs($user)->putJson("/api/v1/me/licenses/{$licenses[2]['id']}/clini")->assertOk();

    expect(Specialty::query()->backedFor($user->id)->pluck('name')->all())->toBe(['Médico']);
});

test('a license that stops being verified stops backing its specialty, and what the practice offers stays', function () {
    $user = registryProfessional();
    $membership = $user->memberships()->sole();
    ProfessionalLicense::factory()->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
    $situation = 'Habilitado';
    fakeNationalProfessionalSearch(function () use (&$situation) {
        return Http::response(nationalProfessionalSearchResults([withRegistrySpecialty(nationalProfessionalSearchItem([['Médico', '123456', 'CABA', $situation]]), 'Pediatría')]));
    });
    $license = $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')->assertOk()->json('data.0');
    $this->actingAs($user)->putJson("/api/v1/me/licenses/{$license['id']}/clini")->assertOk();
    $specialty = Specialty::query()->backedFor($user->id)->sole();
    $this->actingAs($user)->postJson("/api/v1/memberships/{$membership->id}/specialties", ['specialty_id' => $specialty->id])->assertCreated();

    $situation = 'Suspendido';
    $this->travel(8)->days();
    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect(ProfessionalLicense::query()->sole()->status)->toBe(ProfessionalLicenseStatus::Mismatch)
        ->and(Specialty::query()->backedFor($user->id)->exists())->toBeFalse()
        ->and(ProfessionalSpecialty::query()->where('membership_id', $membership->id)->pluck('specialty_id')->all())->toBe([$specialty->id]);
});

test('taking a license out of Clini, or support taking the DNI away, takes the backing away at once', function (string $change) {
    $user = registryProfessional('99000001');
    $licenses = $this->actingAs($user)->postJson('/api/v1/me/licenses/verification')
        ->assertOk()
        ->assertJsonPath('data.0.specialty', 'Pediatría')
        ->json('data');

    foreach ($licenses as $license) {
        $this->actingAs($user)->putJson("/api/v1/me/licenses/{$license['id']}/clini")->assertOk();
    }
    expect(Specialty::query()->backedFor($user->id)->pluck('name')->all())->toBe(['Pediatría']);

    match ($change) {
        'out of Clini' => collect($licenses)->each(fn (array $license) => $this->actingAs($user)->deleteJson("/api/v1/me/licenses/{$license['id']}/clini")->assertNoContent()),
        'support' => $this->artisan('user:reset-professional-document', ['email' => $user->email])->expectsConfirmation(
            '¿Quitar el DNI y las matrículas de este usuario? Lo que el consultorio le ofrece queda, sin respaldo de matrícula hasta que vuelva a agregarlas.',
            'yes',
        )->assertSuccessful(),
    };

    expect(Specialty::query()->backedFor($user->id)->exists())->toBeFalse();
})->with(['out of Clini', 'support']);

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
