<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use App\Models\MembershipInvitation;
use App\Models\User;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Public endpoint: authorize() is always true, and every failure message
 * stays generic — an invalid, expired or already-used token must never
 * let a caller infer whether the underlying email is registered.
 */
class AcceptInvitationRequest extends FormRequest
{
    private ?MembershipInvitation $invitation = null;

    private bool $invitationResolved = false;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $requiresRegistration = $this->requiresRegistration();

        return [
            'name' => [$requiresRegistration ? 'required' : 'prohibited', 'string', 'max:255'],
            'password' => [$requiresRegistration ? 'required' : 'prohibited', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->invitation() === null) {
                $validator->errors()->add('token', 'La invitación no es válida o ya expiró.');
            }
        });
    }

    private function requiresRegistration(): bool
    {
        $invitation = $this->invitation();

        return $invitation !== null && ! User::where('email', $invitation->email)->exists();
    }

    private function invitation(): ?MembershipInvitation
    {
        if ($this->invitationResolved) {
            return $this->invitation;
        }

        $this->invitationResolved = true;

        $token = (string) $this->route('token');

        $invitation = MembershipInvitation::query()
            ->where('token', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->first();

        if ($invitation !== null && $invitation->isExpired()) {
            $invitation = null;
        }

        return $this->invitation = $invitation;
    }
}
