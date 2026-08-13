<?php

declare(strict_types=1);

namespace App\Actions\Holidays;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\HolidayProvider;
use App\Data\Holidays\HolidaySyncData;
use App\Enums\HolidaySource;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

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

        if ($holidays === []) {
            return 0;
        }

        $now = CarbonImmutable::now();
        $placeholders = [];
        $bindings = [];

        foreach ($holidays as $holiday) {
            $placeholders[] = '(?, ?, ?, ?, ?, ?)';
            $bindings = [
                ...$bindings,
                $organization->id,
                $holiday->date->toDateString(),
                $holiday->name,
                HolidaySource::Auto->value,
                $now,
                $now,
            ];
        }

        // Atomic upsert: the WHERE clause on DO UPDATE is what protects
        // manual rows — not a read of manual dates beforehand, which would
        // leave a TOCTOU window where a row inserted as `manual` between
        // that read and this write gets overwritten with source=auto.
        // `source` is intentionally left out of the SET list so an existing
        // `auto` row keeps its source, and a `manual` row (excluded by the
        // WHERE clause) never changes origin.
        return DB::affectingStatement(
            'insert into holidays (organization_id, date, name, source, created_at, updated_at) values '
                .implode(', ', $placeholders)
                .' on conflict (organization_id, date) do update set name = excluded.name, updated_at = excluded.updated_at where holidays.source <> ?',
            [...$bindings, HolidaySource::Manual->value]
        );
    }
}
