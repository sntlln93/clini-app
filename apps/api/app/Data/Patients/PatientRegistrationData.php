<?php

declare(strict_types=1);

namespace App\Data\Patients;

use App\Contracts\Data;
use App\Enums\DocumentType;
use App\Enums\Sex;

final readonly class PatientRegistrationData implements Data
{
    public function __construct(
        public int $organizationId,
        public ?int $createdBy,
        public string $name,
        public DocumentType $documentType,
        public string $documentNumber,
        public ?string $email,
        public ?string $phone,
        public ?Sex $sex,
        public ?string $birthDate,
        public ?int $insuranceProviderId,
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
            'email' => $this->email,
            'phone' => $this->phone,
            'sex' => $this->sex,
            'birthDate' => $this->birthDate,
            'insuranceProviderId' => $this->insuranceProviderId,
        ];
    }
}
