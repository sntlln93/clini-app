<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\UserSpecialty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UserSpecialty
 */
class UserSpecialtyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $userSpecialty = $this->userSpecialty();

        return [
            'id' => $userSpecialty->id,
            'specialty_id' => $userSpecialty->specialty_id,
            'specialty_name' => $this->whenLoaded('specialty', fn () => $userSpecialty->specialty?->name),
        ];
    }

    private function userSpecialty(): UserSpecialty
    {
        /** @var UserSpecialty $userSpecialty */
        $userSpecialty = $this->resource;

        return $userSpecialty;
    }
}
