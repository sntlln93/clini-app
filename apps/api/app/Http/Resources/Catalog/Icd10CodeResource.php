<?php

declare(strict_types=1);

namespace App\Http\Resources\Catalog;

use App\Models\Icd10Code;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Icd10Code
 */
class Icd10CodeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $icd10Code = $this->icd10Code();

        return [
            'id' => $icd10Code->id,
            'code' => $icd10Code->code,
            'description' => $icd10Code->description,
        ];
    }

    private function icd10Code(): Icd10Code
    {
        /** @var Icd10Code $icd10Code */
        $icd10Code = $this->resource;

        return $icd10Code;
    }
}
