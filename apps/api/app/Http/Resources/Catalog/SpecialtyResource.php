<?php

declare(strict_types=1);

namespace App\Http\Resources\Catalog;

use App\Models\Specialty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Specialty
 */
class SpecialtyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $specialty = $this->specialty();

        return [
            'id' => $specialty->id,
            'name' => $specialty->name,
        ];
    }

    private function specialty(): Specialty
    {
        /** @var Specialty $specialty */
        $specialty = $this->resource;

        return $specialty;
    }
}
