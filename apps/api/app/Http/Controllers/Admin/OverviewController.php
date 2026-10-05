<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ComputePlatformOverviewAction;
use App\Data\Admin\OverviewPeriodData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OverviewRequest;
use App\Http\Resources\Admin\PlatformOverviewResource;

class OverviewController extends Controller
{
    public function show(OverviewRequest $request, ComputePlatformOverviewAction $action): PlatformOverviewResource
    {
        $overview = $action->handle(new OverviewPeriodData(
            days: $request->integer('days') ?: 30,
            timezone: config()->string('admin.reporting_timezone'),
        ));

        return new PlatformOverviewResource($overview);
    }
}
