<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\IssueEmailVerificationAction;
use App\Actions\Auth\RegisterOrganizationOwnerAction;
use App\Data\Auth\EmailVerificationIssuanceData;
use App\Data\Auth\OrganizationOwnerRegistrationData;
use App\Exceptions\Auth\UserBlockedException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\SessionUserResource;
use App\Models\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        /** @var SessionGuard $guard */
        $guard = Auth::guard('web');

        // The callback only runs once the password matched, so a wrong
        // password on a blocked account still gets the plain 422 and never
        // discloses the account state.
        $authenticated = $guard->attemptWhen($request->validated(), function (User $user): bool {
            if ($user->blocked_at !== null) {
                throw new UserBlockedException($user->id);
            }

            return true;
        });

        if (! $authenticated) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $request->session()->regenerate();

        /** @var User $user */
        $user = Auth::guard('web')->user();

        return (new SessionUserResource($user))->response();
    }

    public function register(
        RegisterRequest $request,
        RegisterOrganizationOwnerAction $action,
        IssueEmailVerificationAction $issueEmailVerificationAction,
    ): JsonResponse {
        $dto = new OrganizationOwnerRegistrationData(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
            organizationName: $request->string('organization_name')->toString(),
            timezone: $request->string('timezone')->toString(),
        );

        $user = $action->handle($dto);

        $issueEmailVerificationAction->handle(new EmailVerificationIssuanceData($user));

        Auth::login($user);
        $request->session()->regenerate();

        return (new SessionUserResource($user))->response()->setStatusCode(201);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        // A platform operator may share this browser session (ADR 0010):
        // keep it alive and only drop the clinic login, including Sanctum's
        // stored password hash, which would otherwise flush the whole session
        // on the next clinic user's request.
        if (Auth::guard('admin')->check()) {
            $request->session()->forget('password_hash_web');
            // `true` destroys the old session record, so a copy of the
            // pre-logout cookie no longer carries the clinic login.
            $request->session()->regenerate(true);
        } else {
            $request->session()->invalidate();
        }

        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }

    public function me(Request $request): SessionUserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new SessionUserResource($user);
    }
}
