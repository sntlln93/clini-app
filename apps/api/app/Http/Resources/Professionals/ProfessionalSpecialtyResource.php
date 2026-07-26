<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\ProfessionalSpecialty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProfessionalSpecialty
 */
class ProfessionalSpecialtyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $professionalSpecialty = $this->professionalSpecialty();

        return [
            'id' => $professionalSpecialty->id,
            'membership_id' => $professionalSpecialty->membership_id,
            'specialty_id' => $professionalSpecialty->specialty_id,
            'specialty_name' => $this->whenLoaded('specialty', fn () => $professionalSpecialty->specialty?->name),
        ];
    }

    private function professionalSpecialty(): ProfessionalSpecialty
    {
        /** @var ProfessionalSpecialty $professionalSpecialty */
        $professionalSpecialty = $this->resource;

        return $professionalSpecialty;
    }
}
