<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\ProfessionalService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProfessionalService
 */
class ProfessionalServiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $professionalService = $this->professionalService();

        return [
            'id' => $professionalService->id,
            'membership_id' => $professionalService->membership_id,
            'service_id' => $professionalService->service_id,
            'service_name' => $this->whenLoaded('service', fn () => $professionalService->service?->name),
            'duration_minutes' => $professionalService->duration_minutes,
            'price_cents' => $professionalService->price_cents,
            'active' => $professionalService->active,
        ];
    }

    private function professionalService(): ProfessionalService
    {
        /** @var ProfessionalService $professionalService */
        $professionalService = $this->resource;

        return $professionalService;
    }
}
