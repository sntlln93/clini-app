<?php

declare(strict_types=1);

namespace App\Http\Resources\Catalog;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Service
 */
class ServiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $service = $this->service();

        return [
            'id' => $service->id,
            'name' => $service->name,
        ];
    }

    private function service(): Service
    {
        /** @var Service $service */
        $service = $this->resource;

        return $service;
    }
}
