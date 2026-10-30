<?php

declare(strict_types=1);

namespace App\Http\Requests\VitalSigns;

/**
 * Same values as recording one, since an amendment carries the whole new measurement, plus an optional reason.
 */
class AmendVitalSignRequest extends StoreVitalSignRequest
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
