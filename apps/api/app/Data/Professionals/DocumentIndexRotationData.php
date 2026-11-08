<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * A rotation of the DNI's blind index key (#417): the keys come from the environment, never from here.
 */
final readonly class DocumentIndexRotationData implements Data
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [];
    }
}
