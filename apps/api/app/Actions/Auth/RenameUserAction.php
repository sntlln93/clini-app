<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\UserRenameData;
use App\Models\User;

/**
 * Support's rename of a clinic user (#417, `user:rename`): the only way an account with a DNI changes the name the
 * registry gave it.
 *
 * @implements Action<UserRenameData>
 */
class RenameUserAction implements Action
{
    /**
     * @param  UserRenameData  $dto
     */
    public function handle(Data $dto): User
    {
        $user = User::query()->findOrFail($dto->userId);
        $user->forceFill(['name' => $dto->name])->save();

        return $user;
    }
}
