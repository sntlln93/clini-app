<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Data\Admin\SpecialtyCatalogUsageData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SpecialtyCatalogUsageData
 */
class SpecialtyCatalogUsageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SpecialtyCatalogUsageData $usage */
        $usage = $this->resource;

        return [
            'professions' => $usage->professions,
        ];
    }
}
