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

    // The `organization` middleware always sets an active organization before a request reaches a guarded route (it aborts 403 otherwise), so this narrows the nullable getter to a definite int.
    public function getOrFail(): int
    {
        $id = $this->get();

        if ($id === null) {
            abort(403);
        }

        return $id;
    }
}
