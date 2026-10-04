<?php

declare(strict_types=1);

namespace App\Http\Controllers\Subscriptions;

use App\Actions\Subscriptions\StartSubscriptionCheckoutAction;
use App\Data\Subscriptions\SubscriptionCheckoutData;
use App\Http\Controllers\Controller;
use App\Http\Resources\Subscriptions\SubscriptionResource;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class SubscriptionController extends Controller
{
    /**
     * `data` is null for an organization that never subscribed.
     */
    public function show(): JsonResponse|SubscriptionResource
    {
        Gate::authorize('view', Subscription::class);

        $subscription = Subscription::query()->first();

        if ($subscription === null) {
            return response()->json(['data' => null]);
        }

        return new SubscriptionResource($subscription);
    }

    public function store(Request $request, StartSubscriptionCheckoutAction $action, CurrentOrganization $currentOrganization): JsonResponse
    {
        Gate::authorize('create', Subscription::class);

        /** @var User $user */
        $user = $request->user();

        $initPoint = $action->handle(new SubscriptionCheckoutData(
            organizationId: $currentOrganization->getOrFail(),
            payerEmail: $user->email,
        ));

        return response()->json(['data' => ['init_point' => $initPoint]]);
    }
}
