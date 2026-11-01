<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;
use App\Enums\Province;

/**
 * One license of a professional, as the national registry answers it (#380). `province` is null when the registry
 * names one Clini doesn't know; `sanctioned` says whether a sanction is still running.
 */
final readonly class RegistryLicenseData implements Data
{
    public function __construct(
        public string $number,
        public ?Province $province,
        public string $profession,
        public ?string $specialty,
        public ?string $issuer,
        public ?string $situation,
        public bool $sanctioned,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'number' => $this->number,
            'province' => $this->province?->value,
            'profession' => $this->profession,
            'specialty' => $this->specialty,
            'issuer' => $this->issuer,
            'situation' => $this->situation,
            'sanctioned' => $this->sanctioned,
        ];
    }
}
