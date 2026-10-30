<?php

declare(strict_types=1);

namespace App\Http\Resources\MedicalHistory;

use App\Models\BloodTypeRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One recorded blood type, with its author (#361).
 *
 * @mixin BloodTypeRecord
 */
class BloodTypeRecordResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $record = $this->record();

        return [
            'id' => $record->id,
            'appointment_id' => $record->appointment_id,
            'membership_id' => $record->membership_id,
            'blood_type' => $record->blood_type,
            'reason' => $record->reason,
            'created_at' => $record->created_at,
            'author_name' => $record->author?->user?->name,
        ];
    }

    private function record(): BloodTypeRecord
    {
        /** @var BloodTypeRecord $record */
        $record = $this->resource;

        return $record;
    }
}
