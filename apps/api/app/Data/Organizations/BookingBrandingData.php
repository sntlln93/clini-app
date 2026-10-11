<?php

declare(strict_types=1);

namespace App\Data\Organizations;

use App\Contracts\Data;

final readonly class BookingBrandingData implements Data
{
    public function __construct(
        public bool $showCliniMark,
        public ?string $logoUrl,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'showCliniMark' => $this->showCliniMark,
            'logoUrl' => $this->logoUrl,
        ];
    }
}
