<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Media\DeleteDueMediaObjectAction;
use App\Data\Media\MediaObjectDeletionData;
use App\Models\MediaObjectDeletion;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

/**
 * Each object in its own transaction, so one that fails is retried on the next run without holding the rest (#410).
 */
#[Description('Deletes the media objects whose deferred deletion is due')]
#[Signature('media:delete-due')]
class DeleteDueMediaObjectsCommand extends Command
{
    public function handle(DeleteDueMediaObjectAction $action): int
    {
        $deletions = MediaObjectDeletion::query()
            ->due()
            ->orderBy('deletes_at')
            ->get(['id']);

        foreach ($deletions as $deletion) {
            try {
                $action->handle(new MediaObjectDeletionData($deletion->id));
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        return self::SUCCESS;
    }
}
