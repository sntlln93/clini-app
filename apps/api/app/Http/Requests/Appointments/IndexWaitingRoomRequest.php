<?php

declare(strict_types=1);

namespace App\Http\Requests\Appointments;

use App\Rules\Iso8601Instant;
use Illuminate\Foundation\Http\FormRequest;

class IndexWaitingRoomRequest extends FormRequest
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
            'from' => ['required', new Iso8601Instant],
            'to' => ['required', new Iso8601Instant, 'after_or_equal:from'],
        ];
    }
}
