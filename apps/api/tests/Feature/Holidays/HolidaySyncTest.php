<?php

declare(strict_types=1);

use App\Actions\Holidays\SyncOrganizationHolidaysAction;
use App\Contracts\HolidayProvider;
use App\Data\Holidays\HolidayData;
use App\Data\Holidays\HolidaySyncData;
use App\Enums\HolidaySource;
use App\Enums\Province;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;
use App\Models\Holiday;
use App\Models\Organization;
use App\Services\Holidays\CalendariosNacionalesService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;

/**
 * A stub `HolidayProvider` returning a fixed set of holidays regardless of
 * year/province, for testing the sync action and command against the
 * contract rather than the real HTTP adapter (that one uses `Http::fake()`
 * separately, below).
 *
 * @param  array<int, HolidayData>  $holidays
 */
function fakeHolidayProvider(array $holidays): HolidayProvider
{
    return new class($holidays) implements HolidayProvider
    {
        /**
         * @param  array<int, HolidayData>  $holidays
         */
        public function __construct(private readonly array $holidays) {}

        /**
         * @return array<int, HolidayData>
         */
        public function fetch(int $year, ?Province $province): array
        {
            return $this->holidays;
        }
    };
}

/**
 * Binds the given provider into the container and resolves the action
 * through it, so the action is exercised against `HolidayProvider`'s
 * contract rather than a concrete HTTP client.
 */
function syncAction(HolidayProvider $provider): SyncOrganizationHolidaysAction
{
    app()->instance(HolidayProvider::class, $provider);

    return app(SyncOrganizationHolidaysAction::class);
}

// --- CalendariosNacionalesService (the HTTP adapter) ---

test('without a province, only the national endpoint is requested and its entries map to HolidayData', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026.json' => Http::response([
            ['date' => '2026-01-01', 'name' => 'Año Nuevo'],
            ['date' => '2026-05-01', 'name' => 'Día del Trabajador'],
        ]),
    ]);

    $service = app(CalendariosNacionalesService::class);
    $holidays = $service->fetch(2026, null);

    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request->url() === 'https://calendariosnacionales.com/ar/v1/2026.json');

    expect($holidays)->toHaveCount(2);
    expect($holidays[0]->date)->toBeInstanceOf(CarbonImmutable::class);
    expect($holidays[0]->date->toDateString())->toBe('2026-01-01');
    expect($holidays[0]->name)->toBe('Año Nuevo');
    expect($holidays[1]->date->toDateString())->toBe('2026-05-01');
    expect($holidays[1]->name)->toBe('Día del Trabajador');
});

test('with a province, the provincial path uses the enum backing slug and results include both national and provincial entries', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026.json' => Http::response([
            ['date' => '2026-01-01', 'name' => 'Año Nuevo'],
        ]),
        'calendariosnacionales.com/ar/v1/2026/provincias/la-rioja.json' => Http::response([
            ['date' => '2026-06-15', 'name' => 'Aniversario de La Rioja'],
        ]),
    ]);

    $service = app(CalendariosNacionalesService::class);
    $holidays = $service->fetch(2026, Province::LaRioja);

    Http::assertSent(fn ($request) => $request->url() === 'https://calendariosnacionales.com/ar/v1/2026/provincias/la-rioja.json');

    $dates = collect($holidays)
        ->map(fn (HolidayData $holiday) => $holiday->date->toDateString())
        ->sort()
        ->values()
        ->all();
    expect($dates)->toBe(['2026-01-01', '2026-06-15']);
});

test('a 404 on the provincial path degrades to national-only without throwing', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026.json' => Http::response([
            ['date' => '2026-01-01', 'name' => 'Año Nuevo'],
        ]),
        'calendariosnacionales.com/ar/v1/2026/provincias/la-rioja.json' => Http::response(null, 404),
    ]);

    $service = app(CalendariosNacionalesService::class);
    $holidays = $service->fetch(2026, Province::LaRioja);

    expect($holidays)->toHaveCount(1);
    expect($holidays[0]->date->toDateString())->toBe('2026-01-01');
});

test('a 500 response or a connection failure throws HolidayProviderUnavailableException', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026.json' => Http::response(null, 500),
    ]);
    $service = app(CalendariosNacionalesService::class);
    expect(fn () => $service->fetch(2026, null))->toThrow(HolidayProviderUnavailableException::class);

    Http::fake([
        'calendariosnacionales.com/ar/v1/2026.json' => Http::failedConnection(),
    ]);
    expect(fn () => $service->fetch(2026, null))->toThrow(HolidayProviderUnavailableException::class);
});

test('a malformed payload throws HolidayProviderUnavailableException rather than a generic error', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026.json' => Http::response('not-json', 200),
    ]);

    $service = app(CalendariosNacionalesService::class);

    expect(fn () => $service->fetch(2026, null))->toThrow(HolidayProviderUnavailableException::class);
});

// --- SyncOrganizationHolidaysAction ---

test('creates holidays rows with source=auto for the organization and year the dto names', function () {
    $organization = Organization::factory()->create(['province' => Province::LaRioja]);
    $provider = fakeHolidayProvider([
        new HolidayData(CarbonImmutable::parse('2026-01-01'), 'Año Nuevo'),
        new HolidayData(CarbonImmutable::parse('2026-05-25'), 'Día de la Revolución de Mayo'),
    ]);

    syncAction($provider)->handle(new HolidaySyncData(organizationId: $organization->id, year: 2026));

    $holidays = Holiday::query()->where('organization_id', $organization->id)->get();
    expect($holidays)->toHaveCount(2);
    expect($holidays->pluck('source')->unique()->all())->toBe([HolidaySource::Auto]);
    $dates = $holidays->pluck('date')->map(fn (CarbonImmutable $date) => $date->toDateString())->sort()->values()->all();
    expect($dates)->toBe(['2026-01-01', '2026-05-25']);
});

test('an existing manual holiday for a date the provider also returns survives untouched', function () {
    $organization = Organization::factory()->create();
    $manual = Holiday::factory()->manual()->create([
        'organization_id' => $organization->id,
        'date' => '2026-01-01',
        'name' => 'Feriado local',
    ]);
    $provider = fakeHolidayProvider([
        new HolidayData(CarbonImmutable::parse('2026-01-01'), 'Año Nuevo (provider)'),
    ]);

    syncAction($provider)->handle(new HolidaySyncData(organizationId: $organization->id, year: 2026));

    $holidays = Holiday::query()->where('organization_id', $organization->id)->where('date', '2026-01-01')->get();
    expect($holidays)->toHaveCount(1);

    $manual->refresh();
    expect($manual->name)->toBe('Feriado local');
    expect($manual->source)->toBe(HolidaySource::Manual);
});

test('an existing auto holiday for a date the provider returns again is updated in place, not duplicated', function () {
    $organization = Organization::factory()->create();
    Holiday::factory()->create([
        'organization_id' => $organization->id,
        'date' => '2026-01-01',
        'name' => 'Old name',
        'source' => HolidaySource::Auto,
    ]);
    $provider = fakeHolidayProvider([
        new HolidayData(CarbonImmutable::parse('2026-01-01'), 'New name'),
    ]);

    syncAction($provider)->handle(new HolidaySyncData(organizationId: $organization->id, year: 2026));

    $holidays = Holiday::query()->where('organization_id', $organization->id)->where('date', '2026-01-01')->get();
    expect($holidays)->toHaveCount(1);
    expect($holidays->first()->name)->toBe('New name');
    expect($holidays->first()->source)->toBe(HolidaySource::Auto);
});

test('syncing one organization creates or alters no rows for another organization', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();
    $existingB = Holiday::factory()->create([
        'organization_id' => $organizationB->id,
        'date' => '2026-01-01',
        'name' => 'Unrelated',
    ]);
    $provider = fakeHolidayProvider([
        new HolidayData(CarbonImmutable::parse('2026-01-01'), 'Año Nuevo'),
    ]);

    syncAction($provider)->handle(new HolidaySyncData(organizationId: $organizationA->id, year: 2026));

    expect(Holiday::query()->where('organization_id', $organizationB->id)->count())->toBe(1);
    $existingB->refresh();
    expect($existingB->name)->toBe('Unrelated');
});

// --- holidays:sync command ---

test('a single run syncs every organization', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();
    app()->instance(HolidayProvider::class, fakeHolidayProvider([
        new HolidayData(CarbonImmutable::parse('2026-01-01'), 'Año Nuevo'),
    ]));

    $this->artisan('holidays:sync', ['--year' => 2026])->assertSuccessful();

    expect(Holiday::query()->where('organization_id', $organizationA->id)->count())->toBe(1);
    expect(Holiday::query()->where('organization_id', $organizationB->id)->count())->toBe(1);
});

test('if the provider fails for one organization the rest still sync and the command finishes without an uncaught exception', function () {
    $failingOrganization = Organization::factory()->create(['province' => Province::LaRioja]);
    $okOrganization = Organization::factory()->create(['province' => null]);

    $provider = new class implements HolidayProvider
    {
        /**
         * @return array<int, HolidayData>
         */
        public function fetch(int $year, ?Province $province): array
        {
            if ($province === Province::LaRioja) {
                throw new HolidayProviderUnavailableException('https://fake-provider.test');
            }

            return [new HolidayData(CarbonImmutable::parse('2026-01-01'), 'Año Nuevo')];
        }
    };
    app()->instance(HolidayProvider::class, $provider);

    $this->artisan('holidays:sync', ['--year' => 2026])->assertSuccessful();

    expect(Holiday::query()->where('organization_id', $failingOrganization->id)->count())->toBe(0);
    expect(Holiday::query()->where('organization_id', $okOrganization->id)->count())->toBe(1);
});
