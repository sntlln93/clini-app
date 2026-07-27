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
     * CU-04/CU-05 guard: nobody may deactivate themselves. The
     * organization-wide "keeps at least one active owner/admin" guard is
     * race-sensitive (two concurrent deactivations could both pass it), so
     * it is checked and enforced transactionally, under a row lock, inside
     * DeactivateMembershipAction instead.
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
