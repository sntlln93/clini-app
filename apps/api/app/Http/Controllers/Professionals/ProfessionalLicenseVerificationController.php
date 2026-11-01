<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\VerifyProfessionalLicensesAction;
use App\Data\Professionals\ProfessionalLicenseVerificationData;
use App\Http\Controllers\Controller;
use App\Http\Resources\Professionals\ProfessionalLicenseResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Checks the caller's licenses again (#380), as when the registry didn't answer the first time. A registry that is off
 * or failing answers `professionals.registry_unavailable`, so the panel never says it asked when it didn't.
 */
class ProfessionalLicenseVerificationController extends Controller
{
    public function store(Request $request, VerifyProfessionalLicensesAction $action): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return ProfessionalLicenseResource::collection($action->handle(new ProfessionalLicenseVerificationData($user->id, strict: true)));
    }
}
