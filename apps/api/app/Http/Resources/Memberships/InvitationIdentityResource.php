<?php

declare(strict_types=1);

namespace App\Http\Resources\Memberships;

use App\Data\Memberships\InvitationIdentityData;
use App\Models\MembershipInvitation;
use App\Models\User;
use App\Support\MaskedEmail;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Who a professional invitation's DNI found (#417): the registry's name, and the account the membership goes to, by
 * its masked email and whether it asks for a second factor. Never the DNI.
 *
 * @mixin InvitationIdentityData
 */
class InvitationIdentityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var InvitationIdentityData $identity */
        $identity = $this->resource;
        $account = $identity->userId === null ? null : User::query()->find($identity->userId);

        return [
            'name' => $identity->name,
            'account' => $account === null ? null : [
                'email' => MaskedEmail::of($account->email),
                'two_factor' => $account->hasTwoFactorEnabled(),
            ],
            'document_lookups_left' => MembershipInvitation::query()->find($identity->invitationId)?->documentLookupsLeft() ?? 0,
        ];
    }
}
