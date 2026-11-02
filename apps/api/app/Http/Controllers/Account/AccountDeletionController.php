<?php

declare(strict_types=1);

namespace App\Http\Controllers\Account;

use App\Actions\Account\RequestAccountDeletionAction;
use App\Data\Account\AccountDeletionRequestData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\StoreAccountDeletionRequest;
use App\Http\Resources\Account\AccountDeletionRequestResource;
use App\Models\User;
use Illuminate\Auth\SessionGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * The signed-in user's own account deletion (#384, ADR 0034), from Ajustes › Protección de datos.
 */
class AccountDeletionController extends Controller
{
    public function store(StoreAccountDeletionRequest $request, RequestAccountDeletionAction $action): JsonResponse
    {
        /** @var SessionGuard $guard */
        $guard = Auth::guard('web');

        /** @var User $user */
        $user = $guard->user();

        $deletion = $action->handle(new AccountDeletionRequestData(
            user: $user,
            code: $request->code(),
            recoveryCode: $request->recoveryCode(),
        ));

        // A new hash of the same password ends every other session of the account (Sanctum's `AuthenticateSession`);
        // logging in again is what cancels the request.
        $guard->logoutOtherDevices($request->string('password')->toString());
        $guard->logout();

        // As in `AuthController::logout`: an operator sharing the browser session keeps theirs (ADR 0010).
        if (Auth::guard('admin')->check()) {
            $request->session()->forget('password_hash_web');
            $request->session()->regenerate(true);
        } else {
            $request->session()->invalidate();
        }

        $request->session()->regenerateToken();

        return (new AccountDeletionRequestResource($deletion))->response()->setStatusCode(202);
    }
}
