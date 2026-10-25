<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PrescriptionAnnulmentKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks indicated medication as no longer valid without erasing it (#344):
 * the record and every version stay in the history, and it can no longer be
 * amended.
 */
#[Fillable(['prescription_id', 'membership_id', 'kind', 'reason'])]
class PrescriptionAnnulment extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kind' => PrescriptionAnnulmentKind::class,
        ];
    }

    /**
     * @return BelongsTo<Prescription, $this>
     */
    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    /**
     * Deactivating a membership soft-deletes it, and the record keeps its author.
     *
     * @return BelongsTo<Membership, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id')->withTrashed();
    }
}
