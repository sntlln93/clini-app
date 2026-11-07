<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationLogoData;
use App\Enums\PlanFeature;
use App\Models\OrganizationLogo;
use App\Support\MediaObjectDeletions;
use App\Support\OrganizationPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Uploading a logo is a paid-plan function (#239); removing it never is.
 *
 * The object is written before the row is saved, and the replaced one is only scheduled for deletion (#410), in the
 * same transaction. The same file uploaded again names the same key, so its pending deletion is cancelled before the
 * object is written. If the transaction fails, the object just written is deleted unless a row already named it.
 *
 * @implements Action<OrganizationLogoData>
 */
class StoreOrganizationLogoAction implements Action
{
    private const EXTENSIONS = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
    ];

    public function __construct(
        private readonly OrganizationPlan $plans,
        private readonly MediaObjectDeletions $deletions,
    ) {}

    /**
     * @param  OrganizationLogoData  $dto
     */
    public function handle(Data $dto): OrganizationLogo
    {
        $this->plans->ensureIncludes($dto->organizationId, PlanFeature::BookingBranding);

        $checksum = hash('sha256', $dto->contents);
        $extension = self::EXTENSIONS[$dto->mimeType] ?? 'bin';
        $path = "organization-logos/{$dto->organizationId}/{$checksum}.{$extension}";

        try {
            return DB::transaction(function () use ($dto, $path, $checksum): OrganizationLogo {
                $logo = OrganizationLogo::withoutGlobalScope('organization')
                    ->lockForUpdate()
                    ->firstOrNew(['organization_id' => $dto->organizationId]);
                $replacedPath = $logo->exists ? $logo->path : null;

                $this->deletions->cancel(OrganizationLogo::DISK, $path);
                Storage::disk(OrganizationLogo::DISK)->put($path, $dto->contents, ['ContentType' => $dto->mimeType]);

                $logo->fill(['mime_type' => $dto->mimeType, 'path' => $path, 'checksum' => $checksum])->save();

                if ($replacedPath !== null && $replacedPath !== $path) {
                    $this->deletions->schedule(OrganizationLogo::DISK, $replacedPath);
                }

                return $logo;
            });
        } catch (Throwable $exception) {
            rescue(fn () => $this->deletions->discardUnnamed(OrganizationLogo::DISK, $path));

            throw $exception;
        }
    }
}
