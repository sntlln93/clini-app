<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AccountDeletionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A clinic user's own request to delete their account (#384, ADR 0034). Written only by the Actions under
 * `App\Actions\Account`.
 */
#[Fillable(['user_id', 'status', 'deletes_at', 'resolved_at'])]
class AccountDeletionRequest extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => AccountDeletionStatus::class,
            'deletes_at' => 'immutable_datetime',
            'resolved_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The memberships this request deactivated, each with the status it had.
     *
     * @return HasMany<AccountDeletionRequestMembership, $this>
     */
    public function deactivatedMemberships(): HasMany
    {
        return $this->hasMany(AccountDeletionRequestMembership::class);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->where('status', AccountDeletionStatus::Pending);
    }
}
