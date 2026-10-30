<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;
use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;

/**
 * One row of the clinical access log, as its only writer receives it.
 */
final readonly class ClinicalAccessEntryData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $patientId,
        public ClinicalAccessAction $action,
        public ?int $appointmentId = null,
        public ?int $clinicalNoteId = null,
        public ?int $prescriptionId = null,
        public ?int $vitalSignId = null,
        public ?int $bloodTypeRecordId = null,
        public ?int $medicalHistoryEntryId = null,
        public ?ClinicalAccessReason $reason = null,
        public ?string $reasonDetail = null,
        public ?int $clinicalRecordExportId = null,
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
            'action' => $this->action->value,
            'appointmentId' => $this->appointmentId,
            'clinicalNoteId' => $this->clinicalNoteId,
            'prescriptionId' => $this->prescriptionId,
            'vitalSignId' => $this->vitalSignId,
            'bloodTypeRecordId' => $this->bloodTypeRecordId,
            'medicalHistoryEntryId' => $this->medicalHistoryEntryId,
            'reason' => $this->reason?->value,
            'reasonDetail' => $this->reasonDetail,
            'clinicalRecordExportId' => $this->clinicalRecordExportId,
        ];
    }
}
