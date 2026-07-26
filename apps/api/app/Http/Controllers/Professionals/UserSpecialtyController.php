<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Actions\Professionals\AssignUserSpecialtyAction;
use App\Data\Professionals\UserSpecialtyAssignmentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Professionals\StoreUserSpecialtyRequest;
use App\Http\Resources\Professionals\UserSpecialtyResource;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class UserSpecialtyController extends Controller
{
    public function index(User $user): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [UserSpecialty::class, $user]);

        $userSpecialties = UserSpecialty::query()
            ->where('user_id', $user->id)
            ->with('specialty')
            ->get();

        return UserSpecialtyResource::collection($userSpecialties);
    }

    public function store(
        StoreUserSpecialtyRequest $request,
        User $user,
        AssignUserSpecialtyAction $action
    ): JsonResponse {
        Gate::authorize('create', [UserSpecialty::class, $user]);

        $dto = new UserSpecialtyAssignmentData(
            userId: $user->id,
            specialtyId: $request->integer('specialty_id'),
        );

        $userSpecialty = $action->handle($dto);

        return (new UserSpecialtyResource($userSpecialty->load('specialty')))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(User $user, Specialty $specialty): Response
    {
        Gate::authorize('delete', [UserSpecialty::class, $user]);

        UserSpecialty::query()
            ->where('user_id', $user->id)
            ->where('specialty_id', $specialty->id)
            ->delete();

        return response()->noContent();
    }
}
