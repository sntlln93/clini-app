<?php

declare(strict_types=1);

namespace App\Data\Patients;

use App\Contracts\Data;

/**
 * `replace` makes `contacts` the patient's whole list, in that order; otherwise they are only added to it.
 * `createdBy` is null for an anonymous online booking.
 */
final readonly class PatientContactListData implements Data
{
    /**
     * @param  list<PatientContactData>  $contacts
     */
    public function __construct(
        public int $patientId,
        public array $contacts,
        public ?int $createdBy,
        public bool $replace,
        public bool $needsConfirmation,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'patientId' => $this->patientId,
            'contacts' => array_map(fn (PatientContactData $contact): array => $contact->toArray(), $this->contacts),
            'createdBy' => $this->createdBy,
            'replace' => $this->replace,
            'needsConfirmation' => $this->needsConfirmation,
        ];
    }
}
