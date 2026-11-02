<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\ResetPasswordAction;
use App\Actions\Auth\SendPasswordResetLinkAction;
use App\Data\Auth\PasswordResetData;
use App\Data\Auth\PasswordResetLinkRecipientData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\PasswordResetLinkRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use Illuminate\Http\Response;

/**
 * Recovering a forgotten password by mail (#389). Fully public; neither endpoint signs anyone in.
 */
class PasswordResetController extends Controller
{
    /**
     * Always the same answer, whether the address has an account or not.
     */
    public function store(PasswordResetLinkRequest $request, SendPasswordResetLinkAction $action): Response
    {
        $action->handle(new PasswordResetLinkRecipientData($request->string('email')->toString()));

        return response()->noContent(202);
    }

    public function update(ResetPasswordRequest $request, ResetPasswordAction $action): Response
    {
        $action->handle(new PasswordResetData(
            email: $request->string('email')->toString(),
            token: $request->string('token')->toString(),
            password: $request->string('password')->toString(),
        ));

        return response()->noContent();
    }
}
