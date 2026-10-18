<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['prescription_version_id', 'position', 'medication', 'presentation', 'dosage', 'quantity'])]
class PrescriptionItem extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'quantity' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<PrescriptionVersion, $this>
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(PrescriptionVersion::class, 'prescription_version_id');
    }
}
