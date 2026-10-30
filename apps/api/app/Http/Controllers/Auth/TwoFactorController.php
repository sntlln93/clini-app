<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ConfirmTwoFactorSetupAction;
use App\Actions\Auth\DisableTwoFactorAction;
use App\Actions\Auth\RegenerateTwoFactorRecoveryCodesAction;
use App\Actions\Auth\StartTwoFactorSetupAction;
use App\Data\Auth\TwoFactorAccountData;
use App\Data\Auth\TwoFactorConfirmationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ConfirmTwoFactorRequest;
use App\Http\Requests\Auth\TwoFactorPasswordRequest;
use App\Http\Resources\Auth\TwoFactorRecoveryCodesResource;
use App\Http\Resources\Auth\TwoFactorSetupResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * The signed-in user's own second factor (#357), from Ajustes.
 */
class TwoFactorController extends Controller
{
    public function store(TwoFactorPasswordRequest $request, StartTwoFactorSetupAction $action): JsonResponse
    {
        $secret = $action->handle(new TwoFactorAccountData($this->user()));

        return (new TwoFactorSetupResource($secret))->response()->setStatusCode(201);
    }

    public function confirm(ConfirmTwoFactorRequest $request, ConfirmTwoFactorSetupAction $action): TwoFactorRecoveryCodesResource
    {
        $codes = $action->handle(new TwoFactorConfirmationData($this->user(), $request->code()));

        return new TwoFactorRecoveryCodesResource($codes);
    }

    public function destroy(TwoFactorPasswordRequest $request, DisableTwoFactorAction $action): JsonResponse
    {
        $action->handle(new TwoFactorAccountData($this->user()));

        return response()->json(null, 204);
    }

    public function regenerateRecoveryCodes(
        TwoFactorPasswordRequest $request,
        RegenerateTwoFactorRecoveryCodesAction $action,
    ): TwoFactorRecoveryCodesResource {
        $codes = $action->handle(new TwoFactorAccountData($this->user()));

        return new TwoFactorRecoveryCodesResource($codes);
    }

    protected function user(): User
    {
        /** @var User $user */
        $user = Auth::guard('web')->user();

        return $user;
    }
}
