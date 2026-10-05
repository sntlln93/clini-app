<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexAuditLogRequest;
use App\Http\Resources\Admin\AdminAuditLogResource;
use App\Models\AdminAuditLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuditLogController extends Controller
{
    public function index(IndexAuditLogRequest $request): AnonymousResourceCollection
    {
        $timezone = config()->string('admin.reporting_timezone');

        // `from`/`to` are inclusive local dates: [from 00:00, (to + 1) 00:00) local, in UTC.
        $fromUtc = $request->filled('from')
            ? CarbonImmutable::parse($request->string('from')->toString(), $timezone)->startOfDay()->utc()
            : null;
        $toUtcExclusive = $request->filled('to')
            ? CarbonImmutable::parse($request->string('to')->toString(), $timezone)->startOfDay()->addDay()->utc()
            : null;

        $logs = AdminAuditLog::query()
            ->forAction($request->filled('action') ? AdminAuditAction::from($request->string('action')->toString()) : null)
            ->byAdmin($request->filled('platform_admin_id') ? $request->integer('platform_admin_id') : null)
            ->forSubject(
                $request->filled('subject_type') ? AdminAuditSubject::from($request->string('subject_type')->toString()) : null,
                $request->filled('subject_id') ? $request->integer('subject_id') : null,
            )
            ->createdBetween($fromUtc, $toUtcExclusive)
            ->with('platformAdmin')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return AdminAuditLogResource::collection($logs);
    }
}
