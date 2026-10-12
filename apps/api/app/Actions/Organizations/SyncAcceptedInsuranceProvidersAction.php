<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\AcceptedInsuranceProviderSelectionData;
use App\Models\InsuranceProvider;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Collection;

/**
 * Replaces the whole selection: the submitted list is what the practice
 * accepts from now on, an empty one included.
 *
 * @implements Action<AcceptedInsuranceProviderSelectionData>
 */
class SyncAcceptedInsuranceProvidersAction implements Action
{
    /**
     * @param  AcceptedInsuranceProviderSelectionData  $dto
     * @return Collection<int, InsuranceProvider>
     */
    public function handle(Data $dto): Collection
    {
        $organization = Organization::query()->findOrFail($dto->organizationId);

        $organization->acceptedInsuranceProviders()->sync($dto->insuranceProviderIds);

        return $organization->acceptedInsuranceProviders()->orderBy('name')->get();
    }
}
