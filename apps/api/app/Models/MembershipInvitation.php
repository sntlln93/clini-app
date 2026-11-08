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

/**
 * An invitation that includes the professional role is accepted with the invitee's DNI (#417): the registry gives the
 * account its name, and each DNI looked up spends one of `MAX_DOCUMENT_LOOKUPS`.
 */
#[Fillable(['organization_id', 'email', 'roles', 'token', 'expires_at', 'accepted_at'])]
#[Hidden(['token'])]
class MembershipInvitation extends Model
{
    public const int MAX_DOCUMENT_LOOKUPS = 3;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = ['document_lookups' => 0];

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
            'document_lookups' => 'integer',
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

    /**
     * Whether it is accepted as a professional, with the DNI: the professional role is among its roles.
     */
    public function isForProfessional(): bool
    {
        /** @var array<int, MembershipRole> $roles */
        $roles = $this->roles;

        return in_array(MembershipRole::Professional, $roles, true);
    }

    /**
     * Read again after a lookup is counted, so it depends on the model's current state.
     *
     * @phpstan-impure
     */
    public function documentLookupsLeft(): int
    {
        return max(0, self::MAX_DOCUMENT_LOOKUPS - $this->document_lookups);
    }
}
