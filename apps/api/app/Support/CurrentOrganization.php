<?php

declare(strict_types=1);

namespace App\Support;

/** Null by default, so tenant scoping is a no-op until middleware, a test or a command sets it. */
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

    // Unreachable abort: the `organization` middleware already 403s a guarded route without an active organization.
    public function getOrFail(): int
    {
        $id = $this->get();

        if ($id === null) {
            abort(403);
        }

        return $id;
    }
}
