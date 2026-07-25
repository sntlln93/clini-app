<?php

declare(strict_types=1);

namespace App\Contracts;

interface Data
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(): array;
}
