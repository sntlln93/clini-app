<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Patient;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;

/**
 * A member number identifies one person within its provider (#290), so it
 * can't be taken by another patient. "Another" is everyone but the patient
 * being edited, or, on create, the patient that find-or-create will reuse
 * for the submitted document.
 */
final readonly class UniqueInsuranceMemberNumber implements ValidationRule
{
    /**
     * @param  array{type: mixed, number: mixed}|null  $ownDocument
     */
    public function __construct(
        private mixed $insuranceProviderId,
        private ?int $ignorePatientId = null,
        private ?array $ownDocument = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! is_numeric($this->insuranceProviderId)) {
            return;
        }

        $takenByAnother = Patient::withTrashed()
            ->whereInsuranceMemberNumber((int) $this->insuranceProviderId, $value)
            ->when($this->ignorePatientId !== null, fn (Builder $query) => $query->whereKeyNot($this->ignorePatientId))
            ->when($this->ownDocument !== null, fn (Builder $query) => $query->whereNot(fn (Builder $query) => $query
                ->where('document_type', $this->ownDocument['type'] ?? null)
                ->where('document_number', $this->ownDocument['number'] ?? null)))
            ->exists();

        if ($takenByAnother) {
            $fail('Ese número de afiliado ya está registrado para otro paciente de la misma obra social.');
        }
    }
}
