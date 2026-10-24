<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalAccess;

use App\Models\ClinicalAccessLog;
use App\Support\ClinicalAccess;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The answer to the professional who declared an exceptional access: until when the history stays open to them.
 *
 * @mixin ClinicalAccessLog
 */
class ExceptionalAccessGrantResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $access = $this->access();

        return [
            'id' => $access->id,
            'patient_id' => $access->patient_id,
            'reason' => $access->reason,
            'created_at' => $access->created_at,
            'expires_at' => $access->created_at->copy()->addMinutes(ClinicalAccess::EXCEPTIONAL_ACCESS_MINUTES),
        ];
    }

    private function access(): ClinicalAccessLog
    {
        /** @var ClinicalAccessLog $access */
        $access = $this->resource;

        return $access;
    }
}
