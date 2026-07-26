<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class DeleteMembershipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * CU-04/CU-05 guards: nobody may deactivate themselves, and the
     * organization must always keep at least one active, non-deleted
     * owner/admin membership.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $membership = $this->route('membership');

            if (! $membership instanceof Membership) {
                return;
            }

            if ($membership->user_id === $this->user()?->id) {
                $validator->errors()->add('membership', 'No podés desactivar tu propia membresía.');
            }

            /** @var array<int, MembershipRole> $roles */
            $roles = $membership->roles;

            $isOwnerOrAdmin = collect($roles)->contains(
                fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
            );

            /** @var MembershipStatus $status */
            $status = $membership->status;

            if ($status === MembershipStatus::Active && $isOwnerOrAdmin && ! $this->anotherActiveOwnerOrAdminExists($membership)) {
                $validator->errors()->add('membership', 'La organización debe mantener al menos un miembro activo con rol de propietario o administrador.');
            }
        });
    }

    private function anotherActiveOwnerOrAdminExists(Membership $membership): bool
    {
        return Membership::query()
            ->where('id', '!=', $membership->id)
            ->where('status', MembershipStatus::Active)
            ->get()
            ->contains(function (Membership $other): bool {
                /** @var array<int, MembershipRole> $roles */
                $roles = $other->roles;

                return collect($roles)->contains(
                    fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
                );
            });
    }
}
