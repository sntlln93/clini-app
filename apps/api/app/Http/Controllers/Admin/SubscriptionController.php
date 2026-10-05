<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexSubscriptionRequest;
use App\Http\Resources\Admin\AdminSubscriptionResource;
use App\Models\Subscription;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Subscriptions are read without the tenant scope and only for live
 * (non-deleted) organizations — never through implicit route binding,
 * which would apply the tenant scope.
 */
class SubscriptionController extends Controller
{
    public function index(IndexSubscriptionRequest $request): AnonymousResourceCollection
    {
        $graceWithin = $request->filled('grace_ending_within_days') ? $request->integer('grace_ending_within_days') : null;
        $status = $graceWithin === null && $request->filled('status')
            ? SubscriptionStatus::from($request->string('status')->toString())
            : null;

        $query = Subscription::withoutGlobalScope('organization')
            ->ofLiveOrganization()
            ->organizationSearch($request->string('q')->toString() ?: null)
            ->withStatus($status)
            ->graceEndingWithin($graceWithin)
            ->with('organization');

        if ($graceWithin !== null) {
            $query->orderBy('grace_ends_at')->orderBy('id');
        } else {
            $query->orderByDesc('updated_at')->orderByDesc('id');
        }

        $subscriptions = $query
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return AdminSubscriptionResource::collection($subscriptions);
    }

    public function show(int $subscription): AdminSubscriptionResource
    {
        return new AdminSubscriptionResource(
            Subscription::withoutGlobalScope('organization')
                ->ofLiveOrganization()
                ->with('organization')
                ->findOrFail($subscription),
        );
    }
}
