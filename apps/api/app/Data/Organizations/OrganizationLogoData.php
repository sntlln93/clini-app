<?php

declare(strict_types=1);

namespace App\Data\Organizations;

use App\Contracts\Data;

/**
 * `contents` is the raw file, not yet encoded.
 */
final readonly class OrganizationLogoData implements Data
{
    public function __construct(
        public int $organizationId,
        public string $mimeType,
        public string $contents,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'mimeType' => $this->mimeType,
            'size' => strlen($this->contents),
        ];
    }
}
