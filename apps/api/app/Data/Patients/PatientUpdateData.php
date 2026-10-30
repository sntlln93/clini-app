<?php

declare(strict_types=1);

namespace App\Data\Patients;

use App\Contracts\Data;

/**
 * `contacts` null leaves the patient's contacts as they are; a list replaces them.
 */
final readonly class PatientUpdateData implements Data
{
    /**
     * @param  array<string, mixed>  $attributes
     * @param  list<PatientContactData>|null  $contacts
     */
    public function __construct(
        public int $patientId,
        public int $updatedBy,
        public array $attributes,
        public ?array $contacts,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'patientId' => $this->patientId,
            'updatedBy' => $this->updatedBy,
            'attributes' => $this->attributes,
            'contacts' => $this->contacts === null
                ? null
                : array_map(fn (PatientContactData $contact): array => $contact->toArray(), $this->contacts),
        ];
    }
}
