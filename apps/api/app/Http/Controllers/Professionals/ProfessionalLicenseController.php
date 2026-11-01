<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\RegisterProfessionalLicenseAction;
use App\Data\Professionals\ProfessionalLicenseRegistrationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Professionals\StoreProfessionalLicenseRequest;
use App\Http\Resources\Professionals\ProfessionalLicenseResource;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The caller's own licenses (#380): no user id in the URL.
 */
class ProfessionalLicenseController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();

        return ProfessionalLicenseResource::collection($user->professionalLicenses()->orderBy('id')->get());
    }

    public function store(StoreProfessionalLicenseRequest $request, RegisterProfessionalLicenseAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $license = $action->handle(new ProfessionalLicenseRegistrationData(
            userId: $user->id,
            number: $request->string('number')->toString(),
            province: $request->province(),
            profession: $request->profession(),
        ));

        return (new ProfessionalLicenseResource($license))->response()->setStatusCode(201);
    }

    public function destroy(ProfessionalLicense $license): Response
    {
        Gate::authorize('delete', $license);

        $license->delete();

        return response()->noContent();
    }
}
