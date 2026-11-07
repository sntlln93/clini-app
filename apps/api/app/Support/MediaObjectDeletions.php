<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\MediaObjectDeletion;
use App\Models\OrganizationLogo;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Objects of an uploaded-file disk are never deleted when a row stops naming them (#410): they are scheduled for
 * `config('filesystems.media_deletion_retention_days')` days later, so a database restored within the backups' PITR
 * window still finds them, and a removed file can be recovered. Keys come from the file's checksum, so uploading the
 * same file again names the same object: that cancels its pending deletion.
 *
 * A new table that names objects of a disk joins isNamedByLiveRow().
 */
final class MediaObjectDeletions
{
    /**
     * Called inside the transaction that stops naming the object, so the row and its deletion commit together.
     */
    public function schedule(string $disk, string $path): void
    {
        MediaObjectDeletion::query()->upsert(
            [[
                'disk' => $disk,
                'path' => $path,
                'deletes_at' => now()->addDays(config()->integer('filesystems.media_deletion_retention_days'))->utc(),
                'created_at' => now()->utc(),
                'updated_at' => now()->utc(),
            ]],
            ['disk', 'path'],
            ['deletes_at', 'updated_at'],
        );
    }

    /**
     * Called inside the transaction that names the object, before writing it. It holds the key's lock until that
     * transaction ends, so discardUnnamed() of a concurrent failed upload of the same file waits for it and then sees
     * its row. The delete waits for a `media:delete-due` run holding the pending row, so the object written next is
     * never the one that run deletes.
     */
    public function cancel(string $disk, string $path): void
    {
        $this->lockKey($disk, $path);
        MediaObjectDeletion::query()->where('disk', $disk)->where('path', $path)->delete();
    }

    /**
     * For an object written ahead of a transaction that failed: deleted right away unless a row (live or pending
     * deletion) names it, since the same key means the same file. Under the key's lock, so it never deletes the
     * object of a concurrent upload of the same file that is about to commit.
     */
    public function discardUnnamed(string $disk, string $path): void
    {
        DB::transaction(function () use ($disk, $path): void {
            $this->lockKey($disk, $path);
            $pending = MediaObjectDeletion::query()->where('disk', $disk)->where('path', $path)->exists();

            if (! $pending && ! $this->isNamedByLiveRow($disk, $path)) {
                Storage::disk($disk)->delete($path);
            }
        });
    }

    public function isNamedByLiveRow(string $disk, string $path): bool
    {
        return $disk === OrganizationLogo::DISK
            && OrganizationLogo::withoutGlobalScope('organization')->where('path', $path)->exists();
    }

    /**
     * A transaction-level advisory lock on the object's key: there may be no row to lock yet (a first upload).
     */
    private function lockKey(string $disk, string $path): void
    {
        DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ["media:{$disk}:{$path}"]);
    }
}
