<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\ProfessionalDocumentResetData;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Takes a professional's DNI and every license looked up with it away (#387, ADR 0038), so they load their DNI again.
 * What the practices offer them with stays, without the backing of a license, until they add them again.
 *
 * @implements Action<ProfessionalDocumentResetData>
 */
class ResetProfessionalDocumentAction implements Action
{
    /**
     * @param  ProfessionalDocumentResetData  $dto
     */
    public function handle(Data $dto): null
    {
        DB::transaction(function () use ($dto): void {
            $user = User::query()->whereKey($dto->userId)->lockForUpdate()->firstOrFail();
            $user->forceFill(['document_number' => null, 'document_checked_at' => null])->save();

            ProfessionalLicense::query()->where('user_id', $user->id)->delete();
        });

        return null;
    }
}
