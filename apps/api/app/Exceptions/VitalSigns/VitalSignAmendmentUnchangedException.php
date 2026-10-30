<?php

declare(strict_types=1);

namespace App\Exceptions\VitalSigns;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The amendment repeats the current values: it would add a version that corrects nothing.
 */
final class VitalSignAmendmentUnchangedException extends DomainException
{
    public function __construct(
        private readonly int $vitalSignId,
        private readonly int $currentVersion,
    ) {
        parent::__construct('The amendment repeats the current values of the measurement.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::VitalSignsAmendmentUnchanged;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'vital_sign_id' => $this->vitalSignId,
            'current_version' => $this->currentVersion,
        ];
    }
}
