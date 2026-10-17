<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\ContactRequestStatus;
use App\Enums\Plan;
use App\Models\ContactRequest;
use App\Models\PlatformAdmin;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Expects the `handledBy` relation to be loaded.
 *
 * @mixin ContactRequest
 */
class AdminContactRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ContactRequest $contactRequest */
        $contactRequest = $this->resource;

        /** @var ContactRequestStatus $status */
        $status = $contactRequest->status;

        /** @var Plan|null $plan */
        $plan = $contactRequest->plan;

        /** @var PlatformAdmin|null $handledBy */
        $handledBy = $contactRequest->handledBy;

        /** @var CarbonImmutable|null $closedAt */
        $closedAt = $contactRequest->closed_at;

        return [
            'id' => $contactRequest->id,
            'name' => $contactRequest->name,
            'email' => $contactRequest->email,
            'phone' => $contactRequest->phone,
            'organization_name' => $contactRequest->organization_name,
            'team_size' => $contactRequest->team_size,
            'plan' => $plan?->value,
            'message' => $contactRequest->message,
            'status' => $status->value,
            'handled_by' => $handledBy === null ? null : (new AdminRefResource($handledBy))->toArray($request),
            'closed_at' => $closedAt?->toIso8601String(),
            'created_at' => $contactRequest->created_at?->toIso8601String(),
            'updated_at' => $contactRequest->updated_at?->toIso8601String(),
        ];
    }
}
