<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\VerifyUserEmailManuallyAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\ManualEmailVerificationData;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminUserDetailResource;
use App\Models\PlatformAdmin;
use App\Models\User;
use Illuminate\Http\Request;

class UserEmailVerificationController extends Controller
{
    public function store(Request $request, User $user, VerifyUserEmailManuallyAction $action): AdminUserDetailResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $action->handle(new ManualEmailVerificationData(
            actor: new AdminActorData($admin->id, $request->ip()),
            userId: $user->id,
        ));

        return new AdminUserDetailResource(User::query()->withAdminDetail()->findOrFail($user->id));
    }
}
