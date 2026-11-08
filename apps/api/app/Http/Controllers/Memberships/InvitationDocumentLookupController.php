<?php

declare(strict_types=1);

namespace App\Http\Controllers\Memberships;

use App\Actions\Memberships\LookUpInvitationDocumentAction;
use App\Data\Memberships\InvitationDocumentLookupData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Memberships\LookUpInvitationDocumentRequest;
use App\Http\Resources\Memberships\InvitationIdentityResource;
use App\Support\PendingInvitationIdentity;

/**
 * The first step of a professional invitation (#417): the DNI, looked up in the registry. What it found waits in the
 * session for the acceptance; the browser gets the name, and the masked email of the account it links to, never the
 * DNI back.
 */
class InvitationDocumentLookupController extends Controller
{
    public function store(LookUpInvitationDocumentRequest $request, string $token, LookUpInvitationDocumentAction $action): InvitationIdentityResource
    {
        $identity = $action->handle(new InvitationDocumentLookupData($token, $request->documentNumber()));

        PendingInvitationIdentity::start($request, $identity);

        return new InvitationIdentityResource($identity);
    }
}
