<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

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
     * Only guards self-deactivation here; the race-sensitive org-wide "keep one active owner/admin" invariant is enforced transactionally in DeactivateMembershipAction.
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
        });
    }
}
