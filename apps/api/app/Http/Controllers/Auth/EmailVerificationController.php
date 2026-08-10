<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\FindValidEmailVerificationUserAction;
use App\Actions\Auth\VerifyEmailAction;
use App\Data\Auth\EmailVerificationData;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Fully public (no auth:sanctum); every failure path returns the same
 * generic message regardless of cause.
 */
class EmailVerificationController extends Controller
{
    public function __construct(
        private readonly FindValidEmailVerificationUserAction $findValidUser,
    ) {}

    public function show(string $token): JsonResponse
    {
        $user = $this->findValidUser->handle(new EmailVerificationData($token));

        return response()->json([
            'email' => $user->email,
        ]);
    }

    public function store(Request $request, string $token, VerifyEmailAction $action): JsonResponse
    {
        $user = $action->handle(new EmailVerificationData($token));

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['message' => 'Correo confirmado.']);
    }
}
