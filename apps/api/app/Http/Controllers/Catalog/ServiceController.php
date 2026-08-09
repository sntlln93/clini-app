<?php

declare(strict_types=1);

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\ServiceResource;
use App\Models\Service;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Global read-only reference data: no authorization beyond the route middleware, no write endpoints. */
class ServiceController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $services = Service::query()->orderBy('name')->get();

        return ServiceResource::collection($services);
    }
}
