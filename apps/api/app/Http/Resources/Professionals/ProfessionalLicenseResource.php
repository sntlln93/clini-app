<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\ProfessionalLicense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A license as the professional declared it, and what the registry last said about it (#380).
 *
 * @mixin ProfessionalLicense
 */
class ProfessionalLicenseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $license = $this->license();

        return [
            'id' => $license->id,
            'number' => $license->number,
            'province' => $license->province->value,
            'profession' => $license->profession->value,
            'status' => $license->status->value,
            'mismatch_reason' => $license->mismatch_reason?->value,
            'refeps_code' => $license->refeps_code,
            'issuer' => $license->issuer,
            'specialty' => $license->specialty,
            'situation' => $license->situation,
            'checked_at' => $license->checked_at?->toIso8601String(),
        ];
    }

    private function license(): ProfessionalLicense
    {
        /** @var ProfessionalLicense $license */
        $license = $this->resource;

        return $license;
    }
}
