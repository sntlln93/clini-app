<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ChangePasswordAction;
use App\Data\Auth\PasswordChangeData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * The signed-in user's own password (#389), from Ajustes › Seguridad.
 */
class PasswordController extends Controller
{
    public function update(UpdatePasswordRequest $request, ChangePasswordAction $action): JsonResponse
    {
        /** @var User $user */
        $user = Auth::guard('web')->user();

        $action->handle(new PasswordChangeData(
            user: $user,
            password: $request->string('password')->toString(),
        ));

        // This session stays signed in: Sanctum's `AuthenticateSession` stores the new hash in it once the response
        // is built, while every other session still holds the old one and is logged out on its next request. A new
        // id keeps a copy of the old cookie from riding along.
        $request->session()->regenerate();

        return response()->json(null, 204);
    }
}
