<?php

declare(strict_types=1);

namespace App\Exceptions\VitalSigns;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The measurement was annulled: it stays in the history as it was, so it can be neither amended nor annulled again.
 */
final class VitalSignAnnulledException extends DomainException
{
    public function __construct(
        private readonly int $vitalSignId,
    ) {
        parent::__construct('The measurement is annulled.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::VitalSignsAnnulled;
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
        ];
    }
}
