<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Holidays\SyncHolidayCatalogAction;
use App\Data\Holidays\HolidaySyncData;
use App\Enums\Province;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * National first (provincial entries on national dates are skipped), then every province, so a move needs no new run.
 */
class SyncHolidaysCommand extends Command
{
    protected $signature = 'holidays:sync {--year=}';

    protected $description = 'Syncs the national and provincial holiday catalog for a year from the external provider';

    public function handle(SyncHolidayCatalogAction $action): int
    {
        $yearOption = $this->option('year');
        $year = $yearOption !== null ? (int) $yearOption : (int) now()->format('Y');

        foreach ([null, ...Province::cases()] as $province) {
            $this->syncScope($action, $year, $province);
        }

        return self::SUCCESS;
    }

    private function syncScope(SyncHolidayCatalogAction $action, int $year, ?Province $province): void
    {
        try {
            $action->handle(new HolidaySyncData(year: $year, province: $province));
        } catch (HolidayProviderUnavailableException $exception) {
            Log::error($exception->getMessage(), $exception->logContext());
        }
    }
}
