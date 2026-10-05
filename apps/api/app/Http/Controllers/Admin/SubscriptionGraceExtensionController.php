<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Actions\Admin\ExtendSubscriptionGraceAction;
use App\Data\Admin\AdminActorData;
use App\Data\Admin\GraceExtensionData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ExtendGraceRequest;
use App\Http\Resources\Admin\AdminSubscriptionResource;
use App\Models\PlatformAdmin;
use Carbon\CarbonImmutable;

class SubscriptionGraceExtensionController extends Controller
{
    public function store(ExtendGraceRequest $request, int $subscription, ExtendSubscriptionGraceAction $action): AdminSubscriptionResource
    {
        /** @var PlatformAdmin $admin */
        $admin = $request->user('admin');

        // The chosen day ends at 23:59:59 in the reporting timezone; stored as UTC.
        /** @var CarbonImmutable $graceEndsOn */
        $graceEndsOn = CarbonImmutable::createFromFormat(
            '!Y-m-d',
            $request->string('grace_ends_on')->toString(),
            config()->string('admin.reporting_timezone'),
        );

        $updated = $action->handle(new GraceExtensionData(
            actor: new AdminActorData($admin->id, $request->ip()),
            subscriptionId: $subscription,
            graceEndsAt: $graceEndsOn->endOfDay()->startOfSecond()->utc(),
            note: $request->string('note')->toString() ?: null,
        ));

        return new AdminSubscriptionResource($updated);
    }
}
