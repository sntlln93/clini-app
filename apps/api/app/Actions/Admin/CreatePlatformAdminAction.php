<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\PlatformAdminRegistrationData;
use App\Models\PlatformAdmin;

/**
 * Creates a platform operator (the `password` cast hashes it). Input,
 * including email uniqueness, is validated by `admin:create` beforehand.
 *
 * @implements Action<PlatformAdminRegistrationData>
 */
class CreatePlatformAdminAction implements Action
{
    /**
     * @param  PlatformAdminRegistrationData  $dto
     */
    public function handle(Data $dto): PlatformAdmin
    {
        return PlatformAdmin::query()->create([
            'name' => $dto->name,
            'email' => $dto->email,
            'password' => $dto->password,
        ]);
    }
}
