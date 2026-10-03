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
 * Runs from the scheduler once a month (routes/console.php). Syncs the
 * shared holiday catalog for the given (or current) year: national first —
 * provincial entries on national dates are skipped — then every one of the
 * 24 provinces, not only those organizations reference today, so an
 * organization that moves to a new province is covered without waiting for
 * the next run. Each scope is fetched once; a provider failure for one is
 * logged and skipped, never aborting the whole run.
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
