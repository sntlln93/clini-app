<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;

/**
 * An appointment's access code, resent by the practice to one of the patient's addresses at their request (#364).
 */
final readonly class AccessCodeDeliveryData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $appointmentId,
        public int $contactId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'appointmentId' => $this->appointmentId,
            'contactId' => $this->contactId,
        ];
    }
}
