<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\RegisterOrganizationOwnerAction;
use App\Data\Auth\OrganizationOwnerRegistrationData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\Auth\SessionUserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->validated())) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $request->session()->regenerate();

        return response()->json(Auth::user());
    }

    public function register(RegisterRequest $request, RegisterOrganizationOwnerAction $action): JsonResponse
    {
        $dto = new OrganizationOwnerRegistrationData(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
            organizationName: $request->string('organization_name')->toString(),
            timezone: $request->string('timezone')->toString(),
        );

        $user = $action->handle($dto);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json($user, 201);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
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
