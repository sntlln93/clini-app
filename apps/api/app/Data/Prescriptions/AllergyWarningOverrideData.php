<?php

declare(strict_types=1);

namespace App\Data\Prescriptions;

use App\Contracts\Data;

/**
 * A version of indicated medication its professional saved despite the allergies it matched (#362).
 */
final readonly class AllergyWarningOverrideData implements Data
{
    /**
     * @param  list<AllergyMatchData>  $matches
     */
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public int $appointmentId,
        public int $prescriptionId,
        public int $prescriptionVersionId,
        public array $matches,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'patientId' => $this->patientId,
            'appointmentId' => $this->appointmentId,
            'prescriptionId' => $this->prescriptionId,
            'prescriptionVersionId' => $this->prescriptionVersionId,
            'matches' => array_map(fn (AllergyMatchData $match) => $match->toArray(), $this->matches),
        ];
    }
}
