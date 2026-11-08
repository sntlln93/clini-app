<?php

declare(strict_types=1);

namespace App\Http\Resources\Professionals;

use App\Models\ProfessionalLicense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A license the registry holds for the professional's DNI, and what it last said about it (#380): `specialty` is the
 * catalog row it backs while verified and in Clini (#387), the registry's specialty or the profession itself.
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
            'specialty' => $license->specialty?->name,
            'situation' => $license->situation,
            'checked_at' => $license->checked_at?->toIso8601String(),
            // In Clini, or only what the registry holds for the DNI (#387).
            'added' => $license->added_at !== null,
        ];
    }

    private function license(): ProfessionalLicense
    {
        /** @var ProfessionalLicense $license */
        $license = $this->resource;

        return $license;
    }
}
