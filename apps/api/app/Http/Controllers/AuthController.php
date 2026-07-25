<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Actions\RegisterOrganizationOwner;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
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

    public function register(RegisterRequest $request, RegisterOrganizationOwner $action): JsonResponse
    {
        $user = $action->execute(
            name: $request->string('name')->toString(),
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
            organizationName: $request->string('organization_name')->toString(),
            timezone: $request->string('timezone')->toString(),
        );

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
}
