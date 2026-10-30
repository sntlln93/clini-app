<?php

declare(strict_types=1);

namespace App\Exceptions\Prescriptions;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The medication matches current allergies of the patient that the professional hasn't confirmed yet (#362, ADR
 * 0030). It doesn't block: sending the ids back with the medication indicates it anyway.
 */
final class PrescriptionAllergyWarningException extends DomainException
{
    /**
     * @param  list<array{id: int, description: string, reaction: ?string, severity: ?string}>  $allergies
     * @param  list<int>  $hiddenAllergyIds
     */
    public function __construct(
        private readonly int $patientId,
        private readonly array $allergies,
        private readonly array $hiddenAllergyIds,
        private readonly bool $reasonRequired,
    ) {
        parent::__construct('The medication matches a current allergy of the patient.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::PrescriptionsAllergyWarning;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * Only ids: an allergy's substance is clinical content.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'patient_id' => $this->patientId,
            'medical_history_entry_ids' => [...array_column($this->allergies, 'id'), ...$this->hiddenAllergyIds],
            'reason_required' => $this->reasonRequired,
        ];
    }

    /**
     * The matches the professional may read come with their detail; the others only with their id, which is all
     * «Indicar igual» sends back. `reason_required` says the detail is withheld because the history takes an
     * exceptional access, rather than because the allergy is another author's.
     *
     * @return array<string, mixed>
     */
    public function publicContext(): array
    {
        return [
            'allergies' => $this->allergies,
            'hidden_allergy_ids' => $this->hiddenAllergyIds,
            'reason_required' => $this->reasonRequired,
        ];
    }
}
