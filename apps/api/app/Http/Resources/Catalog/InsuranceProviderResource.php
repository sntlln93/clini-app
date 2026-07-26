<?php

declare(strict_types=1);

namespace App\Http\Resources\Catalog;

use App\Models\InsuranceProvider;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InsuranceProvider
 */
class InsuranceProviderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $insuranceProvider = $this->insuranceProvider();

        return [
            'id' => $insuranceProvider->id,
            'name' => $insuranceProvider->name,
        ];
    }

    private function insuranceProvider(): InsuranceProvider
    {
        /** @var InsuranceProvider $insuranceProvider */
        $insuranceProvider = $this->resource;

        return $insuranceProvider;
    }
}
