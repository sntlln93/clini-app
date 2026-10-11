<?php

declare(strict_types=1);

namespace App\Http\Controllers\Reports;

use App\Actions\Reports\ComputeOrganizationReportAction;
use App\Data\Reports\ReportPeriodData;
use App\Enums\ReportGranularity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reports\ShowReportRequest;
use App\Http\Resources\Reports\OrganizationReportResource;
use App\Models\Membership;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Gate;

class ReportController extends Controller
{
    public function show(ShowReportRequest $request, CurrentOrganization $organization, ComputeOrganizationReportAction $action): OrganizationReportResource
    {
        $professional = $request->professional();
        Gate::authorize('viewReports', [Membership::class, $professional]);

        $report = $action->handle(new ReportPeriodData(
            organizationId: $organization->getOrFail(),
            timezone: $request->timezone(),
            fromDate: $request->string('from')->toString(),
            toDate: $request->string('to')->toString(),
            granularity: $request->enum('granularity', ReportGranularity::class) ?? ReportGranularity::Month,
            membershipId: $professional?->id,
        ));

        return new OrganizationReportResource($report);
    }
}
