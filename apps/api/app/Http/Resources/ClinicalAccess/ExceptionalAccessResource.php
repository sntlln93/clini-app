<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalAccess;

use App\Models\ClinicalAccessLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One exceptional access, as the owner sees it (#325, ADR 0022): who, on which patient, why and when. Never the
 * professional's own words (`reason_detail`), which can carry clinical content, nor anything of the history.
 *
 * @mixin ClinicalAccessLog
 */
class ExceptionalAccessResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $access = $this->access();

        return [
            'id' => $access->id,
            'created_at' => $access->created_at,
            'professional' => [
                'membership_id' => $access->membership_id,
                'name' => $access->accessor?->user?->name,
            ],
            'patient' => [
                'id' => $access->patient_id,
                'name' => $access->patient?->name,
            ],
            'reason' => $access->reason,
        ];
    }

    private function access(): ClinicalAccessLog
    {
        /** @var ClinicalAccessLog $access */
        $access = $this->resource;

        return $access;
    }
}
