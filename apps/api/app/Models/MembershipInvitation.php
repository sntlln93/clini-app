<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\EnumArrayCast;
use App\Enums\MembershipRole;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\MembershipInvitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

#[Fillable(['organization_id', 'email', 'roles', 'token', 'expires_at', 'accepted_at'])]
#[Hidden(['token'])]
class MembershipInvitation extends Model
{
    /** @use HasFactory<MembershipInvitationFactory> */
    use BelongsToOrganization, HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'roles' => EnumArrayCast::class.':'.MembershipRole::class,
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        /** @var Carbon $expiresAt */
        $expiresAt = $this->expires_at;

        return $expiresAt->isPast();
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }
}
