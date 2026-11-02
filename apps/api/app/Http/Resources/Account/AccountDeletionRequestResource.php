<?php

declare(strict_types=1);

namespace App\Http\Resources\Account;

use App\Models\AccountDeletionRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AccountDeletionRequest
 */
class AccountDeletionRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AccountDeletionRequest $deletion */
        $deletion = $this->resource;

        return [
            'deletes_at' => $deletion->deletes_at->toIso8601String(),
        ];
    }
}
