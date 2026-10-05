<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\RecordAdminAuditAction;
use App\Actions\Admin\RecordPlatformAdminLoginAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\AdminAuditEntryData;
use App\Data\Admin\PlatformAdminLoginData;
use App\Enums\AdminAuditAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Resources\Admin\PlatformAdminResource;
use App\Models\PlatformAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Operator session on the `admin` guard. The browser session is shared with
 * the panel (ADR 0010): login regenerates the session id without
 * invalidating it, and logout only forgets the operator, so a clinic login
 * in the same browser survives both.
 */
class AuthController extends Controller
{
    public function login(LoginRequest $request, RecordPlatformAdminLoginAction $action): JsonResponse
    {
        if (! Auth::guard('admin')->attempt($request->validated())) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        $request->session()->regenerate();

        /** @var PlatformAdmin $admin */
        $admin = Auth::guard('admin')->user();

        $admin = $action->handle(new PlatformAdminLoginData(new AdminActorData($admin->id, $request->ip())));

        return (new PlatformAdminResource($admin))->response();
    }

    public function logout(Request $request, RecordAdminAuditAction $recordAudit): JsonResponse
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $recordAudit->handle(new AdminAuditEntryData(
            actor: new AdminActorData($admin->id, $request->ip()),
            action: AdminAuditAction::AuthLogout,
            subjectType: null,
            subjectId: null,
            metadata: [],
        ));

        Auth::guard('admin')->logout();
        // `true` destroys the old session record: a copy of the pre-logout
        // cookie must not stay logged in as the operator. The data (a clinic
        // login sharing the session) moves to the new id.
        $request->session()->regenerate(true);
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }

    public function me(Request $request): PlatformAdminResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        return new PlatformAdminResource($admin);
    }
}
