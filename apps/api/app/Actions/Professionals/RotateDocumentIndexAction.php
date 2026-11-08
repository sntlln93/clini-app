<?php

declare(strict_types=1);

namespace App\Actions\Professionals;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Professionals\DocumentIndexRotationData;
use App\Models\User;
use App\Support\DocumentIndex;
use Illuminate\Support\Facades\DB;

/**
 * Recomputes every account's DNI blind index with the current key (#417), decrypting each DNI. One transaction, with
 * every row that has a DNI locked: the table never holds indexes of both keys at once, and a DNI loaded meanwhile waits
 * for it. Answers how many it recomputed.
 *
 * @implements Action<DocumentIndexRotationData>
 */
class RotateDocumentIndexAction implements Action
{
    /**
     * @param  DocumentIndexRotationData  $dto
     */
    public function handle(Data $dto): int
    {
        return DB::transaction(function (): int {
            $users = User::query()->whereNotNull('document_number')->orderBy('id')->lockForUpdate()->get(['id', 'document_number']);

            foreach ($users as $user) {
                $documentNumber = $user->document_number;

                if (is_string($documentNumber)) {
                    User::query()->whereKey($user->id)->update(['document_number_index' => DocumentIndex::of($documentNumber)]);
                }
            }

            return $users->count();
        });
    }
}
