<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Holidays\SyncOrganizationHolidaysAction;
use App\Data\Holidays\HolidaySyncData;
use App\Exceptions\Holidays\HolidayProviderUnavailableException;
use App\Models\Organization;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Runs from the scheduler once a month (routes/console.php). Syncs every
 * organization's holidays for the given (or current) year; a provider
 * failure for one organization is logged and skipped, never aborting the
 * whole run.
 */
class SyncHolidaysCommand extends Command
{
    protected $signature = 'holidays:sync {--year=}';

    protected $description = "Syncs every organization's holidays for a year from the external provider";

    public function handle(SyncOrganizationHolidaysAction $action): int
    {
        $yearOption = $this->option('year');
        $year = $yearOption !== null ? (int) $yearOption : (int) now()->format('Y');

        Organization::query()->each(function (Organization $organization) use ($action, $year): void {
            $this->syncOrganization($action, $organization, $year);
        });

        return self::SUCCESS;
    }

    private function syncOrganization(SyncOrganizationHolidaysAction $action, Organization $organization, int $year): void
    {
        try {
            $action->handle(new HolidaySyncData(
                organizationId: $organization->id,
                year: $year,
            ));
        } catch (HolidayProviderUnavailableException $exception) {
            Log::error($exception->getMessage(), $exception->logContext());
        }
    }
}
