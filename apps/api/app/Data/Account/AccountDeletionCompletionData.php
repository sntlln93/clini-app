<?php

declare(strict_types=1);

namespace App\Data\Account;

use App\Contracts\Data;

/** An account deletion request whose grace period may have ended (#384). */
final readonly class AccountDeletionCompletionData implements Data
{
    public function __construct(
        public int $requestId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'request_id' => $this->requestId,
        ];
    }
}
