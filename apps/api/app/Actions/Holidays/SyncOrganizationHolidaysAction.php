<?php

declare(strict_types=1);

namespace App\Actions\Holidays;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\HolidayProvider;
use App\Data\Holidays\HolidayData;
use App\Data\Holidays\HolidaySyncData;
use App\Enums\HolidaySource;
use App\Models\Holiday;
use App\Models\Organization;

/**
 * @implements Action<HolidaySyncData>
 */
final class SyncOrganizationHolidaysAction implements Action
{
    public function __construct(
        private readonly HolidayProvider $provider,
    ) {}

    /**
     * @param  HolidaySyncData  $dto
     */
    public function handle(Data $dto): int
    {
        $organization = Organization::query()->findOrFail($dto->organizationId);

        $holidays = $this->provider->fetch($dto->year, $organization->province);

        $manualDates = Holiday::query()
            ->where('organization_id', $organization->id)
            ->where('source', HolidaySource::Manual)
            ->get('date')
            ->map(fn (Holiday $holiday) => $holiday->date->toDateString())
            ->all();

        $rows = collect($holidays)
            ->reject(fn (HolidayData $holiday) => in_array($holiday->date->toDateString(), $manualDates, true))
            ->map(fn (HolidayData $holiday) => [
                'organization_id' => $organization->id,
                'date' => $holiday->date->toDateString(),
                'name' => $holiday->name,
                'source' => HolidaySource::Auto->value,
            ])
            ->all();

        if ($rows === []) {
            return 0;
        }

        return Holiday::query()->upsert($rows, ['organization_id', 'date'], ['name', 'source']);
    }
}
