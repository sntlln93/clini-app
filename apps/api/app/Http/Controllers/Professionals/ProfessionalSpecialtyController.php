<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\AssignProfessionalSpecialtyAction;
use App\Data\Professionals\ProfessionalSpecialtyAssignmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Professionals\StoreProfessionalSpecialtyRequest;
use App\Http\Resources\Professionals\ProfessionalSpecialtyResource;
use App\Models\Membership;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ProfessionalSpecialtyController extends Controller
{
    public function index(Membership $membership): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [ProfessionalSpecialty::class, $membership]);

        $professionalSpecialties = ProfessionalSpecialty::query()
            ->where('membership_id', $membership->id)
            ->with('specialty')
            ->get();

        return ProfessionalSpecialtyResource::collection($professionalSpecialties);
    }

    public function store(
        StoreProfessionalSpecialtyRequest $request,
        Membership $membership,
        AssignProfessionalSpecialtyAction $action
    ): JsonResponse {
        Gate::authorize('create', [ProfessionalSpecialty::class, $membership]);

        $dto = new ProfessionalSpecialtyAssignmentData(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            userId: $membership->user_id,
            specialtyId: $request->integer('specialty_id'),
        );

        $professionalSpecialty = $action->handle($dto);

        return (new ProfessionalSpecialtyResource($professionalSpecialty->load('specialty')))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Membership $membership, Specialty $specialty): Response
    {
        $professionalSpecialty = ProfessionalSpecialty::query()
            ->where('membership_id', $membership->id)
            ->where('specialty_id', $specialty->id)
            ->first() ?? new ProfessionalSpecialty([
                'organization_id' => $membership->organization_id,
                'membership_id' => $membership->id,
            ]);

        Gate::authorize('delete', $professionalSpecialty);

        if ($professionalSpecialty->exists) {
            $professionalSpecialty->delete();
        }

        return response()->noContent();
    }
}
