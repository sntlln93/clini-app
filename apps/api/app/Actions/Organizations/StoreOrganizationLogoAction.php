<?php

declare(strict_types=1);

namespace App\Actions\Organizations;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Organizations\OrganizationLogoData;
use App\Enums\PlanFeature;
use App\Models\OrganizationLogo;
use App\Support\OrganizationPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Uploading a logo is a paid-plan function (#239); removing it never is.
 *
 * The object is written before the row and the replaced one is deleted after
 * the commit, so a failure on either side leaves at most an orphan object,
 * never a row pointing at a missing one.
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
    ) {}

    /**
     * @param  OrganizationLogoData  $dto
     */
    public function handle(Data $dto): OrganizationLogo
    {
        $this->plans->ensureIncludes($dto->organizationId, PlanFeature::BookingBranding);

        $disk = Storage::disk(OrganizationLogo::DISK);
        $checksum = hash('sha256', $dto->contents);
        $extension = self::EXTENSIONS[$dto->mimeType] ?? 'bin';
        $path = "organization-logos/{$dto->organizationId}/{$checksum}.{$extension}";

        $disk->put($path, $dto->contents, ['ContentType' => $dto->mimeType]);

        try {
            [$logo, $replacedPath] = DB::transaction(function () use ($dto, $path, $checksum): array {
                $logo = OrganizationLogo::withoutGlobalScope('organization')
                    ->lockForUpdate()
                    ->firstOrNew(['organization_id' => $dto->organizationId]);
                $replacedPath = $logo->exists ? $logo->path : null;

                $logo->fill(['mime_type' => $dto->mimeType, 'path' => $path, 'checksum' => $checksum])->save();

                return [$logo, $replacedPath];
            });
        } catch (Throwable $exception) {
            $disk->delete($path);

            throw $exception;
        }

        if ($replacedPath !== null && $replacedPath !== $path) {
            $disk->delete($replacedPath);
        }

        return $logo;
    }
}
