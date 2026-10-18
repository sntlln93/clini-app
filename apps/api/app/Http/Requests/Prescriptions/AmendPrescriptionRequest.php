<?php

declare(strict_types=1);

namespace App\Http\Requests\Prescriptions;

/**
 * Same items as recording one, since an amendment carries the whole new
 * list, plus an optional reason.
 */
class AmendPrescriptionRequest extends StorePrescriptionRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function reason(): ?string
    {
        $reason = $this->string('reason')->trim()->toString();

        return $reason === '' ? null : $reason;
    }
}
