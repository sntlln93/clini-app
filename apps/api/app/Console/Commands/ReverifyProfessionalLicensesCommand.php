<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Professionals\VerifyProfessionalLicensesAction;
use App\Contracts\ProfessionalRegistry;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Models\ProfessionalLicense;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Sleep;

/**
 * Runs from the scheduler once a day (routes/console.php). A license can be suspended or withdrawn at any time, so
 * every professional with a license the registry hasn't answered about in `ProfessionalLicense::REVERIFY_AFTER_DAYS`
 * is looked up again (#380, ADR 0032), oldest attempt first, so a DNI whose lookup keeps failing goes to the back
 * instead of holding everyone else. A license that stops being backed turns «no coincide» and the professional sees it;
 * nothing is blocked. The registry isn't ours to load: at most `services.national_professional_search.per_run` lookups
 * a run, a pause between them, and the run stops as soon as the registry is off or failing.
 */
#[Description('Checks professionals\' licenses again against the national registry')]
#[Signature('professionals:reverify-licenses')]
class ReverifyProfessionalLicensesCommand extends Command
{
    public function handle(ProfessionalRegistry $registry, VerifyProfessionalLicensesAction $action): int
    {
        $userIds = ProfessionalLicense::query()
            ->dueForReverification()
            ->whereHas('user', fn ($query) => $query->whereNotNull('document_number'))
            ->groupBy('user_id')
            ->orderByRaw('min(attempted_at) asc nulls first')
            ->orderBy('user_id')
            ->limit(Config::integer('services.national_professional_search.per_run'))
            ->get(['user_id'])
            ->map(fn (ProfessionalLicense $license): int => $license->user_id);

        foreach ($userIds as $index => $userId) {
            if (! $registry->available()) {
                break;
            }

            if ($index > 0) {
                Sleep::for(1)->second();
            }

            $action->handle(new ProfessionalLicenseVerificationData($userId));
        }

        return self::SUCCESS;
    }
}
