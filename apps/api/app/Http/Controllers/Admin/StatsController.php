<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ComputePlatformStatsAction;
use App\Data\Admin\StatsPeriodData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StatsRequest;
use App\Http\Resources\Admin\PlatformStatsResource;
use Carbon\CarbonImmutable;

class StatsController extends Controller
{
    public function show(StatsRequest $request, ComputePlatformStatsAction $action): PlatformStatsResource
    {
        $timezone = config()->string('admin.reporting_timezone');

        /** @var CarbonImmutable $from */
        $from = CarbonImmutable::createFromFormat('!Y-m-d', $request->string('from')->toString(), $timezone);
        /** @var CarbonImmutable $to */
        $to = CarbonImmutable::createFromFormat('!Y-m-d', $request->string('to')->toString(), $timezone);

        $stats = $action->handle(new StatsPeriodData(
            from: $from,
            to: $to,
            timezone: $timezone,
            organizationId: $request->integer('organization_id') ?: null,
        ));

        return new PlatformStatsResource($stats);
    }
}
