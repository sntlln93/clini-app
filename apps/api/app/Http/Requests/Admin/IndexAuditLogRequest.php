<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\AdminAuditAction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * `subject_type` alone filters by type; `subject_id` requires it. `from`/`to`
 * are inclusive local dates, each optional (unbounded).
 */
class IndexAuditLogRequest extends FormRequest
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
            'action' => ['nullable', Rule::enum(AdminAuditAction::class)],
            'platform_admin_id' => ['nullable', 'integer', 'exists:platform_admins,id'],
            'subject_type' => ['nullable', 'required_with:subject_id', 'in:organization,user,subscription'],
            'subject_id' => ['nullable', 'integer', 'min:1'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
