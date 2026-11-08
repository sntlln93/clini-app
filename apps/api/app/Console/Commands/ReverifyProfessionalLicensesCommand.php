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
 * Oldest attempt first, so a DNI whose lookup keeps failing doesn't hold everyone else; capped and paced so as not to load the registry.
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
            ->limit(Config::integer('services.professional_registry.per_run'))
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
