<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMembershipRequest extends FormRequest
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
        return [
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['distinct', Rule::enum(MembershipRole::class)],
            'status' => ['required', Rule::enum(MembershipStatus::class)],
        ];
    }

    /**
     * CU-04/CU-05 guard: nobody may suspend themselves or drop their own
     * owner/admin roles. The organization-wide "keeps at least one active
     * owner/admin" guard is race-sensitive (two concurrent updates could
     * both pass it), so it is checked and enforced transactionally, under a
     * row lock, inside UpdateMembershipAction instead.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $membership = $this->route('membership');

            if (! $membership instanceof Membership) {
                return;
            }

            if ($membership->user_id !== $this->user()?->id) {
                return;
            }

            $newRoles = collect((array) $this->input('roles'))
                ->map(fn (mixed $role): ?MembershipRole => is_string($role) ? MembershipRole::tryFrom($role) : null)
                ->filter()
                ->values();

            $rawStatus = $this->input('status');
            $newStatus = is_string($rawStatus) ? MembershipStatus::tryFrom($rawStatus) : null;

            $newRolesKeepOwnerOrAdmin = $newRoles->contains(
                fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
            );

            if ($newStatus !== MembershipStatus::Active) {
                $validator->errors()->add('status', 'No podés desactivar o suspender tu propia membresía.');
            }

            /** @var array<int, MembershipRole> $existingRoles */
            $existingRoles = $membership->roles;

            $hadOwnerOrAdmin = collect($existingRoles)->contains(
                fn (MembershipRole $role): bool => in_array($role, [MembershipRole::Owner, MembershipRole::Admin], true)
            );

            if ($hadOwnerOrAdmin && ! $newRolesKeepOwnerOrAdmin) {
                $validator->errors()->add('roles', 'No podés quitarte a vos mismo el rol de propietario o administrador.');
            }
        });
    }
}
