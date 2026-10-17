<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Organizations\OrganizationSetupProgressData;
use App\Models\Membership;
use Illuminate\Database\Eloquent\Builder;

/**
 * Derives a practice's setup progress from its data (#286), with no state of
 * its own: an organization that predates the checklist reads as done when it
 * already has what the steps ask for.
 */
final class OrganizationSetup
{
    public function progress(int $organizationId): OrganizationSetupProgressData
    {
        return new OrganizationSetupProgressData(
            hasProfessional: $this->professionals($organizationId)->exists(),
            hasService: $this->professionals($organizationId)
                ->whereHas('services', fn (Builder $query) => $query->where('professional_services.active', true))
                ->exists(),
            hasAvailability: $this->professionals($organizationId)
                ->whereHas('availabilities', fn (Builder $query) => $query->withoutGlobalScope('organization'))
                ->exists(),
        );
    }

    /**
     * @return Builder<Membership>
     */
    private function professionals(int $organizationId): Builder
    {
        return Membership::withoutGlobalScope('organization')
            ->where('organization_id', $organizationId)
            ->activeProfessional();
    }
}
