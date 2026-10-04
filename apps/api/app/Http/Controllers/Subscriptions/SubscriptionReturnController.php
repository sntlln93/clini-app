<?php

declare(strict_types=1);

namespace App\Http\Controllers\Subscriptions;

use App\Http\Controllers\Controller;
use App\Notifications\Subscriptions\SubscriptionPanelUrl;
use Illuminate\Http\RedirectResponse;

/**
 * The checkout's `back_url`: Mercado Pago sends the browser here after the
 * payer finishes, appending its own query parameters (e.g. preapproval_id).
 * They are ignored — the target is fixed, so this is no open redirect, and
 * the subscription state comes from the webhook, never from this redirect.
 */
class SubscriptionReturnController extends Controller
{
    public function show(): RedirectResponse
    {
        return redirect()->away(SubscriptionPanelUrl::checkoutReturn());
    }
}
