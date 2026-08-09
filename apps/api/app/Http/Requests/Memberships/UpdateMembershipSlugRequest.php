<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates only type/presence/length — format and cross-table uniqueness are business logic checked by SetMembershipSlugAction instead (issue #32).
 */
class UpdateMembershipSlugRequest extends FormRequest
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
            'slug' => ['nullable', 'string', 'max:50'],
        ];
    }
}
