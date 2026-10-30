<?php

declare(strict_types=1);

namespace App\Http\Resources\Auth;

use App\Data\Auth\TwoFactorSecretData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property TwoFactorSecretData $resource
 */
class TwoFactorSetupResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return $this->resource->toArray();
    }
}
