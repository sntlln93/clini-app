<?php

declare(strict_types=1);

namespace App\Http\Controllers\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\SpecialtyResource;
use App\Models\Specialty;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Global read-only reference data: no authorization beyond the route middleware, no write endpoints. */
class SpecialtyController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $specialties = Specialty::query()->orderBy('name')->get();

        return SpecialtyResource::collection($specialties);
    }
}
