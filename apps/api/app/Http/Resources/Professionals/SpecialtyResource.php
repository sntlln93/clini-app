<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\Specialty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A row of the catalog the registry fills (#387, ADR 0038). `backed` only where the query asks for it
 * (`Specialty::withBacking()`), for whoever sees the practice's professionals: never on the public booking page.
 *
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
            'profession' => $specialty->profession->value,
            'backed' => $this->whenHas('backed'),
        ];
    }

    private function specialty(): Specialty
    {
        /** @var Specialty $specialty */
        $specialty = $this->resource;

        return $specialty;
    }
}
