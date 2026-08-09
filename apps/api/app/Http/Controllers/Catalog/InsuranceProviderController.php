<?php

declare(strict_types=1);

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\InsuranceProviderResource;
use App\Models\InsuranceProvider;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Global read-only reference data: no authorization beyond the route middleware, no write endpoints. */
class InsuranceProviderController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $insuranceProviders = InsuranceProvider::query()->orderBy('name')->get();

        return InsuranceProviderResource::collection($insuranceProviders);
    }
}
