<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\ChooseProfessionalLicenseAction;
use App\Data\Professionals\ProfessionalLicenseChoiceData;
use App\Http\Controllers\Controller;
use App\Http\Resources\Professionals\ProfessionalLicenseResource;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The caller's own licenses (#380): no user id in the URL. They come from the registry (#387): the professional only
 * adds to Clini, or takes out, the ones it holds for their DNI.
 */
class ProfessionalLicenseController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return ProfessionalLicenseResource::collection($user->professionalLicenses()->with('specialty')->orderBy('id')->get());
    }

    public function update(ProfessionalLicense $license, ChooseProfessionalLicenseAction $action): ProfessionalLicenseResource
    {
        Gate::authorize('update', $license);

        /** @var ProfessionalLicense $added */
        $added = $action->handle(new ProfessionalLicenseChoiceData($license->id, inClini: true));

        return new ProfessionalLicenseResource($added);
    }

    public function destroy(ProfessionalLicense $license, ChooseProfessionalLicenseAction $action): Response
    {
        Gate::authorize('delete', $license);

        $action->handle(new ProfessionalLicenseChoiceData($license->id, inClini: false));

        return response()->noContent();
    }
}
