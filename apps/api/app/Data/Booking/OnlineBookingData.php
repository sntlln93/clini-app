<?php

declare(strict_types=1);

namespace App\Data\Booking;

use App\Contracts\Data;
use App\Enums\DocumentType;
use Carbon\CarbonImmutable;

final readonly class OnlineBookingData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $serviceId,
        public CarbonImmutable $startAt,
        public string $patientName,
        public DocumentType $documentType,
        public string $documentNumber,
        public ?string $email,
        public ?string $phone,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'serviceId' => $this->serviceId,
            'startAt' => $this->startAt,
            'patientName' => $this->patientName,
            'documentType' => $this->documentType,
            'documentNumber' => $this->documentNumber,
            'email' => $this->email,
            'phone' => $this->phone,
        ];
    }
}
