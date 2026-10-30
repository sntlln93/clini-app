<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Takes a measurement recorded by mistake out of the series without erasing it (#361): it stays in the history with
 * every version, and it can no longer be amended.
 */
#[Fillable(['vital_sign_id', 'membership_id', 'reason'])]
class VitalSignAnnulment extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return BelongsTo<VitalSign, $this>
     */
    public function vitalSign(): BelongsTo
    {
        return $this->belongsTo(VitalSign::class);
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
