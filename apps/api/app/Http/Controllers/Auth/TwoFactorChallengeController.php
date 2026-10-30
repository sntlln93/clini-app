<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\VerifyTwoFactorChallengeAction;
use App\Data\Auth\TwoFactorChallengeData;
use App\Exceptions\Auth\TwoFactorChallengeExpiredException;
use App\Exceptions\Auth\UserBlockedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\TwoFactorChallengeRequest;
use App\Http\Resources\Auth\SessionUserResource;
use App\Support\PendingTwoFactorLogin;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * The login's second step (#357): completes the login `AuthController::login`
 * left pending once the password matched.
 */
class TwoFactorChallengeController extends Controller
{
    public function store(TwoFactorChallengeRequest $request, VerifyTwoFactorChallengeAction $action): JsonResponse
    {
        $user = PendingTwoFactorLogin::user($request);

        if ($user === null) {
            PendingTwoFactorLogin::clear($request);

            throw new TwoFactorChallengeExpiredException;
        }

        // Blocked by an operator after the password step.
        if ($user->isBlocked()) {
            PendingTwoFactorLogin::clear($request);

            throw new UserBlockedException($user->id);
        }

        $user = $action->handle(new TwoFactorChallengeData(
            user: $user,
            code: $request->code(),
            recoveryCode: $request->recoveryCode(),
        ));

        PendingTwoFactorLogin::clear($request);
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new SessionUserResource($user))->response();
    }
}
