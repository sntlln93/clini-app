<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\BlockUserAction;
use App\Actions\Admin\UnblockUserAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\UserBlockingData;
use App\Data\Admin\UserUnblockingData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BlockUserRequest;
use App\Http\Resources\Admin\AdminUserDetailResource;
use App\Models\PlatformAdmin;
use App\Models\User;
use Illuminate\Http\Request;

class UserBlockController extends Controller
{
    public function store(BlockUserRequest $request, User $user, BlockUserAction $action): AdminUserDetailResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $action->handle(new UserBlockingData(
            actor: new AdminActorData($admin->id, $request->ip()),
            userId: $user->id,
            reason: $request->string('reason')->toString(),
        ));

        return new AdminUserDetailResource(User::query()->withAdminDetail()->findOrFail($user->id));
    }

    public function destroy(Request $request, User $user, UnblockUserAction $action): AdminUserDetailResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        $action->handle(new UserUnblockingData(
            actor: new AdminActorData($admin->id, $request->ip()),
            userId: $user->id,
        ));

        return new AdminUserDetailResource(User::query()->withAdminDetail()->findOrFail($user->id));
    }
}
