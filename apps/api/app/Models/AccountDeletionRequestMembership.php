<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MembershipStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A membership an account deletion request deactivated, and the status it had before (#384).
 */
#[Fillable(['account_deletion_request_id', 'membership_id', 'previous_status'])]
class AccountDeletionRequestMembership extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'previous_status' => MembershipStatus::class,
        ];
    }
}
