<?php

declare(strict_types=1);

namespace App\Http\Resources\Booking;

use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\Specialty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

/**
 * Public-facing shape of a professional; deliberately excludes email,
 * user_id and anything else that would leak internal data to an
 * anonymous consumer.
 *
 * Wraps a plain array, not the Membership model directly: the
 * pivot-carried service attributes come from a separately-queried
 * ProfessionalService collection (see PublicBookingController::show()),
 * not from Membership's own belongsToMany pivot.
 */
class PublicProfessionalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{membership: Membership, services: Collection<int, ProfessionalService>} $data */
        $data = $this->resource;
        $membership = $data['membership'];
        $services = $data['services'];

        return [
            'membership_id' => $membership->id,
            'name' => $membership->user?->name,
            'specialties' => $membership->specialties->map(fn (Specialty $specialty): array => [
                'id' => $specialty->id,
                'name' => $specialty->name,
            ])->all(),
            'services' => $services->map(fn (ProfessionalService $service): array => [
                'id' => $service->service_id,
                'name' => $service->service?->name,
                'duration_minutes' => $service->duration_minutes,
                'price_cents' => $service->price_cents,
                'currency' => $service->currency,
            ])->all(),
        ];
    }
}
