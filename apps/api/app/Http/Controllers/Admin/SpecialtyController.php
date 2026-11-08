<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexSpecialtyRequest;
use App\Http\Resources\Admin\SpecialtyCatalogUsageResource;
use App\Support\SpecialtyCatalogUsage;

class SpecialtyController extends Controller
{
    public function index(IndexSpecialtyRequest $request, SpecialtyCatalogUsage $usage): SpecialtyCatalogUsageResource
    {
        return new SpecialtyCatalogUsageResource($usage->summarize($request->string('q')->toString()));
    }
}
