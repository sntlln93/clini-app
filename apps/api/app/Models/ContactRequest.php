<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ContactRequestStatus;
use App\Enums\Plan;
use Database\Factories\ContactRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A commercial contact request sent from the landing (#248). Platform data,
 * not tenant data: no organization scope.
 */
#[Fillable(['name', 'email', 'phone', 'organization_name', 'team_size', 'plan', 'message'])]
class ContactRequest extends Model
{
    /** @use HasFactory<ContactRequestFactory> */
    use HasFactory, Prunable;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'new',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'team_size' => 'integer',
            'plan' => Plan::class,
            'status' => ContactRequestStatus::class,
            'closed_at' => 'immutable_datetime',
        ];
    }

    /**
     * The operator who last changed the status.
     *
     * @return BelongsTo<PlatformAdmin, $this>
     */
    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class, 'handled_by_id');
    }

    /**
     * @param  Builder<ContactRequest>  $query
     * @return Builder<ContactRequest>
     */
    public function scopeWithStatus(Builder $query, ?ContactRequestStatus $status): Builder
    {
        return $status === null ? $query : $query->where('status', $status);
    }

    /**
     * Closed requests past the retention window (config/contact.php).
     *
     * @return Builder<ContactRequest>
     */
    public function prunable(): Builder
    {
        $days = config()->integer('contact.retention_days');
        $query = ContactRequest::query()->where('status', ContactRequestStatus::Closed);

        return $days > 0
            ? $query->where('closed_at', '<=', now()->subDays($days))
            : $query->whereRaw('false');
    }
}
