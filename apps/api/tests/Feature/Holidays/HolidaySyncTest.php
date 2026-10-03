<?php

declare(strict_types=1);

use App\Actions\Holidays\SyncHolidayCatalogAction;
use App\Contracts\HolidayProvider;
use App\Data\Holidays\HolidayData;
use App\Data\Holidays\HolidaySyncData;
use App\Enums\Province;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;
use App\Models\City;
use App\Models\Holiday;
use App\Models\Organization;
use App\Models\OrganizationHoliday;
use App\Services\Holidays\CalendariosNacionalesService;
use Carbon\CarbonImmutable;
use Database\Factories\CityFactory;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Http;

/**
 * A stub `HolidayProvider` returning, per scope, the holidays listed under
 * its key: `national` for a `null` province, the province's slug otherwise.
 * A scope with no key returns no holidays; one whose value is `'fail'`
 * throws as the real adapter does on an outage. Every requested scope is
 * appended to `$calls`, when given, so tests can assert each scope is
 * fetched once.
 *
 * @param  array<string, array<int, HolidayData>|string>  $byScope
 * @param  ArrayObject<int, string>|null  $calls
 */
function fakeHolidayProvider(array $byScope, ?ArrayObject $calls = null): HolidayProvider
{
    return new class($byScope, $calls ?? new ArrayObject) implements HolidayProvider
    {
        /**
         * @param  array<string, array<int, HolidayData>|string>  $byScope
         * @param  ArrayObject<int, string>  $calls
         */
        public function __construct(
            private readonly array $byScope,
            private readonly ArrayObject $calls,
        ) {}

        /**
         * @return array<int, HolidayData>
         */
        public function fetch(int $year, ?Province $province): array
        {
            $scope = $province === null ? 'national' : $province->value;
            $this->calls->append($scope);
            $holidays = $this->byScope[$scope] ?? [];

            if ($holidays === 'fail') {
                throw new HolidayProviderUnavailableException('https://fake-provider.test');
            }

            return $holidays;
        }
    };
}

/**
 * Binds `$provider` as the container's `HolidayProvider` and resolves the
 * action through it, so the action is exercised against `HolidayProvider`'s
 * contract rather than the HTTP adapter.
 */
function syncAction(HolidayProvider $provider): SyncHolidayCatalogAction
{
    app()->instance(HolidayProvider::class, $provider);

    return app(SyncHolidayCatalogAction::class);
}

function holiday(string $date, string $name): HolidayData
{
    return new HolidayData(CarbonImmutable::parse($date), $name);
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

test('with a province, only the provincial path is requested, using the enum backing slug', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026/provincias/la-rioja.json' => Http::response([
            ['date' => '2026-06-15', 'name' => 'Aniversario de La Rioja'],
        ]),
    ]);

    $service = app(CalendariosNacionalesService::class);
    $holidays = $service->fetch(2026, Province::LaRioja);

    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request->url() === 'https://calendariosnacionales.com/ar/v1/2026/provincias/la-rioja.json');

    expect($holidays)->toHaveCount(1);
    expect($holidays[0]->date->toDateString())->toBe('2026-06-15');
});

test('a 404 on the provincial path means no provincial holidays, without throwing', function () {
    Http::fake([
        'calendariosnacionales.com/ar/v1/2026/provincias/la-rioja.json' => Http::response(null, 404),
    ]);

    $service = app(CalendariosNacionalesService::class);

    expect($service->fetch(2026, Province::LaRioja))->toBe([]);
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

// --- SyncHolidayCatalogAction ---

test('a national sync stores catalog rows with no province', function () {
    $provider = fakeHolidayProvider(['national' => [
        holiday('2026-01-01', 'Año Nuevo'),
        holiday('2026-05-25', 'Día de la Revolución de Mayo'),
    ]]);

    syncAction($provider)->handle(new HolidaySyncData(year: 2026, province: null));

    $holidays = Holiday::query()->orderBy('date')->get();
    expect($holidays)->toHaveCount(2);
    expect($holidays->pluck('province_id')->unique()->all())->toBe([null]);
    expect($holidays->map(fn (Holiday $holiday) => $holiday->date->toDateString())->all())->toBe(['2026-01-01', '2026-05-25']);
});

test('a provincial sync stores its rows under that province', function () {
    $provider = fakeHolidayProvider([Province::LaRioja->value => [holiday('2026-06-15', 'Aniversario de La Rioja')]]);

    syncAction($provider)->handle(new HolidaySyncData(year: 2026, province: Province::LaRioja));

    $holiday = Holiday::query()->sole();
    expect($holiday->province_id)->toBe(CityFactory::provinceId(Province::LaRioja));
    expect($holiday->date->toDateString())->toBe('2026-06-15');
});

test('a re-run is idempotent: existing catalog rows are updated in place, not duplicated', function () {
    syncAction(fakeHolidayProvider(['national' => [holiday('2026-01-01', 'Old name')]]))
        ->handle(new HolidaySyncData(year: 2026, province: null));

    syncAction(fakeHolidayProvider(['national' => [holiday('2026-01-01', 'New name')]]))
        ->handle(new HolidaySyncData(year: 2026, province: null));

    $holiday = Holiday::query()->sole();
    expect($holiday->name)->toBe('New name');
});

test('the same date can exist once nationally and once per province, never twice in one scope', function () {
    Holiday::factory()->create(['date' => '2026-06-15', 'name' => 'National']);
    Holiday::factory()->inProvince(Province::LaRioja)->create(['date' => '2026-06-15', 'name' => 'La Rioja']);
    Holiday::factory()->inProvince(Province::Cordoba)->create(['date' => '2026-06-15', 'name' => 'Córdoba']);

    expect(fn () => Holiday::factory()->create(['date' => '2026-06-15']))
        ->toThrow(UniqueConstraintViolationException::class);
});

test('a provincial entry on a date the national catalog already holds is not stored again', function () {
    Holiday::factory()->create(['date' => '2026-01-01', 'name' => 'Año Nuevo']);
    $provider = fakeHolidayProvider([Province::LaRioja->value => [
        holiday('2026-01-01', 'Año Nuevo'),
        holiday('2026-06-15', 'Aniversario de La Rioja'),
    ]]);

    syncAction($provider)->handle(new HolidaySyncData(year: 2026, province: Province::LaRioja));

    expect(Holiday::query()->count())->toBe(2);
    expect(Holiday::query()->whereNotNull('province_id')->sole()->date->toDateString())->toBe('2026-06-15');
});

test('a payload repeating a date keeps a single row instead of failing the upsert', function () {
    $provider = fakeHolidayProvider(['national' => [
        holiday('2026-01-01', 'First'),
        holiday('2026-01-01', 'Second'),
    ]]);

    syncAction($provider)->handle(new HolidaySyncData(year: 2026, province: null));

    expect(Holiday::query()->sole()->name)->toBe('Second');
});

test('the sync never touches an organization own holiday on the same date', function () {
    $manual = OrganizationHoliday::factory()->create(['date' => '2026-01-01', 'name' => 'Cierre propio']);

    syncAction(fakeHolidayProvider(['national' => [holiday('2026-01-01', 'Año Nuevo')]]))
        ->handle(new HolidaySyncData(year: 2026, province: null));

    expect(OrganizationHoliday::query()->sole()->is($manual))->toBeTrue();
    expect(OrganizationHoliday::query()->sole()->name)->toBe('Cierre propio');
});

// --- holidays:sync command ---

test('a run fetches national and every province once each, however many organizations share them', function () {
    $city = City::factory()->inProvince(Province::LaRioja)->create();
    Organization::factory()->inCity($city)->create();
    Organization::factory()->inCity($city)->create();
    Organization::factory()->inProvince(Province::LaRioja)->create();
    /** @var ArrayObject<int, string> $recorded */
    $recorded = new ArrayObject;
    app()->instance(HolidayProvider::class, fakeHolidayProvider([
        'national' => [holiday('2026-01-01', 'Año Nuevo')],
        Province::LaRioja->value => [holiday('2026-06-15', 'Aniversario de La Rioja')],
    ], $recorded));

    $this->artisan('holidays:sync', ['--year' => 2026])->assertSuccessful();

    $calls = $recorded->getArrayCopy();
    expect($calls)->toHaveCount(1 + count(Province::cases()));
    expect(array_unique($calls))->toHaveCount(count($calls));
    expect($calls[0])->toBe('national');
    // One row per scope, not one per organization.
    expect(Holiday::query()->count())->toBe(2);
});

test('if the provider fails for one scope the rest still sync and the command finishes without an uncaught exception', function () {
    app()->instance(HolidayProvider::class, fakeHolidayProvider([
        'national' => [holiday('2026-01-01', 'Año Nuevo')],
        Province::LaRioja->value => 'fail',
        Province::Cordoba->value => [holiday('2026-07-06', 'Feriado de Córdoba')],
    ]));

    $this->artisan('holidays:sync', ['--year' => 2026])->assertSuccessful();

    expect(Holiday::query()->whereNull('province_id')->count())->toBe(1);
    expect(Holiday::query()->where('province_id', CityFactory::provinceId(Province::LaRioja))->count())->toBe(0);
    expect(Holiday::query()->where('province_id', CityFactory::provinceId(Province::Cordoba))->count())->toBe(1);
});
