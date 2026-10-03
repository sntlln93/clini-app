<?php

declare(strict_types=1);

namespace App\Actions\Holidays;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\HolidayProvider;
use App\Data\Holidays\HolidayData;
use App\Data\Holidays\HolidaySyncData;
use App\Enums\Province as ProvinceSlug;
use App\Models\Holiday;
use App\Models\Province;
use Carbon\CarbonImmutable;

/**
 * Upserts one scope of the shared holiday catalog — national, or a single
 * province — for a year, once for every organization that scope applies
 * to. Idempotent: a re-run updates names in place on the catalog's
 * (date, province_id) key. Organizations' own closures live in
 * `organization_holidays`, which this never touches.
 *
 * @implements Action<HolidaySyncData>
 */
final class SyncHolidayCatalogAction implements Action
{
    public function __construct(
        private readonly HolidayProvider $provider,
    ) {}

    /**
     * @param  HolidaySyncData  $dto
     */
    public function handle(Data $dto): int
    {
        $provinceId = $this->provinceId($dto->province);

        $holidays = $this->withoutNationalDates(
            $this->provider->fetch($dto->year, $dto->province),
            $provinceId,
            $dto->year,
        );

        if ($holidays === []) {
            return 0;
        }

        $now = CarbonImmutable::now();
        $rows = [];

        // Keyed by date: a statement's ON CONFLICT can't touch the same row
        // twice, so a payload repeating a date keeps only its last entry.
        foreach ($holidays as $holiday) {
            $rows[$holiday->date->toDateString()] = [
                'date' => $holiday->date->toDateString(),
                'name' => $holiday->name,
                'province_id' => $provinceId,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return Holiday::query()->upsert(array_values($rows), ['date', 'province_id'], ['name', 'updated_at']);
    }

    private function provinceId(?ProvinceSlug $province): ?int
    {
        if ($province === null) {
            return null;
        }

        /** @var int $id */
        $id = Province::query()->where('slug', $province->value)->valueOrFail('id');

        return $id;
    }

    /**
     * A provincial entry on a date the national catalog already holds is
     * redundant — it applies to that province's organizations already — so
     * it isn't stored a second time.
     *
     * @param  array<int, HolidayData>  $holidays
     * @return array<int, HolidayData>
     */
    private function withoutNationalDates(array $holidays, ?int $provinceId, int $year): array
    {
        if ($provinceId === null || $holidays === []) {
            return $holidays;
        }

        $nationalDates = Holiday::query()
            ->whereNull('province_id')
            ->whereYear('date', $year)
            ->get(['date'])
            ->map(fn (Holiday $holiday): string => $holiday->date->toDateString())
            ->all();

        return array_values(array_filter(
            $holidays,
            fn (HolidayData $holiday): bool => ! in_array($holiday->date->toDateString(), $nationalDates, true),
        ));
    }
}
