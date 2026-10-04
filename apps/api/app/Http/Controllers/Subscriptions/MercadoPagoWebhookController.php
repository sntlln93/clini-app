<?php

declare(strict_types=1);

namespace App\Http\Controllers\Subscriptions;

use App\Actions\Subscriptions\HandleSubscriptionNotificationAction;
use App\Data\Subscriptions\SubscriptionNotificationData;
use App\Data\Subscriptions\WebhookSignatureData;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Public endpoint Mercado Pago posts subscription notifications to. Every
 * input is optional on purpose: an unknown or partial notification that
 * passes the signature check is acknowledged with a 2xx (so the provider
 * stops redelivering it) rather than a 422 — 200 when it was processed, 204
 * when there was nothing to do (a redelivery, or a resource the provider
 * reports as nonexistent).
 *
 * Mercado Pago sends the resource id as the `data.id` query parameter,
 * which PHP exposes as `data_id`; the body's `data.id` is the fallback.
 */
class MercadoPagoWebhookController extends Controller
{
    public function store(Request $request, HandleSubscriptionNotificationAction $action): JsonResponse|Response
    {
        $resourceKey = $request->filled('data_id') ? 'data_id' : 'data.id';
        $typeKey = $request->filled('type') ? 'type' : 'topic';

        $resourceId = $request->filled($resourceKey) ? $request->string($resourceKey)->toString() : null;

        $processed = $action->handle(new SubscriptionNotificationData(
            notificationId: $request->filled('id') ? $request->string('id')->toString() : null,
            type: $request->filled($typeKey) ? $request->string($typeKey)->toString() : null,
            resourceId: $resourceId,
            signature: new WebhookSignatureData(
                signature: $request->header('x-signature'),
                requestId: $request->header('x-request-id'),
                resourceId: $resourceId,
            ),
            payload: $request->all(),
        ));

        return $processed ? response()->json(['status' => 'ok']) : response()->noContent();
    }
}
