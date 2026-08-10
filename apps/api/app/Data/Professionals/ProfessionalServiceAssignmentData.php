<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;
use App\Http\Requests\Professionals\StoreProfessionalServiceRequest;
use App\Http\Requests\Professionals\UpdateProfessionalServiceRequest;
use App\Models\Membership;

final readonly class ProfessionalServiceAssignmentData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $serviceId,
        public int $durationMinutes,
        public ?int $priceCents,
        public bool $active,
    ) {}

    public static function fromRequest(
        StoreProfessionalServiceRequest|UpdateProfessionalServiceRequest $request,
        Membership $membership,
        int $serviceId
    ): self {
        return new self(
            organizationId: $membership->organization_id,
            membershipId: $membership->id,
            serviceId: $serviceId,
            durationMinutes: $request->integer('duration_minutes'),
            priceCents: $request->integer('price_cents') ?: null,
            active: $request->boolean('active', true),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'serviceId' => $this->serviceId,
            'durationMinutes' => $this->durationMinutes,
            'priceCents' => $this->priceCents,
            'active' => $this->active,
        ];
    }
}
