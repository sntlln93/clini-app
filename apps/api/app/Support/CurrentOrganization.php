<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Small singleton holder for the tenant currently in scope.
 *
 * Null by default so that tenant scoping is a no-op until something
 * (auth/tenant middleware, a test, a console command) explicitly sets it.
 */
class CurrentOrganization
{
    private ?int $id = null;

    public function set(?int $id): void
    {
        $this->id = $id;
    }

    public function get(): ?int
    {
        return $this->id;
    }

    public function has(): bool
    {
        return $this->id !== null;
    }
}
