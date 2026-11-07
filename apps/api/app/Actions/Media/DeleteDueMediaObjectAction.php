<?php

declare(strict_types=1);

namespace App\Actions\Media;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Media\MediaObjectDeletionData;
use App\Models\MediaObjectDeletion;
use App\Support\MediaObjectDeletions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Deletes a due object and its pending row (#410). The row stays locked while the object is deleted, so an upload of
 * the same file, which cancels the row first (MediaObjectDeletions::cancel), writes its object only afterwards. An
 * object a live row names again is kept: only the pending row goes. A storage failure rolls the row back, for the
 * next run. Returns whether an object was deleted.
 *
 * @implements Action<MediaObjectDeletionData>
 */
class DeleteDueMediaObjectAction implements Action
{
    public function __construct(
        private readonly MediaObjectDeletions $deletions,
    ) {}

    /**
     * @param  MediaObjectDeletionData  $dto
     */
    public function handle(Data $dto): bool
    {
        return DB::transaction(function () use ($dto): bool {
            $deletion = MediaObjectDeletion::query()
                ->due()
                ->whereKey($dto->deletionId)
                ->lockForUpdate()
                ->first();

            if ($deletion === null) {
                return false;
            }

            $named = $this->deletions->isNamedByLiveRow($deletion->disk, $deletion->path);

            if (! $named) {
                Storage::disk($deletion->disk)->delete($deletion->path);
            }

            $deletion->delete();

            return ! $named;
        });
    }
}
