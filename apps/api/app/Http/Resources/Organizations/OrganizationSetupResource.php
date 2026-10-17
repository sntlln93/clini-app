<?php

declare(strict_types=1);

namespace App\Http\Resources\Organizations;

use App\Data\Organizations\OrganizationSetupProgressData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrganizationSetupProgressData
 */
class OrganizationSetupResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var OrganizationSetupProgressData $progress */
        $progress = $this->resource;

        return [
            ...$progress->toArray(),
            'ready' => $progress->isReady(),
        ];
    }
}
