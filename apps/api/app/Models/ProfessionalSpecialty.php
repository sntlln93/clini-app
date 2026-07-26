<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\ProfessionalSpecialtyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['organization_id', 'membership_id', 'user_id', 'specialty_id'])]
class ProfessionalSpecialty extends Model
{
    /** @use HasFactory<ProfessionalSpecialtyFactory> */
    use BelongsToOrganization, HasFactory;

    public $timestamps = false;

    /**
     * @return BelongsTo<Membership, $this>
     */
    public function membership(): BelongsTo
    {
        return $this->belongsTo(Membership::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Specialty, $this>
     */
    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }
}
