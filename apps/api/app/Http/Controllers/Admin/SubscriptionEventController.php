<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexSubscriptionEventRequest;
use App\Http\Resources\Admin\SubscriptionEventResource;
use App\Models\SubscriptionEvent;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubscriptionEventController extends Controller
{
    public function index(IndexSubscriptionEventRequest $request): AnonymousResourceCollection
    {
        $events = SubscriptionEvent::query()
            ->when($request->filled('subscription_id'), fn ($query) => $query->where('subscription_id', $request->integer('subscription_id')))
            ->forOrganization($request->filled('organization_id') ? $request->integer('organization_id') : null)
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')->toString()))
            ->with(['subscription' => fn ($query) => $query->withoutGlobalScope('organization')->with('organization')])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page') ?: 15)
            ->withQueryString();

        return SubscriptionEventResource::collection($events);
    }
}
