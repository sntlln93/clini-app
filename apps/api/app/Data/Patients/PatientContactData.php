<?php

declare(strict_types=1);

namespace App\Data\Patients;

use App\Contracts\Data;
use App\Enums\PatientContactType;

/**
 * `value` is already normalized (App\Support\PatientContactValue).
 */
final readonly class PatientContactData implements Data
{
    public function __construct(
        public PatientContactType $type,
        public string $value,
        public ?string $label,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'type' => $this->type,
            'value' => $this->value,
            'label' => $this->label,
        ];
    }
}
