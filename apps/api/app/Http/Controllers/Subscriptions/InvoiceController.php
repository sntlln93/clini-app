<?php

declare(strict_types=1);

namespace App\Http\Controllers\Subscriptions;

use App\Http\Controllers\Controller;
use App\Http\Resources\Subscriptions\InvoiceResource;
use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class InvoiceController extends Controller
{
    /**
     * The organization's subscription invoices, newest charge first (#246),
     * pending ones included. Not paginated: one a month at most.
     */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewInvoices', Subscription::class);

        return InvoiceResource::collection(
            Invoice::query()->orderByDesc('charged_at')->orderByDesc('id')->get(),
        );
    }
}
