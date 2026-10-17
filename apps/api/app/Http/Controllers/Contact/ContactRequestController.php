<?php

declare(strict_types=1);

namespace App\Http\Controllers\Contact;

use App\Actions\Contact\ReceiveContactRequestAction;
use App\Data\Contact\ContactRequestData;
use App\Enums\Plan;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\StoreContactRequestRequest;
use Illuminate\Http\Response;

/**
 * Fully public and stateless (ADR 0011): the landing's origin is a CORS
 * origin but not a Sanctum stateful domain, so there is no session or CSRF.
 * A filled honeypot gets the same 204 as a stored request and stores
 * nothing, so a bot can't tell it was caught.
 */
class ContactRequestController extends Controller
{
    public function store(StoreContactRequestRequest $request, ReceiveContactRequestAction $action): Response
    {
        if (! $request->isHoneypotFilled()) {
            $action->handle(new ContactRequestData(
                name: $request->string('name')->trim()->toString(),
                email: $request->string('email')->trim()->toString(),
                phone: $request->filled('phone') ? $request->string('phone')->trim()->toString() : null,
                organizationName: $request->filled('organization_name') ? $request->string('organization_name')->trim()->toString() : null,
                teamSize: $request->filled('team_size') ? $request->integer('team_size') : null,
                plan: $request->filled('plan') ? Plan::from($request->string('plan')->toString()) : null,
                message: $request->string('message')->trim()->toString(),
            ));
        }

        return response()->noContent();
    }
}
