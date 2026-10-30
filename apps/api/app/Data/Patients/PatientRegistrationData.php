<?php

declare(strict_types=1);

namespace App\Data\Patients;

use App\Contracts\Data;
use App\Enums\DocumentType;
use App\Enums\Sex;

final readonly class PatientRegistrationData implements Data
{
    /**
     * @param  list<PatientContactData>  $contacts
     */
    public function __construct(
        public int $organizationId,
        public ?int $createdBy,
        public string $name,
        public DocumentType $documentType,
        public string $documentNumber,
        public array $contacts,
        public ?Sex $sex,
        public ?string $birthDate,
        public ?int $insuranceProviderId,
        public ?string $insuranceMemberNumber,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'createdBy' => $this->createdBy,
            'name' => $this->name,
            'documentType' => $this->documentType,
            'documentNumber' => $this->documentNumber,
            'contacts' => array_map(fn (PatientContactData $contact): array => $contact->toArray(), $this->contacts),
            'sex' => $this->sex,
            'birthDate' => $this->birthDate,
            'insuranceProviderId' => $this->insuranceProviderId,
            'insuranceMemberNumber' => $this->insuranceMemberNumber,
        ];
    }
}
