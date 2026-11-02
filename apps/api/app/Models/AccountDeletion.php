<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Append-only: no updated_at, and CompleteAccountDeletionAction is its only writer (#384). The user's id and the
 * date, never a personal datum.
 */
#[Fillable(['user_id'])]
class AccountDeletion extends Model
{
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'immutable_datetime',
        ];
    }
}
