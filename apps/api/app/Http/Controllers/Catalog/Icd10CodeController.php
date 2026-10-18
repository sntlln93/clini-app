<?php

declare(strict_types=1);

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\IndexIcd10CodeRequest;
use App\Http\Resources\Catalog\Icd10CodeResource;
use App\Models\Icd10Code;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Global read-only reference data (#324, ADR 0020): no authorization beyond
 * the route middleware, no write endpoints. The catalog has thousands of
 * codes, so it is only searched, never listed whole.
 */
class Icd10CodeController extends Controller
{
    public const int RESULTS_LIMIT = 20;

    public function index(IndexIcd10CodeRequest $request): AnonymousResourceCollection
    {
        $term = $request->term();

        $codes = $term === ''
            ? collect()
            : Icd10Code::query()->search($term)->limit(self::RESULTS_LIMIT)->get();

        return Icd10CodeResource::collection($codes);
    }
}
